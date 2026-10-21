import React, { useEffect, useState } from 'react';
import { Users, CreditCard, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API } from '../tax/taxApi';
import { shortCourse } from '../../components/PagedList';

// Overview: the counts come from /registrations/stats and each table shows the
// latest five - nothing here loads the whole registrations table.
const api = API.trim();

const Registrations = () => {
  const [stats, setStats] = useState(null);
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const getJson = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    getJson(`${api}/registrations/stats`).then(setStats);
    getJson(`${api}/registrations?page=1&limit=5&status=Approved`).then((d) => setApproved(d?.rows || []));
    getJson(`${api}/registrations?page=1&limit=5&status=Pending`).then((d) => setPending(d?.rows || []));
  }, []);

  const renderRegistrationTable = (registrations, title) => (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4 text-primary">{title}</h2>
      <table className="min-w-full bg-white">
        <thead className="hidden md:table-header-group">
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم التسجيل</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-primary">البريد الإلكتروني</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-primary">اسم الدورة</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الحالة</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-primary">بداية الدورة</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ التسجيل</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((registration) => (
            <tr onClick={() => navigate(`/registrations/${registration.RegistrationID}/details`)}
                key={registration.RegistrationID} className="border-b cursor-pointer hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                <span className="font-semibold md:hidden">رقم التسجيل: </span>{registration.RegistrationID}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                <span className="font-semibold md:hidden">البريد الإلكتروني: </span>{registration.Email}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                <span className="font-semibold md:hidden">اسم الدورة: </span>{shortCourse(registration.CourseName)}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                <span className="font-semibold md:hidden">الحالة: </span>{registration.Status}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                <span className="font-semibold md:hidden">بداية الدورة: </span>
                {registration.StartingTime ? new Date(registration.StartingTime).toLocaleDateString('en-GB') : '-'}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                <span className="font-semibold md:hidden">تاريخ التسجيل: </span>{new Date(registration.RegistrationDate).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {registrations.length === 0 && (
            <tr><td colSpan="6" className="px-6 py-6 text-center text-sm text-gray-500">لا توجد تسجيلات</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const count = (n) => (stats ? Number(n || 0).toLocaleString('en') : '…');

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="bg-primary p-3 rounded-full text-white">
            <Users size={24} />
          </div>
          <div className="mr-4">
            <h2 className="text-lg font-semibold text-primary">إجمالي التسجيلات</h2>
            <p className="text-2xl font-bold">{count(stats?.total)}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="bg-secondary p-3 rounded-full text-white">
            <CreditCard size={24} />
          </div>
          <div className="mr-4">
            <h2 className="text-lg font-semibold text-primary">التسجيلات المعتمدة</h2>
            <p className="text-2xl font-bold">{count(stats?.byStatus?.Approved)}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="bg-primary p-3 rounded-full text-white">
            <Package size={24} />
          </div>
          <div className="mr-4">
            <h2 className="text-lg font-semibold text-primary">التسجيلات المعلقة</h2>
            <p className="text-2xl font-bold">{count(stats?.byStatus?.Pending)}</p>
          </div>
        </div>
      </div>

      {renderRegistrationTable(approved, "آخر التسجيلات المعتمدة")}
      {renderRegistrationTable(pending, "آخر التسجيلات المعلقة")}
    </>
  );
};

export default Registrations;
