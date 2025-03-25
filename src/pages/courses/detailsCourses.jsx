import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Printer, Search } from "lucide-react";

const CourseDetails = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noRegistrations, setNoRegistrations] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const regsPerPage = 10;

  // Status counts
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch course details
        const courseResponse = await fetch(
          `https://backend.camels.center/api/courses/${courseId}`,
          {
            method: "GET",
            redirect: "follow",
          }
        );

        if (!courseResponse.ok) {
          throw new Error("Failed to fetch course details");
        }

        const courseResult = await courseResponse.json();
        setCourse(courseResult);

        // Fetch registrations - this won't throw an error if response is not OK
        const registrationsResponse = await fetch(
          `https://backend.camels.center/api/registrations/course/${courseId}`,
          {
            method: "GET",
            redirect: "follow",
          }
        );
        console.log(registrationsResponse)
        let registrationsResult = [];
        if (registrationsResponse.ok) {
          registrationsResult = await registrationsResponse.json();
        } else {
          console.warn("Failed to fetch registrations, using empty array");
        }

        setRegistrations(registrationsResult);

        // Check if there are no registrations
        if (registrationsResult.length === 0) {
          setNoRegistrations(true);
        } else {
          setNoRegistrations(false);
        }

        // Calculate status counts
        const counts = {
          pending: 0,
          approved: 0,
          rejected: 0,
          total: registrationsResult.length,
        };

        registrationsResult.forEach((reg) => {
          const status = reg.Status.toLowerCase();
          if (counts[status] !== undefined) {
            counts[status]++;
          }
        });

        setStatusCounts(counts);
      } catch (error) {
        console.error("Error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId]);
  const handleStatusChange = async (registrationId, newStatus) => {
    window.location.reload()
    try {
      // Get the registration being updated
      const registration = registrations.find(r => r.RegistrationID === registrationId);
      if (!registration) return;
  
      // Update local state optimistically
      setRegistrations(prevRegs =>
        prevRegs.map(reg =>
          reg.RegistrationID === registrationId
            ? { ...reg, Status: newStatus }
            : reg
        )
      );
  
      // Update status counts
      setStatusCounts(prev => {
        const counts = { ...prev };
        const oldStatus = registration.Status.toLowerCase();
        
        if (oldStatus && counts[oldStatus] > 0) {
          counts[oldStatus]--;
        }
        counts[newStatus.toLowerCase()]++;
        return counts;
      });
  
      // Prepare API request
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
  
      const raw = JSON.stringify({
        "UserID": registration.UserID,
        "CourseID": registration.CourseID,
        "Status": newStatus
      });
      
      const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
      };
  
      // Send API request
      const response = await fetch(
        `https://backend.camels.center/api/registrations/${registrationId}`,
        requestOptions
      );
    
      if (!response.ok) {
        throw new Error("Failed to update registration status");
      }
  
      // Show success notification
      toast.success(`تم تغيير الحالة إلى ${statusConfig[newStatus.toLowerCase()]?.text}`);
  
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert local state if API call fails
      setRegistrations(registrations);
      toast.error("حدث خطأ أثناء تحديث الحالة");
    }

  };
  // Filter registrations based on search query and status filter
  const filteredRegistrations = registrations.filter((registration) => {
    const matchesSearch =
      registration.RegistrationID.toString().includes(searchQuery) ||
      registration.Username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      registration.FullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      registration.Email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      registration.PhoneNumber.includes(searchQuery);

    const matchesStatus =
      statusFilter === "all" ||
      registration.Status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });
  const statusConfig = {
    approved: {
      text: "معتمد",
      bg: "bg-green-100",
      textColor: "text-green-800",
    },
    rejected: {
      text: "مرفوض",
      bg: "bg-red-100",
      textColor: "text-red-800",
    },
    pending: {
      text: "قيد الانتظار",
      bg: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
  };
  // Pagination logic
  const indexOfLastReg = currentPage * regsPerPage;
  const indexOfFirstReg = indexOfLastReg - regsPerPage;
  const currentRegistrations = filteredRegistrations.slice(
    indexOfFirstReg,
    indexOfLastReg
  );

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل الدورة</h2>
        <p className="text-center">تحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل الدورة</h2>
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Page Title and Buttons */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-primary flex items-center">
          تفاصيل الدورة
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/courses/${courseId}/print`)}
            className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Printer size={18} className="ml-2" />
            طباعة تفاصيل الدورة
          </button>
        </div>
      </div>

      {course && (
        <div className="space-y-6 printable-area">
          {/* Course Image */}
          <div className="flex justify-center">
            <img
              src={course.courseImgUrl}
              alt={course.CourseName}
              className="w-48 h-48 object-cover rounded-lg"
              
            />
          </div>

          {/* Course Information Section */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                رقم الدورة
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.CourseID}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                اسم الدورة
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.CourseName}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                رمز الدورة
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.CourseCode}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                الوصف
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.Description || "N/A"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                السعر
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.Price}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                نوع الدورة
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.CourseType}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                رابط الدورة
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.CourseLink || "N/A"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                تاريخ البدء
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {new Date(course.StartingTime).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                تاريخ الانتهاء
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {new Date(course.EndingTime).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                وقت الدروس
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.LessonsTime || "N/A"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                معرف المدرب
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.InstructorID}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                اسم المدرب
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.InstructorName}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                بريد المدرب
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.InstructorEmail}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                هاتف المدرب
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {course.InstructorPhoneNumber}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                تاريخ الإنشاء
              </label>
              <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {new Date(course.CreatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Registrations Section */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-primary mb-4">التسجيلات</h3>

            {/* Display a message if there are no registrations */}
            {noRegistrations && (
              <div className="text-center text-gray-500">
                لا توجد تسجيلات لهذه الدورة بعد.
              </div>
            )}

            {/* Status Statistics */}
            {!noRegistrations && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h4 className="text-base md:text-lg font-semibold text-blue-700">
                      الكل
                    </h4>
                    <p className="text-xl md:text-2xl font-bold text-blue-900">
                      {statusCounts.total}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h4 className="text-base md:text-lg font-semibold text-yellow-700">
                      قيد الانتظار
                    </h4>
                    <p className="text-xl md:text-2xl font-bold text-yellow-900">
                      {statusCounts.pending}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <h4 className="text-base md:text-lg font-semibold text-green-700">
                      معتمد
                    </h4>
                    <p className="text-xl md:text-2xl font-bold text-green-900">
                      {statusCounts.approved}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <h4 className="text-base md:text-lg font-semibold text-red-700">
                      مرفوض
                    </h4>
                    <p className="text-xl md:text-2xl font-bold text-red-900">
                      {statusCounts.rejected}
                    </p>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col space-y-4 mb-6">
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="بحث..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <Search
                      size={18}
                      className="absolute left-3 top-2.5 text-gray-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-2 text-xs md:text-sm rounded-md ${
                        statusFilter === "all"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      onClick={() => setStatusFilter("pending")}
                      className={`px-3 py-2 text-xs md:text-sm rounded-md ${
                        statusFilter === "pending"
                          ? "bg-yellow-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      قيد الانتظار
                    </button>
                    <button
                      onClick={() => setStatusFilter("approved")}
                      className={`px-3 py-2 text-xs md:text-sm rounded-md ${
                        statusFilter === "approved"
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      معتمد
                    </button>
                    <button
                      onClick={() => setStatusFilter("rejected")}
                      className={`px-3 py-2 text-xs md:text-sm rounded-md ${
                        statusFilter === "rejected"
                          ? "bg-red-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      مرفوض
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="hidden md:table-header-group">
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-right text-sm font-semibold text-primary">
                          رقم التسجيل
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-primary">
                          اسم المستخدم
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-primary">
                          الاسم الكامل
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-primary">
                          البريد الإلكتروني
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-primary">
                          رقم الهاتف
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-primary">
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody>
  {currentRegistrations.map((registration) => (
    <tr
      key={registration.RegistrationID}
      className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() =>
        navigate(`/registrations/${registration.RegistrationID}`)
      }
    >
      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
        <span className="font-semibold md:hidden">رقم التسجيل: </span>
        {registration.RegistrationID}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
        <span className="font-semibold md:hidden">اسم المستخدم: </span>
        {registration.Username}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
        <span className="font-semibold md:hidden">الاسم الكامل: </span>
        {registration.FullName}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
        <span className="font-semibold md:hidden">البريد الإلكتروني: </span>
        {registration.Email}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
        <span className="font-semibold md:hidden">رقم الهاتف: </span>
        {registration.PhoneNumber}
      </td>
      <td className="px-6 py-4 text-right text-sm block md:table-cell">
        <span className="font-semibold md:hidden">الحالة: </span>
        <select
          value={registration.Status.toLowerCase()}
          onChange={(e) => handleStatusChange(registration.RegistrationID, e.target.value)}
          className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
            statusConfig[registration.Status.toLowerCase()]?.bg || "bg-gray-100"
          } ${
            statusConfig[registration.Status.toLowerCase()]?.textColor || "text-gray-800"
          }`}
          onClick={(e) => e.stopPropagation() }
        >
          <option value="pending">قيد الانتظار</option>
          <option value="approved">معتمد</option>
          <option value="rejected">مرفوض</option>
        </select>
      </td>
    </tr>
  ))}

  {currentRegistrations.length === 0 && (
    <tr>
      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
        لا توجد تسجيلات مطابقة للمعايير المحددة
      </td>
    </tr>
  )}
</tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredRegistrations.length > 0 && (
                  <div className="flex justify-center mt-6 flex-wrap gap-2">
                    {Array.from(
                      {
                        length: Math.ceil(
                          filteredRegistrations.length / regsPerPage
                        ),
                      },
                      (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => paginate(i + 1)}
                          className={`px-3 py-1 md:px-4 md:py-2 rounded-md ${
                            currentPage === i + 1
                              ? "bg-primary text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {i + 1}
                        </button>
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
