import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';

const API = 'https://back.acit-net.com/api';
const PAGE_SIZE = 25;

// Tamara's own outcomes, mapped to how the row should read at a glance.
const OUTCOME_STYLES = {
  paid: { label: 'مدفوع', className: 'bg-green-100 text-green-800' },
  pending: { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800' },
  failed: { label: 'فشل', className: 'bg-red-100 text-red-800' },
  error: { label: 'خطأ', className: 'bg-red-100 text-red-800' },
  skipped: { label: 'متخطى', className: 'bg-gray-100 text-gray-700' },
  ignored: { label: 'مهمَل', className: 'bg-gray-100 text-gray-700' },
};

const OUTCOME_FILTERS = ['', 'paid', 'pending', 'failed', 'error'];

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ar-EG');
}

export default function TamaraNotifications() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (outcome) params.set('outcome', outcome);
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`${API}/payments/tamara/notifications?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Parse defensively: an auth failure returns HTML from the proxy, not JSON.
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `تعذّر تحميل الإشعارات (${response.status})`);
      }
      setRows(Array.isArray(data.data) ? data.data : []);
      setTotal(Number(data.total) || 0);
    } catch (err) {
      setError(err.message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, outcome, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">إشعارات تمارا</h2>
          <p className="mt-1 text-sm text-gray-500">
            كل إشعار أرسلته تمارا للسيرفر، وما تم بناءً عليه.
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

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="بحث برقم الطلب أو معرّف تمارا..."
            className="w-full rounded-md border border-gray-300 py-2 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <Search size={18} className="absolute right-3 top-2.5 text-gray-400" />
        </div>

        <div className="flex flex-wrap gap-2">
          {OUTCOME_FILTERS.map((value) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => {
                setOutcome(value);
                setPage(1);
              }}
              className={`rounded-md border px-4 py-2 text-sm ${
                outcome === value ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {value ? OUTCOME_STYLES[value]?.label || value : 'الكل'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-4 text-red-700">{error}</p>}
      {loading && <p className="py-8 text-center text-gray-500">جاري التحميل...</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded bg-gray-50 p-8 text-center text-gray-600">
          لا توجد إشعارات.
          <span className="mt-1 block text-sm">
            تصل الإشعارات هنا تلقائياً عند كل عملية دفع عبر تمارا.
          </span>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="border p-3">الوقت</th>
                <th className="border p-3">الطلب</th>
                <th className="border p-3">العميل</th>
                <th className="border p-3">المبلغ</th>
                <th className="border p-3">حالة تمارا</th>
                <th className="border p-3">النتيجة</th>
                <th className="border p-3">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const style = OUTCOME_STYLES[row.outcome] || {
                  label: row.outcome || '-',
                  className: 'bg-gray-100 text-gray-700',
                };
                const isOpen = expanded === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr className="align-top hover:bg-gray-50">
                      <td className="border p-3 whitespace-nowrap">{formatDateTime(row.received_at)}</td>
                      <td className="border p-3">
                        <div className="font-bold text-primary">{row.order_number || '-'}</div>
                        <div className="font-mono text-xs text-gray-500">
                          {row.tamara_order_id ? `${row.tamara_order_id.slice(0, 8)}…` : '-'}
                        </div>
                      </td>
                      <td className="border p-3">
                        <div>{row.customer_name || '-'}</div>
                        <div className="text-xs text-gray-500">{row.customer_email || ''}</div>
                      </td>
                      <td className="border p-3 whitespace-nowrap">
                        {row.amount == null ? '-' : `${row.amount} ${row.currency || ''}`}
                      </td>
                      <td className="border p-3">{row.tamara_status || row.event_type || '-'}</td>
                      <td className="border p-3">
                        <span className={`rounded px-2 py-1 text-xs font-bold ${style.className}`}>
                          {style.label}
                        </span>
                        {row.error && (
                          <div className="mt-1 max-w-xs text-xs text-red-600">{row.error}</div>
                        )}
                      </td>
                      <td className="border p-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : row.id)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {isOpen ? 'إخفاء' : 'عرض'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="border bg-gray-50 p-3">
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-left text-xs text-gray-700" dir="ltr">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(row.raw || '{}'), null, 2);
                              } catch {
                                return row.raw || '(فارغ)';
                              }
                            })()}
                          </pre>
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

      {!loading && !error && total > PAGE_SIZE && (
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
            صفحة {page} من {totalPages} ({total} إشعار)
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
