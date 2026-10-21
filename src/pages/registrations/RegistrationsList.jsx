import React from "react";
import { useNavigate } from "react-router-dom";
import { usePagedList, PagedTable, shortCourse, fmtDay } from "../../components/PagedList";
import { useDateRange, DateRangeBar, exportExcel, fetchAllPages } from "../../components/DateExport";

// The registration list pages (all / new / direct / approved / rejected): one
// server-paged table, filtered by status or source on the server.
const STATUS_LABEL = { Pending: "قيد المراجعة", Approved: "مقبول", Rejected: "مرفوض" };
const STATUS_CLS = { Pending: "bg-yellow-100 text-yellow-800", Approved: "bg-green-100 text-green-800", Rejected: "bg-red-100 text-red-700" };
const SOURCE_LABEL = { direct_course: "صفحة الدورة" };

const EXPORT_COLUMNS = [
  { header: "رقم التسجيل", key: "RegistrationID" },
  { header: "الاسم الكامل", key: "FullName" },
  { header: "رقم الهويه", key: "NationalId" },
  { header: "البريد الإلكتروني", key: "Email" },
  { header: "رقم الهاتف", key: "PhoneNumber" },
  { header: "المدينة", key: "Location" },
  { header: "اسم الدورة", key: "CourseName", width: 40 },
  { header: "كود الدورة", key: "CourseCode" },
  { header: "بداية الدورة", key: "StartingTime", width: 20 },
  { header: "تاريخ التسجيل", key: "RegistrationDate", width: 20 },
  { header: "الحالة", value: (r) => STATUS_LABEL[r.Status] || r.Status },
  { header: "مصدر التسجيل", value: (r) => SOURCE_LABEL[r.RegistrationSource] || r.RegistrationSource },
  { header: "اللغة", key: "Language" },
  { header: "الاستفسار", key: "Write_an_inquiry", width: 40 },
];

export default function RegistrationsList({ title, status, source, emptyText }) {
  const navigate = useNavigate();
  const range = useDateRange();
  const filters = { status, source, ...range.params };
  const list = usePagedList("/registrations", filters);

  // The file holds every row matching the filters and search, not just this page.
  const onExport = async () => {
    const rows = await fetchAllPages("/registrations", { ...filters, q: list.query.trim() });
    await exportExcel(title || "التسجيلات", EXPORT_COLUMNS, rows, { rangeLabel: range.active ? range.label : "" });
  };

  const columns = [
    { label: "رقم التسجيل", render: (r) => r.RegistrationID },
    { label: "الاسم الكامل", render: (r) => r.FullName || "-" },
    { label: "رقم الهويه", render: (r) => r.NationalId || "-" },
    { label: "البريد الإلكتروني", render: (r) => r.Email || "-" },
    { label: "رقم الهاتف", render: (r) => r.PhoneNumber || "-" },
    { label: "اسم الدورة", render: (r) => shortCourse(r.CourseName) },
    { label: "بداية الدورة", render: (r) => fmtDay(r.StartingTime) },
    { label: "تاريخ التسجيل", render: (r) => fmtDay(r.RegistrationDate) },
    {
      label: "الحالة",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLS[r.Status] || "bg-gray-100 text-gray-700"}`}>
          {STATUS_LABEL[r.Status] || r.Status}
        </span>
      ),
    },
  ];

  return (
    <>
      <DateRangeBar range={range} onExport={onExport} count={list.total} />
      <PagedTable
        title={title}
        list={list}
        columns={columns}
        rowKey={(r) => r.RegistrationID}
        onRowClick={(r) => navigate(`/registrations/${r.RegistrationID}/details`)}
        emptyText={emptyText}
        searchPlaceholder="ابحث بالاسم، الإيميل، الهاتف، الهوية، الدورة أو رقم التسجيل"
      />
    </>
  );
}
