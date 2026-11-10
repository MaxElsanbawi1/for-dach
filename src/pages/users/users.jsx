import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { API } from '../tax/taxApi';
import { usePagedList, PagedTable } from '../../components/PagedList';
import { useDateRange, DateRangeBar, exportExcel, fetchAllPages } from '../../components/DateExport';

// Explicit columns, so nothing password- or token-like can slip into the file.
const EXPORT_COLUMNS = [
  { header: 'رقم المستخدم', key: 'UserID' },
  { header: 'الاسم الكامل', key: 'FullName' },
  { header: 'اسم المستخدم', key: 'Username' },
  { header: 'البريد الإلكتروني', key: 'Email' },
  { header: 'رقم الهاتف', key: 'PhoneNumber' },
  { header: 'الصلاحيات', key: 'Role' },
  { header: 'موقوف', key: 'IsBlocked', value: (u) => (Number(u.IsBlocked) ? 'نعم' : 'لا') },
  { header: 'تاريخ الإنشاء', key: 'CreatedAt', width: 20 },
];

// Staff accounts (every role except student), paged and searched on the server.
const UsersDashboards = () => {
  const navigate = useNavigate();
  const range = useDateRange();
  const filters = { staff: 1, ...range.params };
  const list = usePagedList('/users', filters);
  const { user, access, can } = useAuth();
  // Deleting accounts is the super admin's alone (the API enforces it too).
  const isSuperAdmin = !!access?.isSuperAdmin;
  const [deletingId, setDeletingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);

  // The API refuses these two as well; here they just never show a dead button.
  const canSuspendRow = (u) =>
    String(u.UserID) !== String(user?.user_id) && (isSuperAdmin || String(u.Role).toLowerCase() !== 'superadmin');

  const onToggleSuspend = async (u) => {
    const suspend = !Number(u.IsBlocked);
    if (suspend && !window.confirm(`إيقاف حساب "${u.FullName || u.Email}"؟ مش هيقدر يدخل الداشبورد لحد ما ترجّعه.`)) return;
    setSuspendingId(u.UserID);
    try {
      const res = await fetch(`${API.trim()}/users/${u.UserID}/blocked`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IsBlocked: suspend }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      list.reload();
    } catch (err) {
      window.alert(err.message || 'تعذر تحديث حالة الحساب');
    } finally {
      setSuspendingId(null);
    }
  };

  const onDelete = async (u) => {
    if (!window.confirm(`حذف المستخدم "${u.FullName || u.Email}" نهائيًا؟ لا يمكن التراجع.`)) return;
    setDeletingId(u.UserID);
    try {
      const res = await fetch(`${API.trim()}/users/${u.UserID}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      list.reload();
    } catch (err) {
      window.alert(err.message || 'تعذر حذف المستخدم');
    } finally {
      setDeletingId(null);
    }
  };

  const onExport = async () => {
    const rows = await fetchAllPages('/users', { ...filters, q: list.query.trim() });
    await exportExcel('المستخدمين', EXPORT_COLUMNS, rows, { rangeLabel: range.active ? range.label : '' });
  };

  const columns = [
    { label: 'رقم المستخدم', render: (u) => u.UserID },
    { label: 'الاسم الكامل', render: (u) => u.FullName },
    { label: 'البريد الإلكتروني', render: (u) => u.Email },
    { label: 'رقم الهاتف', render: (u) => u.PhoneNumber || '-' },
    { label: 'الصلاحيات', render: (u) => u.Role },
    {
      label: 'الحالة',
      render: (u) => (Number(u.IsBlocked)
        ? <span className="font-medium text-red-700">موقوف</span>
        : <span className="text-green-700">نشط</span>),
    },
    ...(can('users.suspend')
      ? [{
          label: 'إيقاف الحساب',
          render: (u) => {
            if (!canSuspendRow(u)) return '-';
            const suspended = !!Number(u.IsBlocked);
            const busy = suspendingId === u.UserID;
            return (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleSuspend(u); }}
                disabled={busy}
                aria-label={`${suspended ? 'إرجاع' : 'إيقاف'} ${u.FullName || u.Email}`}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 disabled:opacity-50 ${
                  suspended ? 'text-green-700 hover:bg-green-50' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                {suspended ? <RotateCcw size={16} /> : <Ban size={16} />}
                {busy ? 'جارٍ التنفيذ...' : suspended ? 'إرجاع' : 'إيقاف'}
              </button>
            );
          },
        }]
      : []),
    ...(isSuperAdmin
      ? [{
          label: 'حذف',
          render: (u) =>
            String(u.UserID) === String(user?.user_id) ? '-' : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(u); }}
                disabled={deletingId === u.UserID}
                aria-label={`حذف ${u.FullName || u.Email}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deletingId === u.UserID ? 'جارٍ الحذف...' : 'حذف'}
              </button>
            ),
        }]
      : []),
  ];

  return (
    <>
      <DateRangeBar range={range} onExport={onExport} count={list.total} />
      <PagedTable
        title="إدارة المستخدمين"
        list={list}
        columns={columns}
        rowKey={(u) => u.UserID}
        onRowClick={(u) => navigate(`/students/${u.UserID}/details`)}
        emptyText="لا يوجد مستخدمين"
      />
    </>
  );
};

export default UsersDashboards;
