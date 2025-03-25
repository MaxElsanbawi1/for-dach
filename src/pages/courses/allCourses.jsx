import React, { useState, useEffect } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const AllCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for courses data
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for search query
  const [searchQuery, setSearchQuery] = useState('');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 10;

  // Fetch courses data
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://backend.camels.center/api/courses');
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user.user_id]);

  // Delete course function
  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذه الدورة؟')) {
      return;
    }

    try {
      const response = await fetch(`https://backend.camels.center/api/courses/${courseId}`, {
        method: 'DELETE',
        redirect: 'follow'
      });

      if (response.ok) {
        // Refresh the courses list after successful deletion
        await fetchCourses();
      } else {
        throw new Error('Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('فشل حذف الدورة. يرجى المحاولة مرة أخرى.');
    }
  };

  // Filter courses based on search query
  const filteredCourses = courses.filter(
    (course) =>
      course.CourseID.toString().includes(searchQuery) ||
      course.CourseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.CourseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.CategoryID.toString().includes(searchQuery)
  );

  // Pagination logic
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle row click to navigate to course details
  const handleRowClick = (courseId, e) => {
    // Don't navigate if the click was on the delete button
    if (e.target.closest('button')) return;
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

      {/* Courses Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="hidden md:table-header-group">
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الدورة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">اسم الدورة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رمز الدورة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الفئة</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ البدء</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ الانتهاء</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-primary">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currentCourses.map((course) => (
              <tr
                key={course.CourseID}
                onClick={(e) => handleRowClick(course.CourseID, e)}
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
                  <span className="font-semibold md:hidden">تاريخ البدء: </span>
                  {new Date(course.StartingTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <span className="font-semibold md:hidden">تاريخ الانتهاء: </span>
                  {new Date(course.EndingTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(course.CourseID);
                    }}
                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                    title="حذف الدورة"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredCourses.length > 0 && (
        <div className="flex justify-center mt-6">
          {Array.from({ length: Math.ceil(filteredCourses.length / coursesPerPage) }, (_, i) => (
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
      )}
    </div>
  );
};

export default AllCourses;