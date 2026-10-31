import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDateRange, DateRangeBar, exportExcel } from '../../components/DateExport';

const API = 'https://back.acit-net.com/api';
const PER_PAGE = 10;

// Where the money came in through.
const SOURCE_LABELS = { online: 'أونلاين', manual: 'تحصيل يدوي' };
const SOURCE_FILTERS = ['all', 'online', 'manual'];

const EXPORT_COLUMNS = [
  { header: 'الاسم الكامل', key: 'name' },
  { header: 'رقم الهاتف', key: 'phone' },
  { header: 'البريد الإلكتروني', key: 'email' },
  { header: 'رقم الهوية', key: 'national_id' },
  { header: 'اسم الدورة', key: 'course' },
  { header: 'المبلغ المدفوع', value: (s) => Number(s.amount || 0) },
  { header: 'العملة', key: 'currency' },
  { header: 'الحالة', value: (s) => SOURCE_LABELS[s.source] || s.source || '' },
  { header: 'المرجع', key: 'reference' },
  { header: 'تاريخ الدفع', key: 'paid_at' },
];

function money(value) {
  return Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PaidCourseStudents = () => {
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [source, setSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const range = useDateRange();

  useEffect(() => {
    setCurrentPage(1);
  }, [range.from, range.to]);

  const fetchSeats = useCallback(async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      // The endpoint already unions the two ways a seat gets paid for — a
      // confirmed online order, and a collected invoice for a registration.
      const response = await fetch(`${API}/admin/paid-enrollments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Parse defensively: an auth failure returns HTML from the proxy, not JSON.
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'انتهت صلاحية الجلسة أو حسابك غير مصرّح له — سجّل خروج ثم دخول مرة أخرى بحساب أدمن أو محاسب.'
          );
        }
        // The server sends the database error in `error`; without it the
        // message alone says nothing about what actually failed.
        const detail = data.error ? ` — ${data.error}` : '';
        throw new Error(
          (data.message || `تعذّر تحميل البيانات (${response.status})`) + detail
        );
      }
      setSeats(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
      setSeats([]);
    }
  }, []);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const datedSeats = range.filter(seats, (s) => s.paid_at);
  const filteredSeats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return datedSeats.filter((s) => {
      if (source !== 'all' && s.source !== source) return false;
      if (!q) return true;
      return [s.name, s.email, s.phone, s.national_id, s.course, s.reference]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [datedSeats, source, searchQuery]);

  const indexOfLast = currentPage * PER_PAGE;
  const currentSeats = filteredSeats.slice(indexOfLast - PER_PAGE, indexOfLast);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">مسجلين داخل الكورس (دفعوا)</h2>

        <DateRangeBar
          range={range}
          count={filteredSeats.length}
          onExport={() => exportExcel('مسجلين دفعوا', EXPORT_COLUMNS, filteredSeats, { rangeLabel: range.label })}
        />

        {/* Search + source filter */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          </div>

          <div className="flex flex-wrap gap-2">
            {SOURCE_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSource(value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md text-sm ${
                  source === value
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {value === 'all' ? 'الكل' : SOURCE_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-4 rounded bg-red-50 p-4 text-red-700 text-center">{error}</p>}

        {/* Paid seats table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الاسم الكامل</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الهاتف</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">البريد الإلكتروني</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الهوية</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">اسم الدورة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">المبلغ المدفوع</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {currentSeats.map((seat) => (
                <tr
                  key={seat.key}
                  onClick={
                    seat.registration_id
                      ? () => navigate(`/registrations/${seat.registration_id}/details`)
                      : undefined
                  }
                  // A seat whose registration could not be resolved has nothing to
                  // open, so it must not look clickable.
                  className={`border-b transition-colors ${
                    seat.registration_id ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">الاسم الكامل: </span>
                    {seat.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">رقم الهاتف: </span>
                    {seat.phone || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">البريد الإلكتروني: </span>
                    {seat.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">رقم الهوية: </span>
                    {seat.national_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">اسم الدورة: </span>
                    {seat.course ? seat.course.split(' ').slice(0, 5).join(' ') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">المبلغ المدفوع: </span>
                    {money(seat.amount)} {seat.currency}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">الحالة: </span>
                    {SOURCE_LABELS[seat.source] || seat.source || '-'}
                  </td>
                </tr>
              ))}
              {currentSeats.length === 0 && !error && (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                    {seats.length === 0 ? 'لا يوجد طلاب دفعوا بعد' : 'لا توجد نتائج بهذا الفلتر'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-6">
          {Array.from({ length: Math.ceil(filteredSeats.length / PER_PAGE) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`mx-1 px-4 py-2 rounded-md ${
                currentPage === i + 1
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default PaidCourseStudents;
