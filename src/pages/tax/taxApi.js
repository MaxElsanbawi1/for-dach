// Shared helpers for the tax screens.
export const API = " http://localhost:3000/api";

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function taxFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The API answers with { message } for a rule the user broke and adds
    // { error } for an underlying failure. Showing only `message` turned every
    // server fault into an identical, undiagnosable "خطأ في حفظ المسودة" — so
    // carry the cause through, and log the whole response for the console.
    const err = new Error(
      data.error && data.error !== data.message
        ? `${data.message || "خطأ في الخادم"} — ${data.error}`
        : data.message || `حدث خطأ في الاتصال بالخادم (${res.status})`
    );
    err.status = res.status;
    err.body = data;
    if (res.status >= 500) {
      console.error(`${options.method || "GET"} ${path} -> ${res.status}`, data);
    }
    throw err;
  }
  return data;
}

// 1234.5 -> "1,234.50"
export const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
};

// Timestamps in the audit timeline need the time of day, not just the date.
export const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const pad = (n) => String(n).padStart(2, "0");
export const todayInput = () => toInputDate(new Date());
export const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Quick presets for the VAT return screen.
export function datePresets() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  const range = (from, to) => ({ from: toInputDate(from), to: toInputDate(to) });

  return {
    thisMonth: range(new Date(y, m, 1), new Date(y, m + 1, 0)),
    lastMonth: range(new Date(y, m - 1, 1), new Date(y, m, 0)),
    thisQuarter: range(new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0)),
    lastQuarter: range(new Date(y, q * 3 - 3, 1), new Date(y, q * 3, 0)),
  };
}

/**
 * Download rows as CSV. The BOM is what makes Excel read Arabic correctly.
 */
export function downloadCsv(filename, rows) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
