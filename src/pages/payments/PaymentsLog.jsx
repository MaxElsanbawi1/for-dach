import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

const API = 'https://back.acit-net.com/api';
const PAGE_SIZE = 25;

// The order Status column, as it should read in the table.
const STATUS_STYLES = {
  paid: { label: 'مدفوع', className: 'bg-green-100 text-green-800' },
  pending: { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800' },
  failed: { label: 'فشل', className: 'bg-red-100 text-red-800' },
  refunded: { label: 'مسترجع', className: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'ملغي', className: 'bg-gray-100 text-gray-700' },
};

const STATUS_FILTERS = ['all', 'paid', 'pending', 'failed', 'refunded', 'cancelled'];

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ar-EG');
}

function money(value) {
  return Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


// The gateway the order actually went through. orders.PaymentMethod is only
// filled in at settlement, so a pending order has nothing there - falling back
// to a fixed label made every unpaid order read as Tap regardless of gateway.
const GATEWAY_LABELS = {
  tamara: 'تمارا',
  tabby: 'تابي',
  paypal: 'باي بال',
  paytabs: 'باي تابس',
  tap: 'تاب',
};

function gatewayLabel(row) {
  const name = GATEWAY_LABELS[row.gateway] || row.gateway || '-';
  // Once paid, the card brand/instrument the gateway reported is more useful.
  return row.payment_method ? `${name} - ${row.payment_method}` : name;
}

export default function PaymentsLog() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`${API}/admin/orders?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Parse defensively: an auth failure returns HTML from the proxy, not JSON.
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // The endpoint is gated on admin/accountant, and the token is signed for a
        // year — so the two failures worth naming are an expired session and a
        // role that simply is not allowed. Everything else keeps the raw message.
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'انتهت صلاحية الجلسة أو حسابك غير مصرّح له بعرض المدفوعات — سجّل خروج ثم دخول مرة أخرى بحساب أدمن أو محاسب.'
          );
        }
        throw new Error(data.message || `تعذّر تحميل المدفوعات (${response.status})`);
      }
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  // The server returns the whole filtered set, so paging is done here.
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  // Totals cover every row in the current filter, not just the visible page.
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.total += Number(r.total || 0);
          acc.tax += Number(r.tax || 0);
          if (r.status === 'paid') acc.collected += Number(r.total || 0);
          return acc;
        },
        { total: 0, tax: 0, collected: 0 }
      ),
    [rows]
  );

  const currency = rows[0]?.currency || 'SAR';

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">سجل المدفوعات</h2>
          <p className="mt-1 text-sm text-gray-500">
            كل عملية دفع مسجّلة في النظام، ببيانات الفوترة والمبالغ والضريبة.
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

      {!loading && !error && rows.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-sm text-gray-500">عدد العمليات</div>
            <div className="mt-1 text-xl font-bold text-primary">{rows.length}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-sm text-gray-500">إجمالي المحصّل</div>
            <div className="mt-1 text-xl font-bold text-green-700">
              {money(totals.collected)} {currency}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-sm text-gray-500">إجمالي الضريبة</div>
            <div className="mt-1 text-xl font-bold text-primary">
              {money(totals.tax)} {currency}
            </div>
          </div>
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
            placeholder="بحث بالاسم أو الإيميل أو الجوال أو رقم الطلب..."
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
              {value === 'all' ? 'الكل' : STATUS_STYLES[value]?.label || value}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-4 text-red-700">{error}</p>}
      {loading && <p className="py-8 text-center text-gray-500">جاري التحميل...</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded bg-gray-50 p-8 text-center text-gray-600">لا توجد مدفوعات.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="border p-3">#</th>
                <th className="border p-3">التاريخ</th>
                <th className="border p-3">العميل</th>
                <th className="border p-3">الجوال</th>
                <th className="border p-3">المدينة</th>
                <th className="border p-3">قبل الضريبة</th>
                <th className="border p-3">الخصم</th>
                <th className="border p-3">الضريبة</th>
                <th className="border p-3">الإجمالي</th>
                <th className="border p-3">الحالة</th>
                <th className="border p-3">وسيلة الدفع</th>
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
                      <div className="font-bold text-primary">{row.order_number || row.id}</div>
                    </td>
                    <td className="border p-3 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="border p-3">
                      <div>{row.billing_name || row.user_name || '-'}</div>
                      <div className="text-xs text-gray-500">{row.user_email || ''}</div>
                    </td>
                    <td className="border p-3 whitespace-nowrap" dir="ltr">
                      {row.billing_phone || row.user?.phone || '-'}
                    </td>
                    <td className="border p-3">{row.billing_location || '-'}</td>
                    <td className="border p-3 whitespace-nowrap">{money(row.subtotal)}</td>
                    <td className="border p-3 whitespace-nowrap">{money(row.discount)}</td>
                    <td className="border p-3 whitespace-nowrap">{money(row.tax)}</td>
                    <td className="border p-3 whitespace-nowrap font-bold">
                      {money(row.total)} {row.currency || ''}
                    </td>
                    <td className="border p-3">
                      <span className={`rounded px-2 py-1 text-xs font-bold ${style.className}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="border p-3">
                      {gatewayLabel(row)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && rows.length > PAGE_SIZE && (
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
            صفحة {page} من {totalPages} ({rows.length} عملية)
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
