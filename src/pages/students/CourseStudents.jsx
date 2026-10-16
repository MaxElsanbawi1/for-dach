import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const CourseStudents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for registrations data
  const [registrations, setRegistrations] = useState([]);

  // State for search query
  const [searchQuery, setSearchQuery] = useState('');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const registrationsPerPage = 10;

  // Fetch registrations data on component mount
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const requestOptions = {
          method: 'GET',
          redirect: 'follow',
        };

        const response = await fetch(' https://back.acit-net.com/api/registrations', requestOptions);
        const data = await response.json();
        // Filter ONLY registrations where UserID is null (i.e. not in the users database)
        const unregisteredStudents = data.filter(reg => reg.UserID === null);
        setRegistrations(unregisteredStudents);
      } catch (error) {
        console.error('Error fetching registrations:', error);
      }
    };

    fetchRegistrations();
  }, [user.user_id]);

  // Filter based on search query
  const filteredRegistrations = registrations.filter(
    (registration) =>
      (registration.FullName && registration.FullName.includes(searchQuery)) ||
      (registration.Email && registration.Email.includes(searchQuery)) ||
      (registration.PhoneNumber && registration.PhoneNumber.includes(searchQuery)) ||
      (registration.CourseName && registration.CourseName.includes(searchQuery))
  );

  // Pagination logic
  const indexOfLastRegistration = currentPage * registrationsPerPage;
  const indexOfFirstRegistration = indexOfLastRegistration - registrationsPerPage;
  const currentRegistrations = filteredRegistrations.slice(indexOfFirstRegistration, indexOfLastRegistration);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRowClick = (registrationId) => {
    navigate(`/registrations/${registrationId}/details`);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">الطلاب الجدد من الكورسات (غير مسجلين)</h2>

        {/* Search Input */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>

        {/* Registrations Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الاسم الكامل</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الهاتف</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">البريد الإلكتروني</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الهوية</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">اسم الدورة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {currentRegistrations.map((registration) => (
                <tr
                  key={registration.RegistrationID}
                  onClick={() => handleRowClick(registration.RegistrationID)}
                  className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">الاسم الكامل: </span>
                    {registration.FullName || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">رقم الهاتف: </span>
                    {registration.PhoneNumber || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">البريد الإلكتروني: </span>
                    {registration.Email || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">رقم الهوية: </span>
                    {registration.NationalId || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">اسم الدورة: </span>
                    {registration.CourseName ? registration.CourseName.split(' ').slice(0, 5).join(' ') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">الحالة: </span>
                    {registration.Status}
                  </td>
                </tr>
              ))}
              {currentRegistrations.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    لا يوجد طلاب غير مسجلين
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-6">
          {Array.from({ length: Math.ceil(filteredRegistrations.length / registrationsPerPage) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`mx-1 px-4 py-2 rounded-md ${
                currentPage === i + 1
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CourseStudents;
