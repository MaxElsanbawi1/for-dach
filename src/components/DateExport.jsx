import React, { useState } from "react";
import { Download, CalendarRange } from "lucide-react";
import { API } from "../pages/tax/taxApi";

// Date range filter + Excel export, shared by the dashboard's list pages.
//
//   const range = useDateRange();
//   const shown = range.filter(rows, (r) => r.CreatedAt);       // lists loaded whole
//   <DateRangeBar range={range} onExport={() => exportExcel("الطلاب", COLUMNS, shown)} />
//
// Server-paged lists (usePagedList) pass range.params ({ from, to }) as filters
// instead, and export with fetchAllPages(). Days are calendar days in Riyadh
// time, the academy's working day.

const pad = (n) => String(n).padStart(2, "0");
/** "YYYY-MM-DD" of a date, in Riyadh time. */
export const riyadhDay = (d) => {
  const t = new Date(new Date(d).getTime() + 3 * 3600 * 1000); // UTC+3, no DST
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
const today = () => riyadhDay(Date.now());
const daysAgo = (n) => riyadhDay(Date.now() - n * 86400000);

const PRESETS = [
  { label: "النهارده", from: () => today(), to: () => today() },
  { label: "آخر 7 أيام", from: () => daysAgo(6), to: () => today() },
  { label: "آخر 30 يوم", from: () => daysAgo(29), to: () => today() },
  { label: "الشهر ده", from: () => `${today().slice(0, 8)}01`, to: () => today() },
  { label: "الكل", from: () => "", to: () => "" },
];

export function useDateRange(initial = {}) {
  const [from, setFrom] = useState(initial.from || "");
  const [to, setTo] = useState(initial.to || "");

  /** Is this date inside the range? Rows without a date only show when no range is set. */
  const contains = (value) => {
    if (!from && !to) return true;
    if (!value) return false;
    const t = new Date(value);
    if (Number.isNaN(t.getTime())) return false;
    const day = riyadhDay(t);
    return (!from || day >= from) && (!to || day <= to);
  };

  return {
    from,
    to,
    setFrom,
    setTo,
    active: !!(from || to),
    contains,
    /** rows filtered by getDate(row) */
    filter: (rows, getDate) => (from || to ? (rows || []).filter((r) => contains(getDate(r))) : rows || []),
    /** For server-side lists: query params the API understands. */
    params: { from: from || undefined, to: to || undefined },
    label: from || to ? `${from || "البداية"} إلى ${to || "النهارده"}` : "كل الفترات",
  };
}

export function DateRangeBar({ range, onExport, exportLabel = "تحميل Excel", count, children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const runExport = async () => {
    setBusy(true);
    setError("");
    try {
      await onExport();
    } catch (err) {
      setError(err.message || "تعذر التصدير");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
          <CalendarRange size={16} /> الفترة
        </div>
        <label className="text-xs text-gray-500">
          من
          <input
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => range.setFrom(e.target.value)}
            className="mt-0.5 block rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="text-xs text-gray-500">
          إلى
          <input
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => range.setTo(e.target.value)}
            className="mt-0.5 block rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => {
            const on = range.from === p.from() && range.to === p.to();
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  range.setFrom(p.from());
                  range.setTo(p.to());
                }}
                className={`rounded-full border px-3 py-1 text-xs ${
                  on ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {children}
        <div className="mr-auto flex items-center gap-3">
          {count !== undefined && <span className="text-xs text-gray-500">{count} سجل</span>}
          {onExport && (
            <button
              type="button"
              onClick={runExport}
              disabled={busy}
              className="flex items-center gap-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Download size={15} /> {busy ? "جاري التجهيز..." : exportLabel}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const isDateKey = (k) => /(date|_at|At$|time|Time)/.test(k);

const cellValue = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "object" && !(v instanceof Date)) return JSON.stringify(v);
  return v;
};

/**
 * Download rows as an .xlsx file (right-to-left sheet, bold header).
 * columns: [{ header, key } | { header, value: (row) => any, width? }]
 * Values that look like dates are written as Riyadh-time text.
 * exceljs is loaded on first use, so it adds nothing to the page load.
 */
export async function exportExcel(name, columns, rows, { rangeLabel } = {}) {
  if (!rows?.length) throw new Error("مفيش بيانات في الفترة دي");
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(String(name).slice(0, 31) || "Sheet1", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });

  ws.columns = columns.map((c) => ({ header: c.header, key: c.header, width: c.width || Math.min(40, Math.max(12, c.header.length + 4)) }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };

  for (const row of rows) {
    const out = {};
    for (const c of columns) {
      let v = c.value ? c.value(row) : row[c.key];
      if (!c.value && c.key && isDateKey(c.key) && v) {
        const t = new Date(v);
        if (!Number.isNaN(t.getTime())) v = t.toLocaleString("en-GB", { timeZone: "Asia/Riyadh", hour12: false });
      }
      out[c.header] = cellValue(v);
    }
    ws.addRow(out);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}${rangeLabel ? ` (${rangeLabel})` : ""} ${riyadhDay(Date.now())}.xlsx`.replace(/[\\/:*?"<>|]/g, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Every row of a server-paged list, for export. Most list endpoints cap a page
 * at 100 rows, so pages are walked until `total` is reached (or a page comes
 * back empty). pick(body) -> { rows, total } for endpoints that do not answer
 * { rows, total } (e.g. { data, pagination: { total } }).
 */
export async function fetchAllPages(
  path,
  filters = {},
  { pageSize = 100, max = 50000, pick = (b) => ({ rows: b.rows || [], total: b.total }) } = {}
) {
  const base = API.trim();
  const all = [];
  for (let page = 1; all.length < max; page += 1) {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const res = await fetch(`${base}${path}?${params}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
    const { rows = [], total } = pick(body);
    all.push(...rows);
    if (!rows.length || (Number.isFinite(Number(total)) && all.length >= Number(total))) break;
    if (total === undefined && rows.length < pageSize) break;
  }
  return all;
}

/** Arabic headers for the column names the API uses most. */
export const LABELS = {
  RegistrationID: "رقم الطلب", UserID: "رقم المستخدم", CourseID: "رقم الدورة", FullName: "الاسم", Name: "الاسم",
  name: "الاسم", Email: "الإيميل", email: "الإيميل", PhoneNumber: "الموبايل", Phone: "الموبايل", phone: "الموبايل",
  NationalId: "رقم الهوية", Status: "الحالة", status: "الحالة", CourseName: "الدورة", CategoryName: "القسم",
  Price: "السعر", RegistrationDate: "تاريخ التسجيل", RegistrationSource: "مصدر التسجيل", StartingTime: "بداية الدورة",
  EndingTime: "نهاية الدورة", CreatedAt: "تاريخ الإنشاء", created_at: "تاريخ الإنشاء", createdAt: "تاريخ الإنشاء",
  UpdatedAt: "آخر تعديل", updatedAt: "آخر تعديل", Role: "الدور", Username: "اسم المستخدم", Source: "المصدر",
  City: "المدينة", Gender: "النوع", InstructorName: "المدرب", Message: "الرسالة", message: "الرسالة",
  Type: "النوع", type: "النوع", title: "العنوان", Title: "العنوان", publishedAt: "تاريخ النشر", paid_at: "تاريخ الدفع",
  received_at: "وقت الوصول", amount: "المبلغ", total: "الإجمالي", issued_at: "تاريخ الإصدار", due_date: "تاريخ الاستحقاق",
  Rating: "التقييم", Comment: "التعليق",
};

/** Columns from the rows themselves, for pages without a hand-written list. */
export const autoColumns = (rows, labels = LABELS) => {
  const keys = [...new Set((rows || []).slice(0, 50).flatMap((r) => Object.keys(r || {})))].filter(
    (k) => !/password|token|hash|secret/i.test(k)
  );
  return keys.map((k) => ({ header: labels[k] || k, key: k }));
};
