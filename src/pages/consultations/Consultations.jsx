import React, { useEffect, useMemo, useState } from 'react';
import { useDateRange, DateRangeBar, exportExcel } from '../../components/DateExport';

const API = ' https://back.acit-net.com/api';

const typeLabels = {
  cybersecurity: 'استشارات سايبر',
  networks: 'استشارات شبكات',
  general: 'استشارات عام',
  other: 'استشارات في التدريب',
  software: "البرمجيات والتطبيقات",
  security: "الأمن السيبراني",
  ai: "الذكاء الاصطناعي",
  cloud: "الحوسبة السحابية",
  consulting: "الاستشارات التقنية",
  systems: "الأنظمة التقنية",
  marketing: "التسويق الرقمي",
  support: "استشارات في التدريب",
};

const statusLabels = {
  new: 'جديد',
  in_progress: 'قيد المتابعة',
  done: 'تم',
  cancelled: 'ملغي',
};

const statusClasses = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EXPORT_COLUMNS = [
  { header: 'النوع', value: (c) => typeLabels[c.Type] || c.Type },
  { header: 'الاسم', key: 'FullName' },
  { header: 'البريد الإلكتروني', key: 'Email' },
  { header: 'رقم الهاتف', key: 'PhoneNumber' },
  { header: 'الشركة', key: 'Company' },
  { header: 'التفاصيل', key: 'Message' },
  { header: 'الحالة', value: (c) => statusLabels[c.Status] || c.Status },
  { header: 'التاريخ', key: 'CreatedAt' },
];

export default function Consultations({ fixedType = '' }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ FullName: '', Email: '' });
  const range = useDateRange();
  const datedConsultations = range.filter(consultations, (item) => item.CreatedAt);

  const filteredConsultations = useMemo(() => {
    return datedConsultations.filter((item) => {
      const typeMatch = !fixedType || item.Type === fixedType;
      const statusMatch = !statusFilter || item.Status === statusFilter;
      return typeMatch && statusMatch;
    });
  }, [datedConsultations, fixedType, statusFilter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/consultations`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ أثناء تحميل الاستشارات');
      }

      setConsultations(Array.isArray(result) ? result : []);
    } catch (error) {
      setMessage(error.message || 'حدث خطأ أثناء تحميل الاستشارات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const updateStatus = async (id, Status) => {
    try {
      setMessage('');
      const response = await fetch(`${API}/consultations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Status }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ أثناء تحديث الحالة');
      }

      setConsultations((current) =>
        current.map((item) =>
          item.ConsultationID === id ? { ...item, Status } : item
        )
      );
      setMessage('تم تحديث حالة الاستشارة بنجاح');
    } catch (error) {
      setMessage(error.message || 'حدث خطأ أثناء تحديث الحالة');
    }
  };

  const openDeleteConfirm = (consultation) => {
    setDeleteTarget(consultation);
    setDeleteConfirm({ FullName: '', Email: '' });
    setMessage('');
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteConfirm({ FullName: '', Email: '' });
  };

  const deleteConsultation = async () => {
    if (!deleteTarget) return;

    const enteredName = deleteConfirm.FullName.trim().toLowerCase();
    const enteredEmail = deleteConfirm.Email.trim().toLowerCase();
    const targetName = String(deleteTarget.FullName || '').trim().toLowerCase();
    const targetEmail = String(deleteTarget.Email || '').trim().toLowerCase();

    if (enteredName !== targetName || enteredEmail !== targetEmail) {
      setMessage('الاسم أو البريد الإلكتروني غير مطابقين لبيانات طلب الاستشارة');
      return;
    }

    try {
      setMessage('');
      const response = await fetch(`${API}/consultations/${deleteTarget.ConsultationID}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ أثناء حذف الاستشارة');
      }

      setConsultations((current) => current.filter((item) => item.ConsultationID !== deleteTarget.ConsultationID));
      setMessage('تم حذف طلب الاستشارة بنجاح');
      closeDeleteConfirm();
    } catch (error) {
      setMessage(error.message || 'حدث خطأ أثناء حذف الاستشارة');
    }
  };

  const formatDate = (value) => {
    if (!value) return 'غير محدد';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'غير محدد';
    return date.toLocaleString('ar-EG');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-primary">
          {fixedType ? typeLabels[fixedType] : 'طلبات الاستشارات'}
        </h1>
        <button
          type="button"
          onClick={fetchConsultations}
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          تحديث
        </button>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-1">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-md border border-gray-300 px-4 py-2"
        >
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <DateRangeBar
        range={range}
        count={filteredConsultations.length}
        onExport={() =>
          exportExcel(
            fixedType ? `الاستشارات - ${typeLabels[fixedType] || fixedType}` : 'طلبات الاستشارات',
            EXPORT_COLUMNS,
            filteredConsultations,
            { rangeLabel: range.label }
          )
        }
      />

      {message && (
        <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-center">
          {message}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-5 shadow-2xl">
            <h2 className="mb-3 text-lg font-bold text-red-700">تأكيد حذف طلب الاستشارة</h2>
            <p className="mb-4 text-sm text-gray-700">
              اكتب الاسم والبريد الإلكتروني كما هما في الطلب لتأكيد الحذف.
            </p>

            <div className="mb-4 grid gap-3 rounded-md border border-red-200 bg-white p-3 md:grid-cols-2">
              <div>
                <span className="block text-xs font-bold text-gray-500">الاسم الموجود في الطلب</span>
                <span className="text-sm font-semibold text-gray-900">{deleteTarget.FullName || 'غير محدد'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500">البريد الإلكتروني الموجود في الطلب</span>
                <span className="text-sm font-semibold text-gray-900">{deleteTarget.Email || 'غير محدد'}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">الاسم</label>
                <input
                  value={deleteConfirm.FullName}
                  onChange={(event) =>
                    setDeleteConfirm((current) => ({ ...current, FullName: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2"
                  placeholder={deleteTarget.FullName || 'الاسم'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">البريد الإلكتروني</label>
                <input
                  value={deleteConfirm.Email}
                  onChange={(event) =>
                    setDeleteConfirm((current) => ({ ...current, Email: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2"
                  placeholder={deleteTarget.Email || 'email@example.com'}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={deleteConsultation}
                className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                حذف نهائي
              </button>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center">جاري التحميل...</div>
      ) : filteredConsultations.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-5 text-center text-gray-600">
          لا توجد طلبات استشارة
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الاسم</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">التواصل</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الشركة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">التفاصيل</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredConsultations.map((item) => (
                <tr key={item.ConsultationID} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{typeLabels[item.Type] || item.Type}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{item.FullName}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>{item.Email}</div>
                    <div className="text-gray-500">{item.PhoneNumber || 'بدون رقم'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.Company || 'غير محدد'}</td>
                  <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-3 text-sm text-gray-700">
                    {item.Message || 'لا توجد تفاصيل'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[item.Status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[item.Status] || item.Status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.CreatedAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <select
                        value={item.Status}
                        onChange={(event) => updateStatus(item.ConsultationID, event.target.value)}
                        className="rounded-md border border-gray-300 px-2 py-1"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(item)}
                        className="rounded-md bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
