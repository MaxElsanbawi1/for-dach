import { useEffect, useState } from "react";
import { useDateRange, DateRangeBar, exportExcel } from "../../components/DateExport";

const API = "http://localhost:3000/api";

const getAuthHeaders = (json = false) => {
  const token = localStorage.getItem("token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const STATUS_LABELS = { Pending: "في انتظار الموافقة", Approved: "تمت الموافقة", Rejected: "مرفوض" };

const EXPORT_COLUMNS = [
  { header: "الكورس", key: "CourseName" },
  { header: "الطالب", key: "FullName" },
  { header: "الإيميل", key: "Email" },
  { header: "التقييم", key: "Rating" },
  { header: "الرأي", key: "Review" },
  { header: "الحالة", value: (r) => STATUS_LABELS[r.Status] || r.Status },
  { header: "تاريخ التقييم", key: "CreatedAt" },
];

export default function CourseRatings() {
  const [ratings, setRatings] = useState([]);
  const [status, setStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const range = useDateRange();
  const shown = range.filter(ratings, (r) => r.CreatedAt);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API}/courses/ratings/admin?status=${status}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "تعذر تحميل التقييمات");
      }
      setRatings(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [status]);

  const updateStatus = async (ratingId, nextStatus) => {
    try {
      setMessage("");
      const response = await fetch(`${API}/courses/ratings/${ratingId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "تعذر تحديث حالة التقييم");
      }
      setMessage("تم تحديث حالة التقييم");
      fetchRatings();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow md:p-6" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-primary">تقييمات الكورسات</h1>
        <select
          className="rounded border px-4 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Pending">في انتظار الموافقة</option>
          <option value="Approved">تمت الموافقة</option>
          <option value="Rejected">مرفوض</option>
          <option value="All">الكل</option>
        </select>
      </div>

      <DateRangeBar
        range={range}
        count={shown.length}
        onExport={() => exportExcel("تقييمات الكورسات", EXPORT_COLUMNS, shown, { rangeLabel: range.label })}
      />

      {message && <p className="mb-4 rounded bg-blue-50 p-3 text-blue-700">{message}</p>}
      {loading && <p className="text-center">جاري التحميل...</p>}
      {error && <p className="rounded bg-red-50 p-4 text-red-700">{error}</p>}

      {!loading && !error && shown.length === 0 && (
        <p className="rounded bg-gray-50 p-6 text-center text-gray-600">لا توجد تقييمات.</p>
      )}

      {!loading && !error && shown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-right">
            <thead>
              <tr className="bg-gray-100 text-sm text-gray-700">
                <th className="border p-3">الكورس</th>
                <th className="border p-3">الطالب</th>
                <th className="border p-3">التقييم</th>
                <th className="border p-3">الرأي</th>
                <th className="border p-3">الحالة</th>
                <th className="border p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((rating) => (
                <tr key={rating.RatingID} className="align-top">
                  <td className="border p-3 font-bold text-primary">{rating.CourseName}</td>
                  <td className="border p-3">
                    <div className="font-bold">{rating.FullName}</div>
                    <div className="text-xs text-gray-500">{rating.Email}</div>
                  </td>
                  <td className="border p-3 text-acit-gold">
                    {"★".repeat(Number(rating.Rating))}
                    <span className="text-gray-300">{"★".repeat(5 - Number(rating.Rating))}</span>
                  </td>
                  <td className="max-w-md border p-3">{rating.Review || "-"}</td>
                  <td className="border p-3">{rating.Status}</td>
                  <td className="border p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateStatus(rating.RatingID, "Approved")}
                        className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                      >
                        موافقة
                      </button>
                      <button
                        onClick={() => updateStatus(rating.RatingID, "Rejected")}
                        className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                      >
                        رفض
                      </button>
                      <button
                        onClick={() => updateStatus(rating.RatingID, "Pending")}
                        className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
                      >
                        تعليق
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
