// SEO fields for a course, shown on the add and edit forms. What is entered
// here becomes the course page's Google title/description, its WhatsApp/X
// preview image and its FAQ section on acit.edu.sa. Empty fields fall back to
// the course name, description and image.
import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { mediaSrc } from "../../mediaSrc";

export const EMPTY_SEO = {
  // The course URL. Edit form only (seoFromCourse fills it); a new course
  // gets its URL from its name, or from the other runs of the same course.
  Slug: undefined,
  SeoTitle: "",
  MetaDescription: "",
  SeoH1: "",
  SeoIntro: "",
  ImageAlt: "",
  Faq: [], // [{ q, a }]
  OgImage: "", // saved image URL
  ogImageFile: null, // newly picked file, uploaded on save
};

/** Stored FAQ is JSON [{ q, a }]; older entries may be "question | answer" lines. */
export function parseFaq(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((f) => ({ q: f.q || "", a: f.a || "" }));
  } catch {
    /* plain-text format below */
  }
  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.split("|"))
    .filter((parts) => parts.length >= 2 && parts[0].trim())
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join("|").trim() }));
}

export const seoFromCourse = (c = {}) => ({
  SeoTitle: c.SeoTitle || "",
  MetaDescription: c.MetaDescription || "",
  Slug: c.Slug || "",
  SeoH1: c.SeoH1 || "",
  SeoIntro: c.SeoIntro || "",
  ImageAlt: c.ImageAlt || "",
  Faq: parseFaq(c.Faq),
  OgImage: c.OgImage || "",
  ogImageFile: null,
});

/** Adds the fields to a course FormData. The FAQ is encoded like the
 *  description (the API firewall rejects some raw text). */
export function appendSeo(formData, seo, appendEncoded) {
  formData.append("SeoTitle", seo.SeoTitle.trim());
  formData.append("MetaDescription", seo.MetaDescription.trim());
  if (typeof seo.Slug === "string") appendEncoded(formData, "Slug", seo.Slug.trim());
  appendEncoded(formData, "SeoH1", seo.SeoH1.trim());
  appendEncoded(formData, "SeoIntro", seo.SeoIntro.trim());
  appendEncoded(formData, "ImageAlt", seo.ImageAlt.trim());
  const faq = seo.Faq.map((f) => ({ q: f.q.trim(), a: f.a.trim() })).filter((f) => f.q && f.a);
  appendEncoded(formData, "Faq", faq.length ? JSON.stringify(faq) : "");
  if (seo.ogImageFile) formData.append("ogImage", seo.ogImageFile);
  else formData.append("OgImage", seo.OgImage); // "" removes the image
}

const Counter = ({ value, min, max }) => {
  const n = value.trim().length;
  const ok = n === 0 || (n >= min && n <= max);
  return (
    <span className={`text-xs ${ok ? "text-gray-500" : "text-red-600"}`}>
      {n} / {min}-{max} حرف
    </span>
  );
};

/** First sentence and image alt made from the course name and mode, in
 *  the shape the keyword plan uses ("دورة … في جدة"). */
export function autoSeoFor(courseName = "", courseType = "OnSite") {
  const name = String(courseName).trim().replace(/^دورة\s+/, "");
  if (!name) return { SeoIntro: "", ImageAlt: "" };
  return {
    SeoIntro:
      courseType === "Online"
        ? `يقدّم معهد ACIT للتدريب دورة ${name} أونلاين مباشر مع المدرب.`
        : `يقدّم معهد ACIT للتدريب في جدة دورة ${name} حضورياً في مقر المعهد.`,
    ImageAlt: `دورة ${name} في جدة - معهد ACIT`,
  };
}

/** A course URL segment from text. Same rules as courseSlug in
 *  acit-front/src/utils/urls.js and acit-back/services/redirects.js. */
export function courseSlug(text = "") {
  return String(text)
    .normalize("NFC")
    .replace(/[\p{M}ـ]/gu, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/#/g, " sharp ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200)
    .replace(/-+$/, "");
}

export default function CourseSeoFields({ value, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const [dragging, setDragging] = useState(false);
  const pickImage = (file) => {
    if (file && file.type.startsWith("image/")) onChange({ ...value, ogImageFile: file });
  };
  const input = "w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none";

  const setFaq = (faq) => onChange({ ...value, Faq: faq });
  const updateFaq = (i, key, text) => setFaq(value.Faq.map((f, j) => (j === i ? { ...f, [key]: text } : f)));
  const addFaq = () => setFaq([...value.Faq, { q: "", a: "" }]);
  const removeFaq = (i) => setFaq(value.Faq.filter((_, j) => j !== i));

  const preview = value.ogImageFile
    ? URL.createObjectURL(value.ogImageFile)
    : value.OgImage
      ? mediaSrc(value.OgImage)
      : "";

  return (
    <fieldset className="col-span-full rounded-xl border border-gray-200 p-4">
      <legend className="px-2 text-lg font-bold">الظهور في قوقل والمشاركة (SEO)</legend>
      <p className="mb-4 text-sm text-gray-500">
        اختيارية. إن تُركت فارغة يُستخدم اسم الدورة ووصفها وصورتها.
      </p>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between">
          <label className="font-medium">عنوان الصفحة في قوقل</label>
          <Counter value={value.SeoTitle} min={30} max={60} />
        </div>
        <input
          className={input}
          value={value.SeoTitle}
          onChange={set("SeoTitle")}
          placeholder="مثال: دورة CCNA 200-301 المعتمدة في جدة | معهد ACIT"
        />
      </div>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between">
          <label className="font-medium">الوصف المختصر في نتائج البحث</label>
          <Counter value={value.MetaDescription} min={120} max={160} />
        </div>
        <textarea
          className={input}
          rows={3}
          value={value.MetaDescription}
          onChange={set("MetaDescription")}
          placeholder="جملتان تلخصان الدورة: لمن هي، مدتها، الشهادة التي تؤهل لها، وطريقة الحضور."
        />
      </div>

      {typeof value.Slug === "string" && (
      <div className="mb-4">
        <label className="mb-1 block font-medium">الرابط (Slug)</label>
        <div className="flex items-stretch" dir="ltr">
          <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-2 text-sm text-gray-500">
            acit.edu.sa/courses/
          </span>
          <input
            className={`${input} rounded-l-none`}
            value={value.Slug}
            onChange={(e) =>
              onChange({
                ...value,
                // Same shape the API stores: lowercase words joined by "-".
                Slug: e.target.value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+/, ""),
              })
            }
            placeholder="ccna-200-301"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          بيتعمل لوحده من العنوان (H1) وأنت بتكتبه، وتقدر تعدّله بإيدك. لو فضل فاضي بيتعمل من اسم الدورة. لو اتغيّر، الرابط القديم بيتحوّل للجديد لوحده (الإعدادات ← تحويل الروابط)، وبيتطبّق على كل مواعيد الدورة.
        </p>
      </div>
      )}

      <div className="mb-4">
        <label className="mb-1 block font-medium">العنوان الظاهر في الصفحة (H1)</label>
        <input
          className={input}
          value={value.SeoH1}
          onChange={(e) => {
            const h1 = e.target.value;
            // The URL follows the H1 while it still matches it (or is empty);
            // once someone types their own URL, the H1 leaves it alone.
            const follows =
              typeof value.Slug === "string" && (!value.Slug || value.Slug === courseSlug(value.SeoH1));
            onChange({ ...value, SeoH1: h1, ...(follows && { Slug: courseSlug(h1) }) });
          }}
          placeholder="اتركه فاضي ليظهر اسم الدورة. مثال: دورة CCNA في جدة"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block font-medium">أول جملة في الصفحة</label>
        <textarea
          className={input}
          rows={2}
          value={value.SeoIntro}
          onChange={set("SeoIntro")}
          placeholder="جملة فيها الكلمة الرئيسية، تظهر تحت العنوان مباشرة."
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block font-medium">وصف صورة الدورة (Alt)</label>
        <input
          className={input}
          value={value.ImageAlt}
          onChange={set("ImageAlt")}
          placeholder="مثال: دورة CCNA في جدة - معهد ACIT"
        />
      </div>

      <div className="mb-4">
        <label className="mb-2 block font-medium">الأسئلة الشائعة</label>
        {value.Faq.length === 0 && (
          <p className="mb-2 text-sm text-gray-500">لا توجد أسئلة بعد.</p>
        )}
        <div className="space-y-3">
          {value.Faq.map((f, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600">سؤال {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeFaq(i)}
                  className="text-sm text-red-600 hover:underline"
                >
                  حذف
                </button>
              </div>
              <input
                className={`${input} mb-2`}
                value={f.q}
                onChange={(e) => updateFaq(i, "q", e.target.value)}
                placeholder="السؤال، مثال: ما مدة الدورة؟"
              />
              <textarea
                className={input}
                rows={2}
                value={f.a}
                onChange={(e) => updateFaq(i, "a", e.target.value)}
                placeholder="الجواب، مثال: 40 ساعة على 5 أيام"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addFaq}
          className="mt-3 rounded-lg border border-blue-600 px-4 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          + إضافة سؤال
        </button>
        <p className="mt-1 text-xs text-gray-500">تظهر في صفحة الدورة تحت عنوان «الأسئلة الشائعة».</p>
      </div>

      <div>
        <label htmlFor="ogImage" className="block text-sm font-medium text-primary mb-1">
          صورة المشاركة (واتساب / X)
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickImage(e.dataTransfer.files && e.dataTransfer.files[0]);
          }}
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
            dragging ? "border-secondary bg-blue-50" : "border-gray-300"
          }`}
        >
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="ogImage"
                className="relative cursor-pointer bg-white rounded-md font-medium text-secondary hover:text-primary focus-within:outline-none"
              >
                <span>اختر صورة</span>
                <input
                  id="ogImage"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={(e) => {
                    pickImage(e.target.files && e.target.files[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="pr-1">أو قم بسحب وإفلات</p>
            </div>
            <p className="text-xs text-gray-500">المقاس المفضل 1200×630 · اتركها فارغة لاستخدام صورة الدورة</p>
          </div>
        </div>
        {preview && (
          <div className="mt-3 flex items-start gap-3">
            <img src={preview} alt="صورة المشاركة" className="h-32 object-cover rounded-md" />
            <button
              type="button"
              onClick={() => onChange({ ...value, OgImage: "", ogImageFile: null })}
              className="text-sm text-red-600 hover:underline"
            >
              إزالة الصورة
            </button>
          </div>
        )}
      </div>
    </fieldset>
  );
}
