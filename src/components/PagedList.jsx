import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { API } from "../pages/tax/taxApi";

// Lists that live on the server: each page asks for one page of rows
// (?page=&limit=, plus filters and ?q= for search) instead of the whole table.
// The API answers { rows, total, page, limit } - see getAllRegistrations /
// getAllUsers in acit-back. Used by the registrations and students pages.

const base = API.trim();

/** Loads one page of `path` (e.g. "/registrations") with `filters`; search is debounced. */
export function usePagedList(path, filters = {}, { limit = 50 } = {}) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: "" });
  const filterKey = JSON.stringify(filters);
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // A new search or filter starts again from page 1.
  useEffect(() => setPage(1), [debounced, filterKey]);

  useEffect(() => {
    const id = ++seq.current;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(JSON.parse(filterKey)).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    if (debounced) params.set("q", debounced);
    setState((s) => ({ ...s, loading: true, error: "" }));
    fetch(`${base}${path}?${params}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
        return body;
      })
      .then((body) => {
        if (id === seq.current) setState({ rows: body.rows || [], total: body.total || 0, loading: false, error: "" });
      })
      .catch((err) => {
        if (id === seq.current) setState((s) => ({ ...s, loading: false, error: err.message || "تعذر تحميل البيانات" }));
      });
  }, [path, filterKey, debounced, page, limit]);

  const pages = Math.max(1, Math.ceil(state.total / limit));
  return { ...state, page, pages, setPage, query, setQuery, limit, reload: () => setPage((p) => p) };
}

export function SearchBox({ value, onChange, placeholder = "بحث..." }) {
  return (
    <div className="relative w-full md:w-80">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-secondary"
      />
      <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
    </div>
  );
}

/** Page numbers around the current one, with first/last and gaps. */
export function Pager({ page, pages, onPage }) {
  const items = useMemo(() => {
    const set = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2]);
    const list = [...set].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
    const out = [];
    list.forEach((p, i) => {
      if (i && p - list[i - 1] > 1) out.push("…" + p);
      out.push(p);
    });
    return out;
  }, [page, pages]);
  if (pages <= 1) return null;
  const btn = "mx-0.5 min-w-[40px] rounded-md px-3 py-2 text-sm";
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-y-2" dir="rtl">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${btn} bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40`} aria-label="السابق">
        <ChevronRight size={16} />
      </button>
      {items.map((p) =>
        typeof p === "string" ? (
          <span key={p} className="px-1 text-gray-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={`${btn} ${p === page ? "bg-primary text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            {p.toLocaleString("en")}
          </button>
        )
      )}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${btn} bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40`} aria-label="التالي">
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}

/**
 * A server-paged table. columns: [{ label, render(row) }]; rowKey(row); onRowClick(row).
 */
export function PagedTable({ title, list, columns, rowKey, onRowClick, emptyText = "لا توجد بيانات", searchPlaceholder, toolbar }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow" dir="rtl">
      {title && <h2 className="mb-6 text-2xl font-bold text-primary">{title}</h2>}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchBox value={list.query} onChange={list.setQuery} placeholder={searchPlaceholder} />
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <span className="rounded bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
            العدد: {list.total.toLocaleString("en")}
          </span>
        </div>
      </div>

      {list.error && <p className="mb-4 rounded-md bg-red-50 p-4 text-center text-red-700">{list.error}</p>}

      <div className={`overflow-x-auto transition-opacity ${list.loading ? "opacity-50" : ""}`}>
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th key={c.label} className="px-6 py-3 text-right text-sm font-semibold text-primary">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b transition-colors ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
              >
                {columns.map((c) => (
                  <td key={c.label} className="px-6 py-4 text-right text-sm text-gray-700">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {!list.loading && list.rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {list.loading && list.rows.length === 0 && <p className="py-6 text-center text-gray-500">جاري التحميل...</p>}
      </div>

      <Pager page={list.page} pages={list.pages} onPage={list.setPage} />
    </div>
  );
}

export const shortCourse = (name) => (name ? String(name).split(" ").slice(0, 5).join(" ") : "-");
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "غير محدد");
