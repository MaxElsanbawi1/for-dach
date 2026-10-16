import React, { useEffect, useMemo, useState } from "react";
import { Edit, Eye, GripVertical, Plus, Search, Trash2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RichTextEditor from "../../components/RichTextEditor";
import { appendEncoded } from "../../encodeField";

const API = "https://back.acit-net.com/api";
const API_ORIGIN = API.replace(/\/api\/?$/, "");
const emptyArticle = { title: "", slug: "", excerpt: "", content: "", featuredImage: "", categoryId: "", authorId: "", status: "DRAFT", isFeatured: false, sortOrder: 0, seoTitle: "", seoDescription: "", seoKeywords: "" };

function headers(json = true) {
  const token = localStorage.getItem("token");
  return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
}

function imageSrc(value) {
  const src = String(value || "").trim();
  if (!src) return "";
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;
  const uploadsIndex = src.indexOf("/uploads/");
  if (uploadsIndex !== -1) return `${API_ORIGIN}${src.slice(uploadsIndex)}`;
  if (/^https?:\/\//i.test(src)) return src;
  return `${API_ORIGIN}${src.startsWith("/") ? src : `/${src}`}`;
}

function ArticleForm({ article, categories, onCancel, onSaved }) {
  const [form, setForm] = useState(article || emptyArticle);
  const [imagePreview, setImagePreview] = useState(imageSrc(article?.featuredImage));
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(article?.id);

  useEffect(() => {
    setForm(article || emptyArticle);
    setImagePreview(imageSrc(article?.featuredImage));
    setImageFile(null);
  }, [article]);

  const setValue = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title || !form.slug || !form.content || !form.categoryId) return toast.error("العنوان والرابط والمحتوى والتصنيف حقول مطلوبة");
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => (key === "content" ? appendEncoded(payload, key, value) : payload.append(key, value ?? "")));
      if (imageFile) payload.append("featuredImage", imageFile);
      const res = await fetch(`${API}/articles${editing ? `/${article.id}` : ""}`, { method: editing ? "PUT" : "POST", headers: headers(false), body: payload });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "تعذّر حفظ المقال");
      toast.success(data.message || "تم حفظ المقال بنجاح");
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const onImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("اختر ملف صورة");
    if (file.size > 5 * 1024 * 1024) return toast.error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <form onSubmit={submit} className="rounded-lg bg-white p-5 shadow">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">{editing ? "تعديل المقال" : "مقال جديد"}</h2>
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm">رجوع</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block"><span className="text-sm font-semibold">العنوان</span><input className="mt-1 w-full rounded-md border p-2" value={form.title} onChange={(e) => { setValue("title", e.target.value); if (!editing) setValue("slug", slugify(e.target.value)); }} /></label>
        <label className="block"><span className="text-sm font-semibold">الرابط (Slug)</span><input className="mt-1 w-full rounded-md border p-2" value={form.slug} onChange={(e) => setValue("slug", slugify(e.target.value))} /></label>
        <label className="block lg:col-span-2"><span className="text-sm font-semibold">المقتطف</span><textarea className="mt-1 w-full rounded-md border p-2" rows="2" value={form.excerpt || ""} onChange={(e) => setValue("excerpt", e.target.value)} /></label>
        <div className="block lg:col-span-2">
          <span className="text-sm font-semibold">المحتوى</span>
          <div className="mt-1" dir="rtl">
            <RichTextEditor
              value={form.content || ""}
              onChange={(html) => setValue("content", html)}
              uploadUrl={`${API}/articles/content-images`}
              authHeaders={headers}
            />
          </div>
        </div>
        <label className="block"><span className="text-sm font-semibold">الصورة الرئيسية</span><input type="file" accept="image/*" className="mt-1 w-full rounded-md border p-2" onChange={onImage} /></label>
        <label className="block"><span className="text-sm font-semibold">التصنيف</span><select className="mt-1 w-full rounded-md border p-2" value={form.categoryId || ""} onChange={(e) => setValue("categoryId", e.target.value)}><option value="">اختر التصنيف</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {imagePreview && <img src={imagePreview} alt="" className="h-36 w-56 rounded-md object-cover" />}
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-sm font-semibold">الحالة</span><select className="mt-1 w-full rounded-md border p-2" value={form.status} onChange={(e) => setValue("status", e.target.value)}><option value="DRAFT">مسودة</option><option value="PUBLISHED">منشور</option></select></label>
          <label className="block"><span className="text-sm font-semibold">ترتيب العرض</span><input type="number" className="mt-1 w-full rounded-md border p-2" value={form.sortOrder || 0} onChange={(e) => setValue("sortOrder", e.target.value)} /></label>
          <label className="mt-7 flex items-center gap-2"><input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(e) => setValue("isFeatured", e.target.checked)} /> مميّز</label>
        </div>
        <label className="block"><span className="text-sm font-semibold">عنوان SEO</span><input className="mt-1 w-full rounded-md border p-2" value={form.seoTitle || ""} onChange={(e) => setValue("seoTitle", e.target.value)} /></label>
        <label className="block"><span className="text-sm font-semibold">كلمات SEO المفتاحية</span><input className="mt-1 w-full rounded-md border p-2" value={form.seoKeywords || ""} onChange={(e) => setValue("seoKeywords", e.target.value)} /></label>
        <label className="block lg:col-span-2"><span className="text-sm font-semibold">وصف SEO</span><textarea className="mt-1 w-full rounded-md border p-2" rows="2" value={form.seoDescription || ""} onChange={(e) => setValue("seoDescription", e.target.value)} /></label>
      </div>
      <button disabled={saving} className="mt-5 rounded-md bg-primary px-5 py-2 font-semibold text-white disabled:opacity-60">{saving ? "جاري الحفظ..." : "حفظ المقال"}</button>
    </form>
  );
}

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "", featured: "", categoryId: "", page: 1 });
  const [total, setTotal] = useState(0);
  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "")).toString(), [filters]);

  const load = async () => {
    setLoading(true);
    try {
      const [articlesRes, categoriesRes] = await Promise.all([fetch(`${API}/articles?limit=20&${query}`, { headers: headers() }), fetch(`${API}/articles/categories`, { headers: headers() })]);
      const articleData = await articlesRes.json().catch(() => ({}));
      const categoryData = await categoriesRes.json().catch(() => ([]));
      if (!articlesRes.ok) throw new Error(articleData.message || `تعذّر تحميل المقالات (${articlesRes.status})`);
      setArticles(articleData.data || []);
      setTotal(articleData.total || 0);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [query]);

  const action = async (path, options = {}, success) => {
    try {
      const res = await fetch(`${API}${path}`, { headers: headers(), ...options });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "فشل تنفيذ الطلب");
      toast.success(success || data.message);
      setSelected([]);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onDrop = async (event, targetId) => {
    event.preventDefault();
    const draggedId = Number(event.dataTransfer.getData("articleId"));
    if (!draggedId || draggedId === targetId) return;
    const next = [...articles];
    const from = next.findIndex((a) => a.id === draggedId);
    const to = next.findIndex((a) => a.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setArticles(next);
    await action("/articles/reorder", { method: "POST", body: JSON.stringify({ items: next.map((a, index) => ({ id: a.id, sortOrder: index + 1 })) }) }, "تم تغيير ترتيب المقالات");
  };

  if (showForm) return <><ToastContainer /><ArticleForm article={editing} categories={categories} onCancel={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); load(); }} /></>;

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer />
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900">المقالات</h1><p className="text-sm text-gray-500">إنشاء المقالات ونشرها وفلترتها وإعادة ترتيبها.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-white"><Plus size={18} />مقال جديد</button></div>
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2"><Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" /><input className="w-full rounded-md border p-2 pr-9" placeholder="بحث في المقالات..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} /></div>
          <select className="rounded-md border p-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}><option value="">كل الحالات</option><option value="PUBLISHED">منشور</option><option value="DRAFT">مسودة</option></select>
          <select className="rounded-md border p-2" value={filters.featured} onChange={(e) => setFilters({ ...filters, featured: e.target.value, page: 1 })}><option value="">المميّز</option><option value="true">المميّزة فقط</option></select>
          <select className="rounded-md border p-2" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}><option value="">كل التصنيفات</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        {selected.length > 0 && <div className="mb-3 flex flex-wrap gap-2 rounded-md bg-gray-50 p-3"><button onClick={() => action("/articles/bulk", { method: "POST", body: JSON.stringify({ ids: selected, action: "publish" }) })} className="rounded-md border px-3 py-1">نشر المحدد</button><button onClick={() => action("/articles/bulk", { method: "POST", body: JSON.stringify({ ids: selected, action: "unpublish" }) })} className="rounded-md border px-3 py-1">إلغاء نشر المحدد</button><button onClick={() => window.confirm("متأكد إنك عايز تحذف المقالات المحددة؟") && action("/articles/bulk", { method: "POST", body: JSON.stringify({ ids: selected, action: "delete" }) })} className="rounded-md border px-3 py-1 text-red-600">حذف المحدد</button></div>}
        <div className="overflow-x-auto"><table className="min-w-full divide-y"><thead className="bg-gray-50 text-right text-sm font-semibold text-gray-700"><tr><th className="p-3"><input type="checkbox" checked={selected.length === articles.length && articles.length > 0} onChange={(e) => setSelected(e.target.checked ? articles.map((a) => a.id) : [])} /></th><th className="p-3">الترتيب</th><th className="p-3">الصورة</th><th className="p-3">العنوان</th><th className="p-3">التصنيف</th><th className="p-3">الحالة</th><th className="p-3">مميّز</th><th className="p-3">المشاهدات</th><th className="p-3">التاريخ</th><th className="p-3">إجراءات</th></tr></thead><tbody className="divide-y">
          {articles.map((article) => <tr key={article.id} draggable onDragStart={(e) => e.dataTransfer.setData("articleId", String(article.id))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, article.id)} className="hover:bg-gray-50"><td className="p-3"><input type="checkbox" checked={selected.includes(article.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, article.id] : prev.filter((id) => id !== article.id))} /></td><td className="p-3"><GripVertical className="h-5 w-5 cursor-grab text-gray-400" />{article.sortOrder}</td><td className="p-3">{imageSrc(article.featuredImage) ? <img src={imageSrc(article.featuredImage)} alt="" className="h-12 w-16 rounded object-cover" /> : "-"}</td><td className="min-w-60 p-3"><div className="font-semibold text-gray-900">{article.title}</div><div className="text-xs text-gray-500">{article.slug}</div></td><td className="p-3">{article.category?.name || "-"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${article.status === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{article.status === "PUBLISHED" ? "منشور" : "مسودة"}</span></td><td className="p-3">{article.isFeatured ? "نعم" : "لا"}</td><td className="p-3">{article.views}</td><td className="p-3">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "-"}</td><td className="p-3"><div className="flex gap-2"><button title="معاينة" onClick={() => window.open(`/articles/${article.slug}`, "_blank")}><Eye size={17} /></button><button title="تعديل" onClick={() => { setEditing(article); setShowForm(true); }}><Edit size={17} /></button><button onClick={() => action(`/articles/${article.id}/${article.status === "PUBLISHED" ? "unpublish" : "publish"}`, { method: "POST" })} className="text-sm text-primary">{article.status === "PUBLISHED" ? "إلغاء النشر" : "نشر"}</button><button title="حذف" onClick={() => window.confirm("متأكد إنك عايز تحذف المقال ده؟") && action(`/articles/${article.id}`, { method: "DELETE" })} className="text-red-600"><Trash2 size={17} /></button></div></td></tr>)}
          {!loading && articles.length === 0 && <tr><td colSpan="10" className="p-8 text-center text-gray-500">لا توجد مقالات</td></tr>}
        </tbody></table></div>
        <div className="mt-4 flex items-center justify-between text-sm"><span>الإجمالي: {total}</span><div className="flex gap-2"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="rounded border px-3 py-1 disabled:opacity-40">السابق</button><span className="px-2 py-1">{filters.page}</span><button disabled={filters.page * 20 >= total} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="rounded border px-3 py-1 disabled:opacity-40">التالي</button></div></div>
      </div>
    </div>
  );
}
