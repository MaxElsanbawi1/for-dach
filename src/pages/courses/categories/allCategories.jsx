import React, { useState, useEffect } from 'react';
import { Search, Trash2, Pencil, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../AuthContext';
import mediaSrc from '../../../mediaSrc';
import { exportExcel } from '../../../components/DateExport';

const API = 'https://back.acit-net.com/api';

const EXPORT_COLUMNS = [
  { header: 'رقم الفئة', key: 'CategoryID' },
  { header: 'اسم الفئة', key: 'CategoryName' },
  { header: 'وصف الفئة', value: (c) => c.CategoryDescription || 'لا يوجد وصف' },
];

const AllCategories = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for categories data
  const [categories, setCategories] = useState([]);

  // State for search query
  const [searchQuery, setSearchQuery] = useState('');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const categoriesPerPage = 10;

  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // The category being edited, held as a copy so cancelling changes nothing.
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  // The newly picked file, and what to show while it is still only local.
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API}/categories`, { method: 'GET', redirect: 'follow' });
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch categories data on component mount
  useEffect(() => {
    fetchCategories();
  }, [user.user_id]);

  const handleDeleteCategory = async (category) => {
    // courses.CategoryID is ON DELETE SET NULL, so the courses survive but come
    // out of the category - worth saying out loud before the row disappears.
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الفئة "${category.CategoryName}"؟
أي دورات مرتبطة بها لن تُحذف، لكنها ستصبح بدون فئة.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(category.CategoryID);
      const response = await fetch(`${API}/categories/${category.CategoryID}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        redirect: 'follow',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || `فشل الحذف (${response.status})`);
      }
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.message || 'فشل حذف الفئة. يرجى المحاولة مرة أخرى.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(
    (category) =>
      category.CategoryID.toString().includes(searchQuery) ||
      category.CategoryName.includes(searchQuery)
  );

  // Pagination logic
  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const currentCategories = filteredCategories.slice(indexOfFirstCategory, indexOfLastCategory);

  // Categories carry no date, so there is no range to pick - only the export.
  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      await exportExcel('الفئات', EXPORT_COLUMNS, filteredCategories);
    } catch (error) {
      setExportError(error.message || 'تعذر التصدير');
    } finally {
      setExporting(false);
    }
  };

  const closeEditor = () => {
    setEditing(null);
    setImageFile(null);
    setImagePreview('');
    setEditError('');
  };

  const handleSaveCategory = async () => {
    if (!editing.CategoryName.trim()) {
      return setEditError('اسم الفئة مطلوب');
    }
    setSaving(true);
    setEditError('');
    try {
      let response;
      if (imageFile) {
        // multipart, so the server's upload middleware sees the file. Content-Type
        // is left unset on purpose — the browser adds it with the boundary.
        const payload = new FormData();
        payload.append('CategoryName', editing.CategoryName.trim());
        payload.append('CategoryDescription', editing.CategoryDescription);
        payload.append('CategoryImg', imageFile);
        response = await fetch(`${API}/categories/${editing.CategoryID}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: payload,
        });
      } else {
        // No picture in the body: the server only writes the fields it is
        // given, so editing the name cannot wipe the category image.
        response = await fetch(`${API}/categories/${editing.CategoryID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            CategoryName: editing.CategoryName.trim(),
            CategoryDescription: editing.CategoryDescription,
          }),
        });
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'تعذّر حفظ التعديل');
      setCategories((prev) =>
        prev.map((c) =>
          c.CategoryID === editing.CategoryID
            ? {
                ...c,
                CategoryName: editing.CategoryName.trim(),
                CategoryDescription: editing.CategoryDescription,
                // The server answers with the stored path when it saved a file.
                CategoryImgUrl: data.CategoryImgUrl || c.CategoryImgUrl,
              }
            : c
        )
      );
      closeEditor();
    } catch (error) {
      setEditError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle row click to navigate to category details
  const handleRowClick = (categoryId) => {
    navigate(`/courses/categories/${categoryId}/details`);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-primary">إدارة الفئات</h2>

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
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{filteredCategories.length} سجل</span>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Download size={15} /> {exporting ? 'جاري التجهيز...' : 'تحميل Excel'}
            </button>
          </div>
        </div>
        {exportError && <p className="-mt-4 mb-4 text-xs text-red-600">{exportError}</p>}

        {/* Categories Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الفئة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">اسم الفئة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">وصف الفئة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.map((category) => (
                <tr
                  key={category.CategoryID}
                  onClick={() => handleRowClick(category.CategoryID)}
                  className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {/* Stacked layout for mobile */}
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">رقم الفئة: </span>
                    {category.CategoryID}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">اسم الفئة: </span>
                    {category.CategoryName}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                    <span className="font-semibold md:hidden">وصف الفئة: </span>
                    {category.CategoryDescription || 'لا يوجد وصف'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm block md:table-cell">
                    <button
                      type="button"
                      onClick={(e) => {
                        // The row itself navigates to the details page, so the
                        // click must not travel any further than this button.
                        e.stopPropagation();
                        setEditError('');
                        setImageFile(null);
                        setImagePreview('');
                        setEditing({
                          CategoryID: category.CategoryID,
                          CategoryName: category.CategoryName || '',
                          CategoryDescription: category.CategoryDescription || '',
                          CategoryImgUrl: category.CategoryImgUrl || '',
                        });
                      }}
                      className="text-primary hover:text-primary/80 p-1 rounded-full hover:bg-gray-100"
                      title="تعديل الفئة"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category);
                      }}
                      disabled={deletingId === category.CategoryID}
                      className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 disabled:opacity-40"
                      title="حذف الفئة"
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
        <div className="flex justify-center mt-6">
          {Array.from({ length: Math.ceil(filteredCategories.length / categoriesPerPage) }, (_, i) => (
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

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          dir="rtl"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-primary">تعديل الفئة</h3>

            <label className="mb-3 block">
              <span className="text-sm font-semibold">اسم الفئة</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 p-2"
                value={editing.CategoryName}
                onChange={(e) => setEditing({ ...editing, CategoryName: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">وصف الفئة</span>
              <textarea
                rows="3"
                className="mt-1 w-full rounded-md border border-gray-300 p-2"
                value={editing.CategoryDescription}
                onChange={(e) =>
                  setEditing({ ...editing, CategoryDescription: e.target.value })
                }
              />
            </label>

            <div className="mt-3">
              <span className="text-sm font-semibold">صورة الفئة</span>
              <div className="mt-2 flex items-center gap-3">
                {imagePreview || editing.CategoryImgUrl ? (
                  <img
                    src={imagePreview || mediaSrc(editing.CategoryImgUrl)}
                    alt=""
                    className="h-16 w-24 rounded object-cover border"
                  />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded border text-xs text-gray-400">
                    لا توجد صورة
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    setImageFile(file);
                    // Show the pick immediately instead of waiting for a round trip.
                    setImagePreview(URL.createObjectURL(file));
                  }}
                  className="flex-1 text-sm"
                />
              </div>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  تراجع عن الصورة الجديدة
                </button>
              )}
            </div>

            {editError && <p className="mt-3 text-sm text-red-600">{editError}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={saving}
                className="rounded-md bg-primary px-5 py-2 font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border px-5 py-2"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllCategories;