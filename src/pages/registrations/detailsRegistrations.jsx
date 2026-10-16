import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Printer, UserPlus } from 'lucide-react';
import { useAuth } from '../../AuthContext';

const DetailsRegistrations = () => {
  const navigate = useNavigate();
  const { registrationId } = useParams();
  const { user } = useAuth();

  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  const fetchRegistrationDetails = useCallback(async () => {
    const requestOptions = {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Authorization': `Bearer ${user?.token}`
      }
    };

    try {
      const response = await fetch(
        ` https://back.acit-net.com/api/registrations/${registrationId}`,
        requestOptions
      );

      if (!response.ok) {
        throw new Error('Failed to fetch registration details');
      }

      const result = await response.json();
      setRegistration(result);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [registrationId, user?.token]);

  useEffect(() => {
    fetchRegistrationDetails();
  }, [fetchRegistrationDetails]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setCreateUserError('');

    try {
      const createUserResponse = await fetch(' https://back.acit-net.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          NationalId: registration.NationalId || 'N/A',
          Username: newUsername,
          Password: newPassword,
          FullName: registration.FullName || 'Unknown',
          Email: registration.Email || 'unknown@example.com',
          PhoneNumber: registration.PhoneNumber,
          Location: registration.Location,
          Role: 'student'
        })
      });

      const userData = await createUserResponse.json();

      if (!createUserResponse.ok) {
        throw new Error(userData.message || 'فشل في إنشاء حساب المستخدم');
      }

      const updateRegResponse = await fetch(` https://back.acit-net.com/api/registrations/${registration.RegistrationID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          fullname: registration.FullName,
          email: registration.Email,
          phonenumber: registration.PhoneNumber,
          location: registration.Location,
          Language: registration.Language,
          Write_an_inquiry: registration.Write_an_inquiry,
          status: registration.Status,
          CourseID: registration.CourseID,
          NationalId: registration.NationalId
        })
      });

      if (!updateRegResponse.ok) {
         throw new Error('تم إنشاء الحساب بنجاح ولكن فشل ربطه بالتسجيل.');
      }

      setShowCreateUser(false);
      setNewUsername('');
      setNewPassword('');
      fetchRegistrationDetails();
      alert('تم إنشاء حساب الطالب وربطه بالتسجيل بنجاح!');

    } catch (err) {
      setCreateUserError(err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل التسجيل</h2>
          <p className="text-center">تحميل...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل التسجيل</h2>
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
            تفاصيل التسجيل
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/registrations/${registrationId}/print`)}
              className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Printer size={18} className="ml-2" />
              طباعة تفاصيل التسجيل
            </button>
          </div>
        </div>

        {registration && (
          <div className="space-y-6 printable-area">
            {/* Registration Information Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">معرف التسجيل</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {registration.RegistrationID}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">الاسم الكامل</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {registration.FullName || '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">البريد الإلكتروني</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {registration.Email || '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">رقم الهاتف</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {registration.PhoneNumber || '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">رقم الهوية</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {registration.NationalId || '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">اسم الدورة</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {registration.CourseName || registration.CourseID}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">تاريخ التسجيل</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {new Date(registration.RegistrationDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">حالة التسجيل</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {registration.Status}
                </p>
              </div>
            </div>

            {/* Actions: open the course, and create a student account when the
                registration has none yet. */}
            {(registration.CourseID || !registration.UserID) && (
              <div className="mt-8 border-t pt-6">
                {!showCreateUser ? (
                  <div className="flex flex-wrap gap-3">
                  {!registration.UserID && (
                  <button
                    onClick={() => {
                      setNewUsername(registration.Email ? registration.Email.split('@')[0] : '');
                      setShowCreateUser(true);
                    }}
                    className="flex items-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  >
                    <UserPlus size={18} className="ml-2" />
                    إنشاء حساب لهذا الطالب
                  </button>
                  )}
                  {registration.CourseID && (
                    <button
                      onClick={() => navigate(`/courses/${registration.CourseID}/details`)}
                      className="flex items-center bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    >
                      <BookOpen size={18} className="ml-2" />
                      عرض الدورة
                    </button>
                  )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-md border border-gray-200 shadow-sm max-w-2xl">
                    <h3 className="text-lg font-bold text-primary mb-4 flex items-center">
                      <UserPlus size={20} className="ml-2 text-green-600" />
                      تفاصيل الحساب الجديد
                    </h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="مثال: ahmed123"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                        <input
                          type="text"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="أدخل كلمة مرور قوية"
                        />
                      </div>
                      
                      {createUserError && (
                        <p className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">{createUserError}</p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={isCreatingUser}
                          className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                        >
                          {isCreatingUser ? 'جاري الإنشاء والربط...' : 'حفظ وإنشاء الحساب'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateUser(false)}
                          className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default DetailsRegistrations;