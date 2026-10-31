import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import mediaSrc from '../../../mediaSrc';

const API = 'https://back.acit-net.com/api';

const DetailsCategories = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams(); // Changed from courseId to categoryId

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      try {
        const response = await fetch(`${API}/categories/${categoryId}`, {
          method: 'GET',
          redirect: 'follow',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch category details');
        }

        const result = await response.json();
        setCategory(result);
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryDetails();
  }, [categoryId]);

  useEffect(() => {
    // There is no courses-by-category endpoint, and GET /courses already
    // returns CategoryID on every row, so the filtering happens here rather
    // than adding an endpoint for one screen.
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const response = await fetch(`${API}/courses`);
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.data || [];
        setCourses(list.filter((c) => String(c.CategoryID) === String(categoryId)));
      } catch (e) {
        // The category itself still renders; only this section goes empty.
        console.error('Error loading category courses:', e);
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [categoryId]);

  if (loading) {
    return (
      <>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل الفئة</h2>
          <p className="text-center">تحميل...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل الفئة</h2>
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
            تفاصيل الفئة
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/categories/${categoryId}/print`)}
              className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Printer size={18} className="ml-2" />
              طباعة تفاصيل الفئة
            </button>
          </div>
        </div>

        {category && (
          <div className="space-y-6 printable-area">
            {/* Category Information Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">رقم الفئة</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {category.CategoryID}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">اسم الفئة</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {category.CategoryName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">وصف الفئة</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {category.CategoryDescription || 'لا يوجد وصف'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">صورة الفئة</label>
                <p className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {/* This pointed at backend.camels.center — a different project
                      entirely — so the picture could never load. */}
                  {category.CategoryImgUrl ? (
                    <img
                      src={mediaSrc(category.CategoryImgUrl)}
                      alt={category.CategoryName}
                      className="h-24 w-36 rounded object-cover"
                    />
                  ) : (
                    'لا يوجد صورة'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Courses filed under this category */}
        <div className="mt-8">
          <h3 className="mb-4 text-xl font-bold text-primary">
            الدورات داخل الفئة
            {!coursesLoading && (
              <span className="mr-2 text-sm font-normal text-gray-500">
                ({courses.length})
              </span>
            )}
          </h3>

          {coursesLoading && <p className="text-center text-gray-500">تحميل الدورات...</p>}

          {!coursesLoading && courses.length === 0 && (
            <div className="rounded bg-gray-50 p-6 text-center text-gray-600">
              لا توجد دورات في هذه الفئة.
            </div>
          )}

          {!coursesLoading && courses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="hidden md:table-header-group">
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الدورة</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-primary">اسم الدورة</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-primary">السعر</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-primary">المدرب</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-primary">تاريخ البدء</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.CourseID}
                      onClick={() => navigate(`/courses/${course.CourseID}/details`)}
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
                        <span className="font-semibold md:hidden">السعر: </span>
                        {course.Price ? `${course.Price} SAR` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                        <span className="font-semibold md:hidden">المدرب: </span>
                        {course.InstructorName || '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                        <span className="font-semibold md:hidden">تاريخ البدء: </span>
                        {course.StartingTime
                          ? new Date(course.StartingTime).toLocaleDateString('ar-EG')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DetailsCategories;