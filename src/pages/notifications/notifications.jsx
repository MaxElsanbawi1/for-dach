import React, { useState, useEffect } from 'react';

const RegistrationsPage = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newRegistrationsCount, setNewRegistrationsCount] = useState(0);

  const fetchData = async () => {
    try {
      const requestOptions = {
        method: "GET",
        redirect: "follow"
      };

      const response = await fetch("https://backend.camels.center/api/registrations", requestOptions);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setRegistrations(data);
      
      // Count pending registrations
      const pendingCount = data.filter(reg => reg.Status === 'Pending').length;
      setNewRegistrationsCount(pendingCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up polling for new registrations
    const interval = setInterval(fetchData, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'text-green-700 font-bold';
      case 'pending':
        return 'text-yellow-600 font-bold';
      case 'rejected':
        return 'text-red-600 font-bold';
      default:
        return '';
    }
  };

  // Create a reversed copy of the registrations array
  const reversedRegistrations = [...registrations].reverse();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Course Registrations
      </h1>
      
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50 ">
            <tr>
              <th className=" text-center px-6 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
              <th className=" text-center px-6 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className=" text-center px-6 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider">Registration ID</th>
              <th className=" text-center px-6 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider">Course ID</th>
              <th className=" text-center px-6 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
              <th className=" text-center px-6 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
              <th className=" text-center px-6 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reversedRegistrations.map((reg) => (
              <tr key={reg.RegistrationID} className="hover:bg-gray-50">
                <td className="text-center  px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.UserID}</td>
                <td className="text-center  px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.Username}</td>
                <td className="text-center  px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.CourseID}</td>
                <td className="text-center  px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.RegistrationID}</td>
                <td className="text-center  px-6 py-4 whitespace-nowrap text-sm text-gray-900"> {reg.CourseName.split(' ').slice(0, 5).join(' ')}
                {reg.CourseName.split(' ').length > 5 && '...'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(reg.RegistrationDate).toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(reg.Status)}`}>
                  {reg.Status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegistrationsPage;