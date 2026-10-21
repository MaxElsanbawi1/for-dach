import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  { header: 'محظور', key: 'IsBlocked', value: (u) => (Number(u.IsBlocked) ? 'نعم' : 'لا') },
  { header: 'تاريخ الإنشاء', key: 'CreatedAt', width: 20 },
];

// Staff accounts (every role except student), paged and searched on the server.
const UsersDashboards = () => {
  const navigate = useNavigate();
  const range = useDateRange();
  const filters = { staff: 1, ...range.params };
  const list = usePagedList('/users', filters);

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
