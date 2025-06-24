import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Printer, Search } from "lucide-react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  // Registration form state
  const [regForm, setRegForm] = useState({
    email: "",
    fullname: "",
    NationalId: "",
    phonenumber: "",
    location: "",
    Language: "",
    Write_an_inquiry: "",
    status: "approved",
    CourseID: courseId,
  });
  const [regFormLoading, setRegFormLoading] = useState(false);
  const [regFormSuccess, setRegFormSuccess] = useState("");
  const [regFormError, setRegFormError] = useState("");

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
    try {
      // Find the current registration to get all its data
      const currentRegistration = registrations.find(reg => reg.RegistrationID === registrationId);
      
      if (!currentRegistration) {
        throw new Error("Registration not found");
      }

      // Optimistic UI update
      setRegistrations(prevRegs =>
        prevRegs.map(reg =>
          reg.RegistrationID === registrationId
            ? { ...reg, Status: newStatus }
            : reg
        )
      );
  
      // Update status counts
      setStatusCounts(prev => {
        const updated = { ...prev };
        const oldStatus = currentRegistration.Status?.toLowerCase();
        
        if (oldStatus && updated[oldStatus] > 0) {
          updated[oldStatus]--;
        }
        updated[newStatus]++;
        return updated;
      });
  
      // Prepare the updated registration data with the new structure
      const updatedRegistrationData = {
        fullname: currentRegistration.FullName || currentRegistration.fullname,
        email: currentRegistration.Email || currentRegistration.email,
        phonenumber: currentRegistration.PhoneNumber || currentRegistration.phonenumber,
        location: currentRegistration.Location || currentRegistration.location,
        Language: currentRegistration.Language,
        Write_an_inquiry: currentRegistration.Write_an_inquiry,
        status: newStatus, // Updated status
        CourseID: currentRegistration.CourseID
      };

      // API call
      const response = await fetch(
        `https://backend.camels.center/api/registrations/${registrationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedRegistrationData),
        }
      );
  
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
  
      // Optional: show success message
      console.log("Status updated successfully");
      
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert changes if API call fails
      setRegistrations(registrations);
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

  const handleRegFormChange = (e) => {
    const { name, value } = e.target;
    setRegForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegFormSubmit = async (e) => {
    e.preventDefault();
    setRegFormLoading(true);
    try {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      const raw = JSON.stringify({ ...regForm, CourseID: courseId });
      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };
      const response = await fetch(
        "https://backend.camels.center/api/registrations",
        requestOptions
      );
      if (!response.ok) throw new Error("فشل التسجيل. حاول مرة أخرى.");
      toast.success("تم التسجيل بنجاح!", {
        position: "top-left",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        rtl: true,
      });
      setRegForm({
        email: "",
        fullname: "",
        NationalId: "",
        phonenumber: "",
        location: "",
        Language: "",
        Write_an_inquiry: "",
        status: "approved",
        CourseID: courseId,
      });
      // Refresh registrations
      // Re-fetch course details (only registrations part)
      const registrationsResponse = await fetch(
        `https://backend.camels.center/api/registrations/course/${courseId}`,
        { method: "GET", redirect: "follow" }
      );
      let registrationsResult = [];
      if (registrationsResponse.ok) {
        registrationsResult = await registrationsResponse.json();
      }
      setRegistrations(registrationsResult);
      // Update status counts
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
    } catch (err) {
      toast.error(err.message || "فشل التسجيل. حاول مرة أخرى.", {
        position: "top-left",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        rtl: true,
      });
    } finally {
      setRegFormLoading(false);
    }
  };

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
          {/* Toast Container for notifications */}
          <ToastContainer
            position="top-left"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={true}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
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

            {/* Registration Form */}
            <form onSubmit={handleRegFormSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                name="fullname"
                placeholder="الاسم الكامل"
                value={regForm.fullname}
                onChange={handleRegFormChange}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="البريد الإلكتروني"
                value={regForm.email}
                onChange={handleRegFormChange}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
              <input
                type="text"
                name="NationalId"
                placeholder="الرقم الوطني"
                value={regForm.NationalId}
                onChange={handleRegFormChange}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <input
                type="text"
                name="phonenumber"
                placeholder="رقم الهاتف"
                value={regForm.phonenumber}
                onChange={handleRegFormChange}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
              <input
                type="text"
                name="location"
                placeholder="الموقع"
                value={regForm.location}
                onChange={handleRegFormChange}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <select
                name="Language"
                value={regForm.Language}
                onChange={handleRegFormChange}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              >
                <option value="">اختر اللغة</option>
                <option value="English">English</option>
                <option value="العربية">العربية</option>
              </select>
              <input
                type="text"
                name="Write_an_inquiry"
                placeholder="استفسار (اختياري)"
                value={regForm.Write_an_inquiry}
                onChange={handleRegFormChange}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary md:col-span-2"
              />
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-1"
                disabled={regFormLoading}
              >
                {regFormLoading ? "جاري التسجيل..." : "تسجيل جديد"}
              </button>
            </form>

            {/* Display a message if there are no registrations */}


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
                        رقم الهويه 
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
      
    >
      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
        <span className="font-semibold md:hidden">رقم التسجيل: </span>
        {registration.RegistrationID}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
        <span className="font-semibold md:hidden"> رقم الهويه :</span>
        {registration.NationalId}
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
  <div 
    className="inline-block" 
    onClick={(e) => e.stopPropagation()}
  >
    <select
      value={registration.Status.toLowerCase()}
      onChange={(e) => handleStatusChange(registration.RegistrationID, e.target.value)}
      className={`px-2 py-1 rounded-md text-xs font-medium ${
        statusConfig[registration.Status.toLowerCase()]?.bg || "bg-gray-100"
      } ${
        statusConfig[registration.Status.toLowerCase()]?.textColor || "text-gray-800"
      }`}
    >
      <option value="pending">قيد الانتظار</option>
      <option value="approved">معتمد</option>
      <option value="rejected">مرفوض</option>
    </select>
  </div>
</td>
    </tr>
  ))}

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
