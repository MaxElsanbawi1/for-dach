import React from "react";
import { useNavigate } from "react-router-dom";
import { usePagedList, PagedTable, fmtDay } from "../../components/PagedList";
import { useDateRange, DateRangeBar, exportExcel, fetchAllPages } from "../../components/DateExport";

const EXPORT_COLUMNS = [
  { header: "ID", key: "UserID" },
  { header: "الاسم", key: "FullName" },
  { header: "البريد الإلكتروني", key: "Email" },
  { header: "الهاتف", key: "PhoneNumber" },
  { header: "رقم الهوية", key: "NationalId" },
  { header: "الدورة", key: "InterestedCourse", width: 40 },
  { header: "المدينة", key: "Location" },
  { header: "تاريخ الإنشاء", key: "CreatedAt", width: 20 },
];

// Students who signed up through the QR form (users.Source = 'QR FORM'), paged on the server.
export default function QRFormStudents() {
  const navigate = useNavigate();
  const range = useDateRange();
  const filters = { role: "student", source: "QR FORM", ...range.params };
  const list = usePagedList("/users", filters);

  const onExport = async () => {
    const rows = await fetchAllPages("/users", { ...filters, q: list.query.trim() });
    await exportExcel("طلاب QR FORM", EXPORT_COLUMNS, rows, { rangeLabel: range.active ? range.label : "" });
  };

  const columns = [
    { label: "ID", render: (s) => s.UserID },
    { label: "الاسم", render: (s) => s.FullName },
    { label: "البريد الإلكتروني", render: (s) => s.Email },
    { label: "الهاتف", render: (s) => s.PhoneNumber || "-" },
    { label: "رقم الهوية", render: (s) => s.NationalId || "-" },
    { label: "الدورة", render: (s) => <span className="font-semibold text-acit-gold">{s.InterestedCourse || "-"}</span> },
    { label: "تاريخ الإنشاء", render: (s) => fmtDay(s.CreatedAt) },
  ];

  return (
    <>
      <DateRangeBar range={range} onExport={onExport} count={list.total} />
      <PagedTable
        title="QR FORM"
        list={list}
        columns={columns}
        rowKey={(s) => s.UserID}
        onRowClick={(s) => navigate(`/students/${s.UserID}/details`)}
        emptyText="لسه مفيش طلاب من QR FORM."
      />
    </>
  );
}
