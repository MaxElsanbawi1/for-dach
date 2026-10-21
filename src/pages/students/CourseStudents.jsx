import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagedList, PagedTable, shortCourse } from '../../components/PagedList';
import { useDateRange, DateRangeBar, exportExcel, fetchAllPages } from '../../components/DateExport';

const EXPORT_COLUMNS = [
  { header: 'رقم التسجيل', key: 'RegistrationID' },
  { header: 'الاسم الكامل', key: 'FullName' },
  { header: 'رقم الهاتف', key: 'PhoneNumber' },
  { header: 'البريد الإلكتروني', key: 'Email' },
  { header: 'رقم الهوية', key: 'NationalId' },
  { header: 'اسم الدورة', key: 'CourseName', width: 40 },
  { header: 'الحالة', key: 'Status' },
  { header: 'تاريخ التسجيل', key: 'RegistrationDate', width: 20 },
];

// Registrations not tied to an account yet (registrations.UserID IS NULL), paged on the server.
const CourseStudents = () => {
  const navigate = useNavigate();
  const range = useDateRange();
  const filters = { noUser: 1, ...range.params };
  const list = usePagedList('/registrations', filters);

  const onExport = async () => {
    const rows = await fetchAllPages('/registrations', { ...filters, q: list.query.trim() });
    await exportExcel('طلاب غير مسجلين', EXPORT_COLUMNS, rows, { rangeLabel: range.active ? range.label : '' });
  };

  const columns = [
    { label: 'الاسم الكامل', render: (r) => r.FullName || '-' },
    { label: 'رقم الهاتف', render: (r) => r.PhoneNumber || '-' },
    { label: 'البريد الإلكتروني', render: (r) => r.Email || '-' },
    { label: 'رقم الهوية', render: (r) => r.NationalId || '-' },
    { label: 'اسم الدورة', render: (r) => shortCourse(r.CourseName) },
    { label: 'الحالة', render: (r) => r.Status },
  ];

  return (
    <>
      <DateRangeBar range={range} onExport={onExport} count={list.total} />
      <PagedTable
        title="الطلاب الجدد من الكورسات (غير مسجلين)"
        list={list}
        columns={columns}
        rowKey={(r) => r.RegistrationID}
        onRowClick={(r) => navigate(`/registrations/${r.RegistrationID}/details`)}
        emptyText="لا يوجد طلاب غير مسجلين"
      />
    </>
  );
};

export default CourseStudents;
