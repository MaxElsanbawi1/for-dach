import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDateRange, DateRangeBar, exportExcel } from '../../components/DateExport';
import { API } from '../tax/taxApi';

// Applications from the website page "سجّل كمدرب" (acit-front
// /join-as-trainer). API: acit-back/routes/trainerApplicationsRoutes.js. The
// CV is not a public file: it downloads through the API with the signed-in
// account's token (src/apiFetch.js adds it).

const statusLabels = {
  new: 'جديد',
  reviewing: 'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
};

const statusClasses = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const EXPORT_COLUMNS = [
  { header: 'الاسم', key: 'FullName' },
  { header: 'البريد الإلكتروني', key: 'Email' },
  { header: 'رقم الجوال', key: 'PhoneNumber' },
  { header: 'التخصص', key: 'Specialty' },
  { header: 'سنوات الخبرة', key: 'Experience' },
  { header: 'المدينة', key: 'City' },
  { header: 'الشهادات', key: 'Certifications' },
  { header: 'LinkedIn', key: 'ProfileUrl' },
  { header: 'نبذة', key: 'Bio' },
  { header: 'الحالة', value: (a) => statusLabels[a.Status] || a.Status },
  { header: 'التاريخ', key: 'CreatedAt' },
];

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleString('ar-EG');
};

export default function TrainerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [downloading, setDownloading] = useState(null);
  const range = useDateRange();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return range
      .filter(applications, (a) => a.CreatedAt)
      .filter((a) => !statusFilter || a.Status === statusFilter)
      .filter(
        (a) =>
          !q ||
          [a.FullName, a.Email, a.PhoneNumber, a.Specialty, a.City, a.Certifications]
            .some((v) => String(v || '').toLowerCase().includes(q))
      );
  }, [applications, range, statusFilter, search]);

  const counts = useMemo(
    () => Object.fromEntries(Object.keys(statusLabels).map((s) => [s, applications.filter((a) => a.Status === s).length])),
    [applications]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API}/trainer-applications`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'تعذّر تحميل طلبات المدربين');
      setApplications(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, Status) => {
    const previous = applications;
    setApplications((list) => list.map((a) => (a.ApplicationID === id ? { ...a, Status } : a)));
    try {
      const response = await fetch(`${API}/trainer-applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'تعذّر تحديث الحالة');
      toast.success(`الحالة الآن: ${statusLabels[Status]}`);
    } catch (e) {
      setApplications(previous);
      toast.error(e.message);
    }
  };

  const downloadCv = async (application) => {
    setDownloading(application.ApplicationID);
    try {
      const response = await fetch(`${API}/trainer-applications/${application.ApplicationID}/cv`);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'تعذّر تحميل السيرة الذاتية');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = application.CvOriginalName || `CV - ${application.FullName}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = async () => {
    if (deleteName.trim() !== String(deleteTarget.FullName || '').trim()) {
      toast.error('الاسم غير مطابق لاسم المتقدم');
      return;
    }
    try {
      const response = await fetch(`${API}/trainer-applications/${deleteTarget.ApplicationID}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'تعذّر حذف الطلب');
      setApplications((list) => list.filter((a) => a.ApplicationID !== deleteTarget.ApplicationID));
      setDeleteTarget(null);
      toast.success('تم حذف الطلب وسيرته الذاتية');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow" dir="rtl">
      <ToastContainer position="top-center" rtl />
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">طلبات المدربين</h1>
          <p className="mt-1 text-sm text-gray-500">من صفحة «سجّل كمدرب» في الموقع.</p>
        </div>
        <button type="button" onClick={load} className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90">
          تحديث
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusFilter === '' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          الكل ({applications.length})
        </button>
        {Object.entries(statusLabels).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusFilter === value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {label} ({counts[value] || 0})
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث بالاسم أو البريد أو الجوال أو التخصص"
        className="mb-4 w-full rounded-md border border-gray-300 px-4 py-2"
      />

      <DateRangeBar
        range={range}
        count={filtered.length}
        onExport={() => exportExcel('طلبات المدربين', EXPORT_COLUMNS, filtered, { rangeLabel: range.label })}
      />

      {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">{error}</div>}

      {loading ? (
        <div className="py-10 text-center">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-5 text-center text-gray-600">لا توجد طلبات</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => {
            const open = openId === a.ApplicationID;
            return (
              <li key={a.ApplicationID} className="rounded-lg border border-gray-200">
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : a.ApplicationID)}
                    aria-expanded={open}
                    className="min-w-0 flex-1 text-right"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900">{a.FullName}</span>
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${statusClasses[a.Status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[a.Status] || a.Status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {a.Specialty} · خبرة {a.Experience}
                      {a.City ? ` · ${a.City}` : ''}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{formatDate(a.CreatedAt)}</div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {a.HasCv ? (
                      <button
                        type="button"
                        onClick={() => downloadCv(a)}
                        disabled={downloading === a.ApplicationID}
                        className="rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90 disabled:opacity-60"
                      >
                        {downloading === a.ApplicationID ? 'جارٍ التحميل…' : 'تحميل السيرة الذاتية'}
                      </button>
                    ) : null}
                    <select
                      value={a.Status}
                      onChange={(e) => updateStatus(a.ApplicationID, e.target.value)}
                      aria-label={`حالة طلب ${a.FullName}`}
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(a);
                        setDeleteName('');
                      }}
                      className="rounded-md bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
                    >
                      حذف
                    </button>
                  </div>
                </div>

                {open && (
                  <dl className="grid gap-3 border-t border-gray-100 bg-gray-50 p-4 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold text-gray-500">البريد الإلكتروني</dt>
                      <dd><a href={`mailto:${a.Email}`} className="text-primary underline" dir="ltr">{a.Email}</a></dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-gray-500">رقم الجوال</dt>
                      <dd><a href={`tel:${a.PhoneNumber}`} className="text-primary underline" dir="ltr">{a.PhoneNumber}</a></dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-gray-500">الشهادات المهنية</dt>
                      <dd>{a.Certifications || 'لم يذكرها'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-gray-500">LinkedIn</dt>
                      <dd>
                        {a.ProfileUrl ? (
                          <a href={a.ProfileUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline" dir="ltr">
                            {a.ProfileUrl}
                          </a>
                        ) : 'لم يذكره'}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-xs font-bold text-gray-500">نبذة</dt>
                      <dd className="whitespace-pre-wrap">{a.Bio || 'لم يكتب نبذة'}</dd>
                    </div>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg border border-red-200 bg-red-50 p-5 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-red-700">حذف طلب {deleteTarget.FullName}</h2>
            <p className="mb-4 text-sm text-gray-700">الطلب وسيرته الذاتية هيتحذفوا نهائياً. اكتب اسم المتقدم كما هو للتأكيد.</p>
            <input
              value={deleteName}
              onChange={(e) => setDeleteName(e.target.value)}
              placeholder={deleteTarget.FullName}
              className="mb-4 w-full rounded-md border border-gray-300 px-4 py-2"
            />
            <div className="flex gap-2">
              <button type="button" onClick={confirmDelete} className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600">
                حذف نهائي
              </button>
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
