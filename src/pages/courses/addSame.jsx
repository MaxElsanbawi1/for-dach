import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowRight, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../AuthContext';

const AddSameCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for form fields
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [courseImage, setCourseImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [price, setPrice] = useState('');
  const [courseType, setCourseType] = useState('OnSite');
  const [courseLink, setCourseLink] = useState('');
  const [categoryID, setCategoryID] = useState('');
  const [startingTime, setStartingTime] = useState('');
  const [endingTime, setEndingTime] = useState('');
  const [lessonsTime, setLessonsTime] = useState('');
  const [instructorID, setInstructorID] = useState('');
  const [error, setError] = useState('');

  // State for categories and trainers
  const [categories, setCategories] = useState([]);
  const [trainers, setTrainers] = useState([]);

  // Fetch categories and trainers
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch("https://backend.camels.center/api/categories");
        if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Fetch trainers
        const trainersResponse = await fetch("https://backend.camels.center/api/users");
        if (!trainersResponse.ok) throw new Error('Failed to fetch trainers');
        const trainersData = await trainersResponse.json();
        setTrainers(trainersData.filter(user => user.Role === 'trainer'));
      } catch (error) {
        console.error('Error:', error);
        toast.error('حدث خطأ أثناء جلب البيانات');
      }
    };

    fetchData();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCourseImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('CourseName', courseName);
    formData.append('CourseCode', courseCode);
    formData.append('Description', description);
    formData.append('Price', price);
    formData.append('CourseType', courseType);
    formData.append('CourseLink', courseLink);
    formData.append('CategoryID', categoryID);
    formData.append('StartingTime', startingTime);
    formData.append('EndingTime', endingTime);
    formData.append('LessonsTime', lessonsTime);
    formData.append('InstructorID', instructorID);
    if (courseImage) {
      formData.append('CourseImage', courseImage);
    }

    try {
      const response = await fetch("https://backend.camels.center/api/courses/by-name", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.token}`
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('تمت إضافة الدورة بنجاح!');
        // Reset form
        setCourseName('');
        setCourseCode('');
        setDescription('');
        setPrice('');
        setCourseType('OnSite');
        setCourseLink('');
        setCategoryID('');
        setStartingTime('');
        setEndingTime('');
        setLessonsTime('');
        setInstructorID('');
        setCourseImage(null);
        setImagePreview('');
        setError('');
      } else {
        setError(result.message || 'فشل في إضافة الدورة');
        toast.error(result.message || 'فشل في إضافة الدورة');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('حدث خطأ أثناء إضافة الدورة');
      toast.error('حدث خطأ أثناء إضافة الدورة');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <ToastContainer position="top-left" rtl={true} />
      
      <button
        onClick={() => navigate('/courses')}
        className="flex items-center text-primary hover:text-secondary mb-6"
      >
        <ArrowRight size={20} className="ml-2" />
        العودة إلى قائمة الدورات
      </button>

      <h2 className="text-2xl font-bold mb-6 text-primary flex items-center">
        <UserPlus size={24} className="ml-2" />
        إضافة دورة جديدة
      </h2>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* Course Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">اسم الدورة</label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          />
        </div>

        {/* Course Code */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">رمز الدورة</label>
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>

        {/* Price */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">السعر</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          />
        </div>

        {/* Course Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">نوع الدورة</label>
          <select
            value={courseType}
            onChange={(e) => setCourseType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          >
            <option value="OnSite">حضوري</option>
            <option value="Online">عبر الإنترنت</option>
          </select>
        </div>

        {/* Course Link (shown only for online courses) */}
        {courseType === 'Online' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary mb-1">رابط الدورة</label>
            <input
              type="url"
              value={courseLink}
              onChange={(e) => setCourseLink(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="https://example.com"
              required={courseType === 'Online'}
            />
          </div>
        )}

        {/* Category */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">الفئة</label>
          <select
            value={categoryID}
            onChange={(e) => setCategoryID(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          >
            <option value="">اختر الفئة</option>
            {categories.map(category => (
              <option key={category.CategoryID} value={category.CategoryID}>
                {category.CategoryName}
              </option>
            ))}
          </select>
        </div>

        {/* Starting Time */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">تاريخ البدء</label>
          <input
            type="datetime-local"
            value={startingTime}
            onChange={(e) => setStartingTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          />
        </div>

        {/* Ending Time */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">تاريخ الانتهاء</label>
          <input
            type="datetime-local"
            value={endingTime}
            onChange={(e) => setEndingTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          />
        </div>

        {/* Lessons Time */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">وقت الدروس</label>
          <input
            type="text"
            value={lessonsTime}
            onChange={(e) => setLessonsTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            placeholder="مثال: 2 ساعة يومياً"
            required
          />
        </div>

        {/* Instructor */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-1">المدرب</label>
          <select
            value={instructorID}
            onChange={(e) => setInstructorID(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            required
          >
            <option value="">اختر المدرب</option>
            {trainers.map(trainer => (
              <option key={trainer.UserID} value={trainer.UserID}>
                {trainer.FullName} ({trainer.Username})
              </option>
            ))}
          </select>
        </div>



        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-secondary text-white py-2 px-4 rounded-md hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          إضافة دورة
        </button>
      </form>
    </div>
  );
};

export default AddSameCourses;