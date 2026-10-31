import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import RegistrationInvoiceButton, { useRegistrationInvoices } from '../../components/RegistrationInvoiceButton';

const StudentsDetails = () => {
  const navigate = useNavigate();
  const { userId } = useParams(); // Changed from courseId to userId
  const { user: authUser, access } = useAuth();
  const isSuperAdmin = !!access?.isSuperAdmin;

  const [user, setUser] = useState(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserData, setEditUserData] = useState({});
  const [updatingUser, setUpdatingUser] = useState(false);
  const [updateUserMessage, setUpdateUserMessage] = useState('');
  const [studentRegistrations, setStudentRegistrations] = useState([]);
  // Which enrolments already have a real tax invoice.
  const { invoices: registrationInvoices, refresh: refreshInvoices } =
    useRegistrationInvoices(studentRegistrations.map((r) => r.RegistrationID));
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [showCourseOptions, setShowCourseOptions] = useState(false);
  const [assigningCourse, setAssigningCourse] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [editingRegistrationId, setEditingRegistrationId] = useState(null);
  const [editRegistrationData, setEditRegistrationData] = useState({ CourseID: '', Status: 'Pending' });
  const [savingRegistrationId, setSavingRegistrationId] = useState(null);
  const [deletingRegistrationId, setDeletingRegistrationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // The password itself is fetched only when the super admin asks to see it
  // (the API logs each view); it never comes with the student's data.
  const [revealedPassword, setRevealedPassword] = useState(null);
  const togglePassword = async () => {
    if (showPassword) {
      setShowPassword(false);
      return;
    }
    if (revealedPassword === null) {
      try {
        const res = await fetch(` https://back.acit-net.com/api/users/${userId}/password`);
        const data = await res.json();
        setRevealedPassword(res.ok ? data.password || data.message || 'غير متاحة' : data.message || 'غير متاحة');
      } catch {
        setRevealedPassword('تعذر عرض كلمة السر');
      }
    }
    setShowPassword(true);
  };

  const selectedCourse = courses.find((course) => String(course.CourseID) === String(selectedCourseId));
  const filteredCourses = courses.filter((course) => {
    const search = courseSearch.trim().toLowerCase();
    if (!search) return true;

    return (
      String(course.CourseName || '').toLowerCase().includes(search) ||
      String(course.CourseCode || '').toLowerCase().includes(search)
    );
  });
 
  const formatDate = (value) => {
    if (!value) return 'غير محدد';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'غير محدد';
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCourseTime = (course) => {
    if (!course) return 'اختر الكورس لعرض المواعيد';
    const dates = course.StartingTime && course.EndingTime
      ? `من ${formatDate(course.StartingTime)} إلى ${formatDate(course.EndingTime)}`
      : formatDate(course.StartingTime);
    return course.LessonsTime ? `${dates} - ${course.LessonsTime}` : dates;
  };

  const formatPrice = (value) => {
    const price = Number(value || 0);
    if (!price) return 'غير محدد';
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 2,
    }).format(price);
  };

  // The server matches the student's registrations by account, email, national
  // id or phone (?forUser=) - the page used to download every registration.
  const fetchStudentRegistrations = async (student) => {
    if (!student?.UserID) return;
    const registrationsResponse = await fetch(
      ` https://back.acit-net.com/api/registrations?forUser=${encodeURIComponent(student.UserID)}&page=1&limit=100`
    );
    if (!registrationsResponse.ok) return;
    const registrationsResult = await registrationsResponse.json();
    setStudentRegistrations(Array.isArray(registrationsResult?.rows) ? registrationsResult.rows : []);
  };


  const handleEditUserClick = () => {
    setIsEditingUser(true);
    setEditUserData({
      FullName: user.FullName || '',
      Email: user.Email || '',
      PhoneNumber: user.PhoneNumber || '',
      NationalId: user.NationalId || '',
      Password: '', // empty = keep the current password
    });
    setUpdateUserMessage('');
  };

  const handleCancelEditUser = () => {
    setIsEditingUser(false);
    setUpdateUserMessage('');
  };

  const handleSaveUser = async () => {
    setUpdatingUser(true);
    setUpdateUserMessage('');
    try {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      if (authUser?.token) {
        myHeaders.append("Authorization", `Bearer ${authUser.token}`);
      }
      
      const response = await fetch(` https://back.acit-net.com/api/users/${userId}`, {
        method: 'PUT',
        headers: myHeaders,
        body: JSON.stringify(editUserData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ أثناء تحديث بيانات الطالب');
      }
      
      setUser({ ...user, ...editUserData });
      setUpdateUserMessage('تم تحديث بيانات الطالب بنجاح');
      setIsEditingUser(false);
      setRevealedPassword(null); // a new password may have been set
      setShowPassword(false);
    } catch (error) {
      setUpdateUserMessage(error.message || 'حدث خطأ أثناء تحديث البيانات');
    } finally {
      setUpdatingUser(false);
    }
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = authUser?.token || localStorage.getItem('token');
        const response = await fetch(` https://back.acit-net.com/api/users/${userId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          redirect: 'follow',
        });

        if (!response.ok) {
          const errorResult = await response.json().catch(() => ({}));
          throw new Error(errorResult.message || `Failed to fetch user details (${response.status})`);
        }

        const result = await response.json();
        setUser(result);

        const coursesResponse = await fetch(' https://back.acit-net.com/api/courses', {
          method: 'GET',
          redirect: 'follow',
        });

        if (coursesResponse.ok) {
          const coursesResult = await coursesResponse.json();
          setCourses(Array.isArray(coursesResult) ? coursesResult : []);
        }

        await fetchStudentRegistrations(result);
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId, authUser?.token]);

  const handleAssignCourse = async () => {
    if (!user || !selectedCourse) {
      setAssignMessage('من فضلك اختر الكورس أولا');
      return;
    }

    setAssigningCourse(true);
    setAssignMessage('');

    try {
      const response = await fetch(' https://back.acit-net.com/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname: user.FullName || '',
          email: user.Email || '',
          phonenumber: user.PhoneNumber || '',
          NationalId: user.NationalId || '',
          CourseID: selectedCourse.CourseID,
          status: 'Pending',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ أثناء تسجيل الطالب على الكورس');
      }

      setAssignMessage('تم تسجيل الطالب على الكورس بنجاح');
      setSelectedCourseId('');
      setCourseSearch('');
      setShowCourseOptions(false);
      await fetchStudentRegistrations(user);
    } catch (error) {
      setAssignMessage(error.message || 'حدث خطأ أثناء تسجيل الطالب على الكورس');
    } finally {
      setAssigningCourse(false);
    }
  };

  const handleDeleteRegistration = async (registrationId) => {
    if (!registrationId || !window.confirm('هل تريد حذف تسجيل الطالب من هذا الكورس؟')) {
      return;
    }

    setDeletingRegistrationId(registrationId);
    setAssignMessage('');

    try {
      const response = await fetch(` https://back.acit-net.com/api/registrations/${registrationId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ أثناء حذف التسجيل');
      }

      setStudentRegistrations((current) =>
        current.filter((registration) => registration.RegistrationID !== registrationId)
      );
      setAssignMessage('تم حذف تسجيل الكورس بنجاح');
    } catch (error) {
      setAssignMessage(error.message || 'حدث خطأ أثناء حذف التسجيل');
    } finally {
      setDeletingRegistrationId(null);
    }
  };

  const startEditRegistration = (registration) => {
    setEditingRegistrationId(registration.RegistrationID);
    setEditRegistrationData({
      CourseID: String(registration.CourseID || ''),
      Status: registration.Status || 'Pending',
    });
    setAssignMessage('');
  };

  const cancelEditRegistration = () => {
    setEditingRegistrationId(null);
    setEditRegistrationData({ CourseID: '', Status: 'Pending' });
  };

  const handleUpdateRegistration = async (registration) => {
    if (!user || !editRegistrationData.CourseID) {
      setAssignMessage('من فضلك اختر الكورس أولا');
      return;
    }

    setSavingRegistrationId(registration.RegistrationID);
    setAssignMessage('');

    try {
      const response = await fetch(` https://back.acit-net.com/api/registrations/${registration.RegistrationID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname: registration.FullName || user.FullName || '',
          email: registration.Email || user.Email || '',
          phonenumber: registration.PhoneNumber || user.PhoneNumber || '',
          location: registration.Location || '',
          Language: registration.Language || '',
          Write_an_inquiry: registration.Write_an_inquiry || '',
          status: editRegistrationData.Status,
          CourseID: Number(editRegistrationData.CourseID),
          NationalId: registration.NationalId || user.NationalId || '',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ أثناء تعديل التسجيل');
      }

      setAssignMessage('تم تعديل التسجيل بنجاح');
      cancelEditRegistration();
      await fetchStudentRegistrations(user);
    } catch (error) {
      setAssignMessage(error.message || 'حدث خطأ أثناء تعديل التسجيل');
    } finally {
      setSavingRegistrationId(null);
    }
  };

  if (loading) {
    return (
      <>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل الطالب</h2>
          <p className="text-center">تحميل...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل الطالب</h2>
          <p className="text-center text-red-500">{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        {/* Page Title and Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center">
            تفاصيل الطالب
          </h2>
          <div className="flex gap-2">
            {!isEditingUser ? (
              <button
                onClick={handleEditUserClick}
                className="flex items-center bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <Edit size={18} className="ml-2" />
                تعديل البيانات
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveUser}
                  disabled={updatingUser}
                  className="flex items-center bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
                >
                  <Save size={18} className="ml-2" />
                  {updatingUser ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={handleCancelEditUser}
                  disabled={updatingUser}
                  className="flex items-center bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-60"
                >
                  <X size={18} className="ml-2" />
                  إلغاء
                </button>
              </div>
            )}
            <button
              onClick={() => navigate(`/users/${userId}/print`)}
              className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Printer size={18} className="ml-2" />
              طباعة تفاصيل الطالب
            </button>
          </div>
        </div>

        {user && (
          <div className="space-y-6 printable-area">
            {/* User Information Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">رقم المستخدم</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {user.UserID}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">الاسم الكامل</label>
                {isEditingUser ? (
                  <input
                    type="text"
                    value={editUserData.FullName}
                    onChange={(e) => setEditUserData({ ...editUserData, FullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    {user.FullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">البريد الإلكتروني</label>
                {isEditingUser ? (
                  <input
                    type="email"
                    value={editUserData.Email}
                    onChange={(e) => setEditUserData({ ...editUserData, Email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    {user.Email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">رقم الهاتف</label>
                {isEditingUser ? (
                  <input
                    type="text"
                    value={editUserData.PhoneNumber}
                    onChange={(e) => setEditUserData({ ...editUserData, PhoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    {user.PhoneNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">رقم الهوية الوطنية</label>
                {isEditingUser ? (
                  <input
                    type="text"
                    value={editUserData.NationalId}
                    onChange={(e) => setEditUserData({ ...editUserData, NationalId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    {user.NationalId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">كلمة المرور</label>
                {isEditingUser ? (
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={editUserData.Password}
                      placeholder="اتركها فاضية لو مش هتغيّرها"
                      onChange={(e) => setEditUserData({ ...editUserData, Password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary bg-transparent border-none p-0 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                ) : isSuperAdmin ? (
                  <div className="relative">
                    <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50" dir="ltr" style={{ textAlign: 'right' }}>
                      {showPassword ? revealedPassword : '********'}
                    </p>
                    <button
                      type="button"
                      title="إظهار كلمة السر (بيتسجّل في السجل)"
                      onClick={togglePassword}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary bg-transparent border-none p-0 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                ) : (
                  <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    ******** (يظهر للسوبر أدمن بس)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">تاريخ الإنشاء</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {new Date(user.CreatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {updateUserMessage && (
              <p className={`mt-2 text-center ${updateUserMessage.includes('بنجاح') ? 'text-green-600' : 'text-red-600'}`}>
                {updateUserMessage}
              </p>
            )}

            <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-xl font-bold text-primary mb-4">اختيار كورس للطالب</h3>

              {user.InterestedCourse && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary mb-1">الكورس المكتوب في فورم QR</label>
                  <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white">
                    {user.InterestedCourse}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">اختر الكورس من الداشبورد</label>
                  <div className="relative">
                    <input
                      type="search"
                      value={courseSearch}
                      onChange={(event) => {
                        setCourseSearch(event.target.value);
                        setSelectedCourseId('');
                        setAssignMessage('');
                        setShowCourseOptions(true);
                      }}
                      onFocus={() => setShowCourseOptions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowCourseOptions(false), 120);
                      }}
                      placeholder="ابحث باسم الكورس أو الكود"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    {showCourseOptions && (
                      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
                        {filteredCourses.length > 0 ? (
                          filteredCourses.slice(0, 25).map((course) => (
                            <button
                              key={course.CourseID}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setSelectedCourseId(String(course.CourseID));
                                setCourseSearch(`${course.CourseName}${course.CourseCode ? ` - ${course.CourseCode}` : ''}`);
                                setShowCourseOptions(false);
                                setAssignMessage('');
                              }}
                              className="block w-full px-4 py-2 text-right text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            >
                              {course.CourseName} {course.CourseCode ? `- ${course.CourseCode}` : ''}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-right text-sm text-red-600">
                            لا توجد كورسات مطابقة للبحث
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">السعر</label>
                  <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white">
                    {selectedCourse ? formatPrice(selectedCourse.Price) : 'اختر الكورس لعرض السعر'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-primary mb-1">المواعيد</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white">
                  {getCourseTime(selectedCourse)}
                </p>
              </div>

              {assignMessage && (
                <p className={`mt-4 text-center ${assignMessage.includes('بنجاح') ? 'text-green-600' : 'text-red-600'}`}>
                  {assignMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleAssignCourse}
                disabled={!selectedCourseId || assigningCourse}
                className="mt-4 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {assigningCourse ? 'جاري التسجيل...' : 'تسجيل الطالب على الكورس'}
              </button>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-bold text-primary mb-4">الكورسات المسجل فيها الطالب</h3>
              {studentRegistrations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">اسم الكورس</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">كود الكورس</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الحالة</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">تاريخ التسجيل</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">تاريخ البداية</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الفاتورة</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">تعديل</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-primary">حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRegistrations.map((registration) => (
                        <tr key={registration.RegistrationID} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {editingRegistrationId === registration.RegistrationID ? (
                              <select
                                value={editRegistrationData.CourseID}
                                onChange={(event) =>
                                  setEditRegistrationData((current) => ({
                                    ...current,
                                    CourseID: event.target.value,
                                  }))
                                }
                                className="w-full min-w-56 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">اختر الكورس</option>
                                {courses.map((course) => (
                                  <option key={course.CourseID} value={course.CourseID}>
                                    {course.CourseName} {course.CourseCode ? `- ${course.CourseCode}` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              registration.CourseName || 'غير محدد'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {registration.CourseCode || 'غير محدد'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {editingRegistrationId === registration.RegistrationID ? (
                              <select
                                value={editRegistrationData.Status}
                                onChange={(event) =>
                                  setEditRegistrationData((current) => ({
                                    ...current,
                                    Status: event.target.value,
                                  }))
                                }
                                className="w-full min-w-32 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            ) : (
                              registration.Status || 'غير محدد'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {registration.RegistrationDate
                              ? new Date(registration.RegistrationDate).toLocaleDateString()
                              : 'غير محدد'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {registration.StartingTime
                              ? new Date(registration.StartingTime).toLocaleDateString()
                              : 'غير محدد'}
                          </td>
                          {/* Invoice: open the one that exists, or raise it.
                              The automation normally creates it on approval,
                              so this is a shortcut and a gap-filler. */}
                          <td className="px-4 py-3 text-right text-sm">
                            <RegistrationInvoiceButton
                              registration={registration}
                              invoice={registrationInvoices[registration.RegistrationID]}
                              onChanged={refreshInvoices}
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {editingRegistrationId === registration.RegistrationID ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRegistration(registration)}
                                  disabled={savingRegistrationId === registration.RegistrationID}
                                  className="bg-green-600 text-white py-1.5 px-3 rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {savingRegistrationId === registration.RegistrationID ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditRegistration}
                                  disabled={savingRegistrationId === registration.RegistrationID}
                                  className="bg-gray-500 text-white py-1.5 px-3 rounded-md hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditRegistration(registration)}
                                className="bg-blue-500 text-white py-1.5 px-3 rounded-md hover:bg-blue-600"
                              >
                                تعديل
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <button
                              type="button"
                              onClick={() => handleDeleteRegistration(registration.RegistrationID)}
                              disabled={deletingRegistrationId === registration.RegistrationID}
                              className="bg-red-500 text-white py-1.5 px-3 rounded-md hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {deletingRegistrationId === registration.RegistrationID ? 'جاري الحذف...' : 'حذف'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center text-gray-600">
                  الطالب غير مسجل في أي كورسات حتى الآن
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StudentsDetails;
