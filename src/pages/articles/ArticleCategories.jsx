import React, { useEffect, useState } from "react";
import { GripVertical, Plus, Download } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { exportExcel } from "../../components/DateExport";

const API = "https://back.acit-net.com/api";
const emptyCategory = { name: "", slug: "", description: "", sortOrder: 0, isActive: true };

const EXPORT_COLUMNS = [
  { header: "الترتيب", key: "sortOrder" },
  { header: "الاسم", key: "name" },
  { header: "الرابط", key: "slug" },
  { header: "الوصف", key: "description" },
  { header: "الحالة", value: (c) => (c.isActive ? "مفعّل" : "متوقف") },
  { header: "تاريخ الإنشاء", key: "createdAt" },
];

function headers() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ArticleCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyCategory);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const editing = Boolean(form.id);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/articles/categories`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "تعذّر تحميل التصنيفات");
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const action = async (path, options = {}, success) => {
    try {
      const res = await fetch(`${API}${path}`, { headers: headers(), ...options });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "فشل تنفيذ الطلب");
      toast.success(success || data.message);
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name || !form.slug) return toast.error("اسم التصنيف والرابط حقول مطلوبة");
    await action(
      editing ? `/articles/categories/${form.id}` : "/articles/categories",
      { method: editing ? "PUT" : "POST", body: JSON.stringify(form) },
      editing ? "تم تحديث التصنيف" : "تم إنشاء التصنيف"
    );
    setForm(emptyCategory);
  };

  // No date range here: the list is ordered by hand and dragging only makes sense on the whole of it.
  const exportCategories = async () => {
    setExporting(true);
    try {
      await exportExcel("تصنيفات المقالات", EXPORT_COLUMNS, categories);
    } catch (error) {
      toast.error(error.message || "تعذر التصدير");
    } finally {
      setExporting(false);
    }
  };

  const onDrop = async (event, targetId) => {
    event.preventDefault();
    const draggedId = Number(event.dataTransfer.getData("categoryId"));
    if (!draggedId || draggedId === targetId) return;
    const next = [...categories];
    const from = next.findIndex((category) => category.id === draggedId);
    const to = next.findIndex((category) => category.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCategories(next);
    await action(
      "/articles/categories/reorder",
      { method: "POST", body: JSON.stringify({ items: next.map((category, index) => ({ id: category.id, sortOrder: index + 1 })) }) },
      "تم تغيير ترتيب التصنيفات"
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">تصنيفات المقالات</h1>
        <p className="text-sm text-gray-500">إدارة تصنيفات المدونة وحالتها وترتيب عرضها.</p>
      </div>

      <form onSubmit={save} className="rounded-lg bg-white p-5 shadow">
        <div className="mb-4 flex items-center gap-2 font-bold text-gray-900"><Plus size={18} />{editing ? "تعديل التصنيف" : "تصنيف جديد"}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">الاسم</span>
            <input className="mt-1 w-full rounded-md border p-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">الرابط (Slug)</span>
            <input className="mt-1 w-full rounded-md border p-2" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold">الوصف</span>
            <textarea className="mt-1 w-full rounded-md border p-2" rows="3" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">ترتيب العرض</span>
            <input type="number" className="mt-1 w-full rounded-md border p-2" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
          <label className="mt-7 flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            مفعّل
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button disabled={loading} className="rounded-md bg-primary px-5 py-2 font-semibold text-white disabled:opacity-60">{editing ? "تحديث التصنيف" : "إنشاء التصنيف"}</button>
          {editing && <button type="button" onClick={() => setForm(emptyCategory)} className="rounded-md border px-5 py-2">إلغاء</button>}
        </div>
      </form>

      <div className="rounded-lg bg-white p-5 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-500">اسحب الصفوف لحفظ ترتيب دائم للتصنيفات.</div>
          <button
            type="button"
            onClick={exportCategories}
            disabled={exporting}
            className="flex items-center gap-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            <Download size={15} /> {exporting ? "جاري التجهيز..." : "تحميل Excel"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50 text-right text-sm font-semibold text-gray-700">
              <tr>
                <th className="p-3">الترتيب</th>
                <th className="p-3">الاسم</th>
                <th className="p-3">الرابط</th>
                <th className="p-3">الوصف</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((category) => (
                <tr key={category.id} draggable onDragStart={(e) => e.dataTransfer.setData("categoryId", String(category.id))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, category.id)} className="hover:bg-gray-50">
                  <td className="p-3"><div className="flex items-center gap-2"><GripVertical className="h-5 w-5 cursor-grab text-gray-400" />{category.sortOrder}</div></td>
                  <td className="p-3 font-semibold">{category.name}</td>
                  <td className="p-3 text-gray-600">{category.slug}</td>
                  <td className="max-w-md truncate p-3 text-gray-600">{category.description || "-"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${category.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{category.isActive ? "مفعّل" : "متوقف"}</span></td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => setForm(category)} className="rounded-md border px-3 py-1 text-primary">تعديل</button>
                      <button onClick={() => action(`/articles/categories/${category.id}`, { method: "PUT", body: JSON.stringify({ ...category, isActive: !category.isActive }) })} className="rounded-md border px-3 py-1">{category.isActive ? "إيقاف" : "تفعيل"}</button>
                      <button onClick={() => window.confirm("متأكد إنك عايز تحذف التصنيف ده؟") && action(`/articles/categories/${category.id}`, { method: "DELETE" })} className="rounded-md border px-3 py-1 text-red-600">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && categories.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-500">لا توجد تصنيفات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
