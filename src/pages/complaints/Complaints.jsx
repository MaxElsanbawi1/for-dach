import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useDateRange, DateRangeBar, exportExcel } from '../../components/DateExport';

const API = 'http://localhost:3000/api';
const PER_PAGE = 15;

const STATUS_STYLES = {
  pending: { label: 'جديدة', className: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'قيد المعالجة', className: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'تم الحل', className: 'bg-green-100 text-green-800' },
};

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'resolved'];

const EXPORT_COLUMNS = [
  { header: 'التاريخ', key: 'created_at' },
  { header: 'المرسل', key: 'name' },
  { header: 'الإيميل', key: 'email' },
  { header: 'الجوال', key: 'phone' },
  { header: 'الرسالة', key: 'message' },
  { header: 'الحالة', value: (r) => STATUS_STYLES[r.status]?.label || r.status || '' },
];

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ar-EG');
}

export default function Complaints() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const range = useDateRange();

  useEffect(() => {
    setPage(1);
  }, [range.from, range.to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/complaints`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Parse defensively: an auth failure returns HTML from the proxy, not JSON.
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'انتهت صلاحية الجلسة أو حسابك غير مصرّح له — سجّل خروج ثم دخول مرة أخرى.'
          );
        }
        throw new Error(data.error || data.message || `تعذّر تحميل الرسائل (${response.status})`);
      }
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id, next) => {
    setSavingId(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/complaints/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذّر تحديث الحالة');
      // Update in place rather than refetching — the list can be long and the
      // only thing that changed is this one row.
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const datedRows = range.filter(rows, (r) => r.created_at);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datedRows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone, r.message]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [datedRows, status, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const newCount = rows.filter((r) => r.status === 'pending').length;

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">رسائل تواصل معنا</h2>
          <p className="mt-1 text-sm text-gray-500">
            الاستفسارات والاقتراحات والشكاوى الواردة من نموذج الموقع.
            {newCount > 0 ? ` — ${newCount} رسالة جديدة.` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      <DateRangeBar
        range={range}
        count={filtered.length}
        onExport={() => exportExcel('رسائل تواصل معنا', EXPORT_COLUMNS, filtered, { rangeLabel: range.label })}
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم أو الإيميل أو الجوال أو نص الرسالة..."
            className="w-full rounded-md border border-gray-300 py-2 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <Search size={18} className="absolute right-3 top-2.5 text-gray-400" />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`rounded-md border px-4 py-2 text-sm ${
                status === value ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {value === 'all' ? 'الكل' : STATUS_STYLES[value].label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-4 text-red-700">{error}</p>}
      {loading && <p className="py-8 text-center text-gray-500">جاري التحميل...</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded bg-gray-50 p-8 text-center text-gray-600">
          {rows.length === 0 ? 'لا توجد رسائل.' : 'لا توجد نتائج بهذا الفلتر.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="border p-3">التاريخ</th>
                <th className="border p-3">المرسل</th>
                <th className="border p-3">الجوال</th>
                <th className="border p-3">الرسالة</th>
                <th className="border p-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const style = STATUS_STYLES[row.status] || {
                  label: row.status || '-',
                  className: 'bg-gray-100 text-gray-700',
                };
                return (
                  <tr key={row.id} className="align-top hover:bg-gray-50">
                    <td className="border p-3 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="border p-3">
                      <div className="font-semibold">{row.name || '-'}</div>
                      <a
                        href={`mailto:${row.email}`}
                        className="text-xs text-primary hover:underline"
                        dir="ltr"
                      >
                        {row.email || ''}
                      </a>
                    </td>
                    <td className="border p-3 whitespace-nowrap" dir="ltr">
                      {row.phone ? (
                        <a href={`tel:${row.phone}`} className="text-primary hover:underline">
                          {row.phone}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="border p-3">
                      <div className="max-w-md whitespace-pre-wrap">{row.message}</div>
                    </td>
                    <td className="border p-3 whitespace-nowrap">
                      <span className={`rounded px-2 py-1 text-xs font-bold ${style.className}`}>
                        {style.label}
                      </span>
                      <select
                        value={row.status}
                        disabled={savingId === row.id}
                        onChange={(e) => changeStatus(row.id, e.target.value)}
                        className="mt-2 block w-full rounded border border-gray-300 p-1 text-xs disabled:opacity-50"
                      >
                        <option value="pending">جديدة</option>
                        <option value="in_progress">قيد المعالجة</option>
                        <option value="resolved">تم الحل</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filtered.length > PER_PAGE && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border px-4 py-2 disabled:opacity-40"
          >
            السابق
          </button>
          <span className="px-3 text-sm text-gray-600">
            صفحة {page} من {totalPages} ({filtered.length} رسالة)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border px-4 py-2 disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
