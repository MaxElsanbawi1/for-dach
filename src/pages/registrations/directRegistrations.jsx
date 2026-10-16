import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DirectRegistrations = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const registrationsPerPage = 10;

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const response = await fetch(' https://back.acit-net.com/api/registrations');
        const data = await response.json();
        setRegistrations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching direct registrations:', error);
      }
    };

    fetchRegistrations();
  }, []);

  const searchLower = searchQuery.toLowerCase();
  const filteredRegistrations = registrations.filter((registration) => {
    if (registration.RegistrationSource !== 'direct_course') return false;

    return (
      registration.RegistrationID?.toString().includes(searchLower) ||
      registration.FullName?.toLowerCase().includes(searchLower) ||
      registration.Email?.toLowerCase().includes(searchLower) ||
      registration.PhoneNumber?.toString().includes(searchLower) ||
      registration.CourseName?.toLowerCase().includes(searchLower) ||
      registration.Status?.toLowerCase().includes(searchLower)
    );
  });

  const indexOfLastRegistration = currentPage * registrationsPerPage;
  const indexOfFirstRegistration = indexOfLastRegistration - registrationsPerPage;
  const currentRegistrations = filteredRegistrations.slice(indexOfFirstRegistration, indexOfLastRegistration);
  const totalPages = Math.ceil(filteredRegistrations.length / registrationsPerPage);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-primary">مسجلين مباشرة</h2>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
        <div className="text-sm text-gray-600">
          عدد التسجيلات المباشرة: {filteredRegistrations.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="hidden md:table-header-group">
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم التسجيل</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الاسم</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الهاتف</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الإيميل</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الدورة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ التسجيل</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {currentRegistrations.map((registration) => (
              <tr
                key={registration.RegistrationID}
                onClick={() => navigate(`/registrations/${registration.RegistrationID}/details`)}
                className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">رقم التسجيل: </span>
                  {registration.RegistrationID}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">الاسم: </span>
                  {registration.FullName || '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">الهاتف: </span>
                  {registration.PhoneNumber || '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">الإيميل: </span>
                  {registration.Email || '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">الدورة: </span>
                  {registration.CourseName || registration.CourseID}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">تاريخ التسجيل: </span>
                  {registration.RegistrationDate ? new Date(registration.RegistrationDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">الحالة: </span>
                  {registration.Status || '-'}
                </td>
              </tr>
            ))}
            {currentRegistrations.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  لا توجد تسجيلات مباشرة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
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
      )}
    </div>
  );
};

export default DirectRegistrations;
