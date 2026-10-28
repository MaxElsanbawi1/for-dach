import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useDateRange, DateRangeBar, exportExcel } from '../../components/DateExport';

const API = 'http://localhost:3000/api';
const PER_PAGE = 15;

const STATUS_STYLES = {
  new: { label: 'جديد', className: 'bg-yellow-100 text-yellow-800' },
  contacted: { label: 'تم التواصل', className: 'bg-blue-100 text-blue-800' },
  converted: { label: 'تحوّل لعميل', className: 'bg-green-100 text-green-800' },
  ignored: { label: 'مستبعد', className: 'bg-gray-100 text-gray-700' },
};

// 'incomplete' and 'completed' are not Status values — the API reads them as a
// filter on whether the visitor finished the flow.
const STATUS_FILTERS = [
  'all',
  'incomplete',
  'completed',
  'new',
  'contacted',
  'converted',
  'ignored',
];

const FILTER_LABELS = {
  all: 'الكل',
  incomplete: 'بدأ ومكمّلش',
  completed: 'أكمل',
  ...Object.fromEntries(
    Object.entries({
      new: 'جديد',
      contacted: 'تم التواصل',
      converted: 'تحوّل لعميل',
      ignored: 'مستبعد',
    })
  ),
};

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ar-EG');
}

// An answer can be a multi-choice array or an object; the sheet needs plain text.
function answerText(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.map(answerText).join('، ');
  if (typeof value === 'object') {
    return value.label ?? value.text ?? value.value ?? Object.values(value).map(answerText).join('، ');
  }
  return String(value);
}

const EXPORT_COLUMNS = [
  { header: 'التاريخ', key: 'created_at' },
  { header: 'الاسم', value: (r) => r.name || 'زائر بدون اسم' },
  { header: 'الإيميل', key: 'email' },
  { header: 'الجوال', key: 'phone' },
  { header: 'البلد', key: 'country' },
  { header: 'المدينة', value: (r) => [r.city, r.region].filter(Boolean).join(' — ') },
  { header: 'IP', key: 'ip' },
  { header: 'التقدم', value: (r) => (r.is_completed ? 'أكمل' : `وقف عند سؤال ${Number(r.last_step || 0) + 1}`) },
  { header: 'الحالة', value: (r) => STATUS_STYLES[r.status]?.label || r.status || '' },
  {
    header: 'الإجابات',
    width: 60,
    value: (r) =>
      (r.answers || []).map((a) => `${a.question || 'سؤال محذوف'}: ${answerText(a.answer)}`).join(' | '),
  },
];

export default function OnboardingLeads() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const range = useDateRange();

  useEffect(() => {
    setPage(1);
  }, [range.from, range.to]);

  const authHeaders = (json = false) => {
    const token = localStorage.getItem('token');
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      const response = await fetch(`${API}/onboarding/responses?${params}`, {
        headers: authHeaders(),
      });
      // Parse defensively: an auth failure returns HTML from the proxy, not JSON.
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'انتهت صلاحية الجلسة أو حسابك غير مصرّح له — سجّل خروج ثم دخول مرة أخرى.'
          );
        }
        throw new Error(data.message || `تعذّر تحميل البيانات (${response.status})`);
      }
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id, next) => {
    try {
      const response = await fetch(`${API}/onboarding/responses/${id}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error('تعذّر تحديث الحالة');
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('متأكد إنك عايز تحذف السجل ده؟')) return;
    try {
      const response = await fetch(`${API}/onboarding/responses/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error('تعذّر الحذف');
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const datedRows = range.filter(rows, (r) => r.created_at);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datedRows.filter((r) => {
      if (!q) return true;
      return [r.name, r.email, r.phone, r.country, r.city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [datedRows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const newCount = rows.filter((r) => r.status === 'new').length;

  // Where the traffic is actually coming from, most common first.
  const byCountry = useMemo(() => {
    const counts = {};
    filtered.forEach((r) => {
      const key = r.country || 'غير معروف';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">العملاء المحتملون</h2>
          <p className="mt-1 text-sm text-gray-500">
            إجابات زوّار الموقع على أسئلة التعريف، وبلد كل زائر من عنوان الـ IP.
            {newCount > 0 ? ` — ${newCount} جديد.` : ''}
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
        onExport={() => exportExcel('العملاء المحتملون', EXPORT_COLUMNS, filtered, { rangeLabel: range.label })}
      />

      {!loading && !error && byCountry.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {byCountry.map(([country, count]) => (
            <div key={country} className="rounded-lg bg-gray-50 px-4 py-2 text-sm">
              <span className="font-semibold text-primary">{country}</span>
              <span className="mr-2 text-gray-500">{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم أو الإيميل أو الجوال أو البلد..."
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
              {FILTER_LABELS[value] || value}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-4 text-red-700">{error}</p>}
      {loading && <p className="py-8 text-center text-gray-500">جاري التحميل...</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded bg-gray-50 p-8 text-center text-gray-600">
          {rows.length === 0 ? 'لا يوجد عملاء محتملون بعد.' : 'لا توجد نتائج بهذا الفلتر.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="border p-3">التاريخ</th>
                <th className="border p-3">الزائر</th>
                <th className="border p-3">الجوال</th>
                <th className="border p-3">من أين</th>
                <th className="border p-3">التقدم</th>
                <th className="border p-3">الحالة</th>
                <th className="border p-3">الإجابات</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const style = STATUS_STYLES[row.status] || {
                  label: row.status || '-',
                  className: 'bg-gray-100 text-gray-700',
                };
                const isOpen = expanded === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr className="align-top hover:bg-gray-50">
                      <td className="border p-3 whitespace-nowrap">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="border p-3">
                        <div className="font-semibold">{row.name || 'زائر بدون اسم'}</div>
                        {row.email ? (
                          <a
                            href={`mailto:${row.email}`}
                            dir="ltr"
                            className="text-xs text-primary hover:underline"
                          >
                            {row.email}
                          </a>
                        ) : null}
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
                        <div>{row.country || 'غير معروف'}</div>
                        <div className="text-xs text-gray-500">
                          {[row.city, row.region].filter(Boolean).join(' — ')}
                        </div>
                        <div className="font-mono text-xs text-gray-400" dir="ltr">
                          {row.ip || ''}
                        </div>
                      </td>
                      <td className="border p-3 whitespace-nowrap">
                        {row.is_completed ? (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                            أكمل
                          </span>
                        ) : (
                          <span className="rounded bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800">
                            وقف عند سؤال {row.last_step + 1}
                          </span>
                        )}
                      </td>
                      <td className="border p-3 whitespace-nowrap">
                        <span className={`rounded px-2 py-1 text-xs font-bold ${style.className}`}>
                          {style.label}
                        </span>
                        <select
                          value={row.status}
                          onChange={(e) => changeStatus(row.id, e.target.value)}
                          className="mt-2 block w-full rounded border border-gray-300 p-1 text-xs"
                        >
                          <option value="new">جديد</option>
                          <option value="contacted">تم التواصل</option>
                          <option value="converted">تحوّل لعميل</option>
                          <option value="ignored">مستبعد</option>
                        </select>
                      </td>
                      <td className="border p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : row.id)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {row.answers.length} إجابة
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row.id)}
                          className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline"
                        >
                          <Trash2 size={14} />
                          حذف
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="border bg-gray-50 p-4">
                          {row.answers.length === 0 ? (
                            <p className="text-sm text-gray-500">لم يجب على أي سؤال.</p>
                          ) : (
                            <dl className="space-y-3">
                              {row.answers.map((a, i) => (
                                <div key={i}>
                                  <dt className="text-sm font-semibold text-gray-700">
                                    {a.question || 'سؤال محذوف'}
                                  </dt>
                                  <dd className="text-sm text-gray-600">{a.answer || '-'}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
            صفحة {page} من {totalPages} ({filtered.length} سجل)
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
