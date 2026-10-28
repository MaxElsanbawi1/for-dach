import React, { useEffect, useState } from "react";
import { Edit, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { useDateRange, DateRangeBar, exportExcel } from "../../components/DateExport";

const API = " http://localhost:3000/api";

const AllCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [registrationCounts, setRegistrationCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 10;
  const range = useDateRange();

  useEffect(() => {
    setCurrentPage(1);
  }, [range.from, range.to]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const coursesResponse = await fetch(`${API}/courses`, {
        headers: getAuthHeaders(),
      });
      if (!coursesResponse.ok) {
        throw new Error(`Failed to fetch courses (${coursesResponse.status})`);
      }

      const coursesData = await coursesResponse.json();
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      // Counts per course from the server, not by downloading every registration.
      const statsResponse = await fetch(`${API}/registrations/stats`, {
        headers: getAuthHeaders(),
      });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setRegistrationCounts(stats.byCourse || {});
      }
    } catch (fetchError) {
      console.error("Error fetching courses:", fetchError);
      setError("فشل تحميل الدورات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user.user_id]);

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذه الدورة؟")) return;

    try {
      const response = await fetch(`${API}/courses/${courseId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error("Failed to delete course");
      }

      await fetchCourses();
    } catch (deleteError) {
      console.error("Error deleting course:", deleteError);
      alert("فشل حذف الدورة. يرجى المحاولة مرة أخرى.");
    }
  };

  const filteredCourses = range.filter(courses, (course) => course.CreatedAt).filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      String(course.CourseID || "").includes(query) ||
      String(course.CourseName || "").toLowerCase().includes(query) ||
      String(course.CourseCode || "").toLowerCase().includes(query) ||
      String(course.CategoryID || "").includes(query)
    );
  });

  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportColumns = [
    { header: "رقم الدورة", key: "CourseID" },
    { header: "اسم الدورة", key: "CourseName" },
    { header: "رمز الدورة", key: "CourseCode" },
    { header: "الفئة", key: "CategoryID" },
    { header: "المدرب", key: "InstructorName" },
    { header: "السعر", key: "Price" },
    { header: "عدد المسجلين", value: (c) => registrationCounts[c.CourseID] || 0 },
    { header: "تاريخ البدء", key: "StartingTime" },
    { header: "تاريخ الانتهاء", key: "EndingTime" },
    { header: "تاريخ الإنشاء", key: "CreatedAt" },
    { header: "أضافها", value: (c) => c.CreatedByName || c.CreatedByUsername || "" },
  ];

  const handleRowClick = (courseId, event) => {
    if (event.target.closest("button")) return;
    navigate(`/courses/${courseId}/details`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">إدارة الدورات</h2>
        <p className="text-center">تحميل البيانات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">إدارة الدورات</h2>
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-primary">إدارة الدورات</h2>

      <DateRangeBar
        range={range}
        count={filteredCourses.length}
        onExport={() => exportExcel("الدورات", exportColumns, filteredCourses, { rangeLabel: range.label })}
      />

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="hidden md:table-header-group">
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الدورة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">اسم الدورة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رمز الدورة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الفئة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">عدد المسجلين</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ البدء</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ الانتهاء</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ الإنشاء</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">أضافها</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currentCourses.map((course) => (
              <tr
                key={course.CourseID}
                onClick={(event) => handleRowClick(course.CourseID, event)}
                className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">رقم الدورة: </span>
                  {course.CourseID}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">اسم الدورة: </span>
                  {course.CourseName}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">رمز الدورة: </span>
                  {course.CourseCode}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">الفئة: </span>
                  {course.CategoryID}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">عدد المسجلين: </span>
                  <span className="inline-flex min-w-8 justify-center rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                    {registrationCounts[course.CourseID] || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">تاريخ البدء: </span>
                  {course.StartingTime ? new Date(course.StartingTime).toLocaleDateString() : "غير محدد"}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">تاريخ الانتهاء: </span>
                  {course.EndingTime ? new Date(course.EndingTime).toLocaleDateString() : "غير محدد"}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">تاريخ الإنشاء: </span>
                  {course.CreatedAt ? new Date(course.CreatedAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "غير محدد"}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">أضافها: </span>
                  {course.CreatedByName || course.CreatedByUsername || "غير معروف"}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <div className="flex gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/courses/${course.CourseID}/edit`);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
                      title="تعديل الدورة"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteCourse(course.CourseID);
                      }}
                      className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                      title="حذف الدورة"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCourses.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-1 md:space-x-2">
            <button
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-2 py-2 md:px-3 md:py-2 rounded-md text-sm ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              ←
            </button>

            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                onClick={() => paginate(index + 1)}
                className={`px-2 py-2 md:px-3 md:py-2 rounded-md text-sm ${
                  currentPage === index + 1
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {index + 1}
              </button>
            ))}

            <button
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-2 py-2 md:px-3 md:py-2 rounded-md text-sm ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCourses;
