import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagedList, PagedTable, fmtDay } from '../../components/PagedList';
import { useDateRange, DateRangeBar, exportExcel, fetchAllPages } from '../../components/DateExport';

const EXPORT_COLUMNS = [
  { header: 'رقم المستخدم', key: 'UserID' },
  { header: 'الاسم الكامل', key: 'FullName' },
  { header: 'البريد الإلكتروني', key: 'Email' },
  { header: 'رقم الهاتف', key: 'PhoneNumber' },
  { header: 'رقم الهوية', key: 'NationalId' },
  { header: 'المدينة', key: 'Location' },
  { header: 'المصدر', key: 'Source' },
  { header: 'محظور', key: 'IsBlocked', value: (u) => (Number(u.IsBlocked) ? 'نعم' : 'لا') },
  { header: 'تاريخ الإنشاء', key: 'CreatedAt', width: 20 },
];

// Student accounts, paged and searched on the server; the date range is the account's creation date.
const AllStudents = () => {
  const navigate = useNavigate();
  const range = useDateRange();
  const filters = { role: 'student', ...range.params };
  const list = usePagedList('/users', filters);

  const onExport = async () => {
    const rows = await fetchAllPages('/users', { ...filters, q: list.query.trim() });
    await exportExcel('الطلاب', EXPORT_COLUMNS, rows, { rangeLabel: range.active ? range.label : '' });
  };

  const columns = [
    { label: 'رقم المستخدم', render: (u) => u.UserID },
    { label: 'الاسم الكامل', render: (u) => u.FullName },
    { label: 'البريد الإلكتروني', render: (u) => u.Email },
    { label: 'رقم الهاتف', render: (u) => u.PhoneNumber || '-' },
    { label: 'تاريخ الإنشاء', render: (u) => fmtDay(u.CreatedAt) },
  ];

  return (
    <>
      <DateRangeBar range={range} onExport={onExport} count={list.total} />
      <PagedTable
        title="إدارة الطلاب"
        list={list}
        columns={columns}
        rowKey={(u) => u.UserID}
        onRowClick={(u) => navigate(`/students/${u.UserID}/details`)}
        emptyText="لا يوجد طلاب"
        searchPlaceholder="ابحث بالاسم، الإيميل، الهاتف، الهوية أو رقم المستخدم"
      />
    </>
  );
};

export default AllStudents;
