import { useCallback, useEffect, useState } from "react";

const API = " https://back.acit-net.com/api";
const initial = {
  Title: "",
  Content: "",
  VideoURL: "",
  Order: 0,
  DurationMinutes: 0,
  IsPublished: false,
};

export default function LessonsManager({ courseId }) {
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [lessonFiles, setLessonFiles] = useState({});
  const [uploading, setUploading] = useState({});

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "تعذر تنفيذ الطلب");
    return data;
  }, []);

  const load = useCallback(
    () =>
      request(`/lessons/course/${courseId}`)
        .then(setLessons)
        .catch((error) => setMessage(error.message)),
    [courseId, request]
  );

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await request(editing ? `/lessons/${editing}` : "/lessons", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          CourseID: Number(courseId),
          Order: Number(form.Order),
          DurationMinutes: Number(form.DurationMinutes),
        }),
      });
      setForm(initial);
      setEditing(null);
      setMessage("تم حفظ الدرس");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const edit = async (id) => {
    try {
      const lesson = await request(`/lessons/${id}`);
      setEditing(id);
      setForm({
        Title: lesson.Title || "",
        Content: lesson.Content || "",
        VideoURL: lesson.VideoURL || "",
        Order: lesson.Order || 0,
        DurationMinutes: lesson.DurationMinutes || 0,
        IsPublished: Boolean(lesson.IsPublished),
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("هل تريد حذف الدرس؟")) return;
    try {
      await request(`/lessons/${id}`, { method: "DELETE" });
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const uploadLessonFiles = async (lessonId) => {
    const files = Array.from(lessonFiles[lessonId] || []);
    if (files.length === 0) {
      setMessage("اختار ملف واحد على الأقل للدرس");
      return;
    }

    setUploading((prev) => ({ ...prev, [lessonId]: true }));
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API}/lessons/${lessonId}/materials`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "تعذر رفع ملف الدرس");
      }

      setLessonFiles((prev) => ({ ...prev, [lessonId]: [] }));
      setMessage("تم رفع ملفات الدرس بنجاح");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading((prev) => ({ ...prev, [lessonId]: false }));
    }
  };

  return (
    <section dir="rtl" className="my-6 rounded-lg border bg-slate-50 p-4">
      <h3 className="mb-4 text-xl font-bold text-primary">إدارة دروس الدورة</h3>
      <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
        <input
          required
          className="rounded border p-2"
          placeholder="عنوان الدرس"
          value={form.Title}
          onChange={(e) => setForm({ ...form, Title: e.target.value })}
        />
        <input
          className="rounded border p-2"
          placeholder="رابط الفيديو"
          value={form.VideoURL}
          onChange={(e) => setForm({ ...form, VideoURL: e.target.value })}
        />
        <input
          type="number"
          className="rounded border p-2"
          placeholder="الترتيب"
          value={form.Order}
          onChange={(e) => setForm({ ...form, Order: e.target.value })}
        />
        <input
          type="number"
          className="rounded border p-2"
          placeholder="المدة بالدقائق"
          value={form.DurationMinutes}
          onChange={(e) => setForm({ ...form, DurationMinutes: e.target.value })}
        />
        <textarea
          className="rounded border p-2 md:col-span-2"
          rows="4"
          placeholder="محتوى الدرس"
          value={form.Content}
          onChange={(e) => setForm({ ...form, Content: e.target.value })}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.IsPublished}
            onChange={(e) => setForm({ ...form, IsPublished: e.target.checked })}
          />
          نشر للطلاب
        </label>
        <button className="rounded bg-primary px-5 py-2 text-white">
          {editing ? "حفظ التعديل" : "إضافة الدرس"}
        </button>
      </form>

      {message && <p className="mt-3 rounded bg-blue-50 p-3 text-blue-900">{message}</p>}

      <div className="mt-4 space-y-3">
        {lessons.map((lesson) => (
          <div key={lesson.LessonID} className="rounded border bg-white p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <b>
                {lesson.Order}. {lesson.Title} ({lesson.DurationMinutes} دقيقة)
              </b>
              <span className="flex gap-2">
                <button className="text-blue-600" onClick={() => edit(lesson.LessonID)}>
                  تعديل
                </button>
                <button className="text-red-600" onClick={() => remove(lesson.LessonID)}>
                  حذف
                </button>
              </span>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <input
                type="file"
                multiple
                onChange={(e) =>
                  setLessonFiles((prev) => ({
                    ...prev,
                    [lesson.LessonID]: e.target.files,
                  }))
                }
                className="rounded border p-2"
              />
              <button
                type="button"
                onClick={() => uploadLessonFiles(lesson.LessonID)}
                disabled={uploading[lesson.LessonID]}
                className="rounded bg-secondary px-4 py-2 font-bold text-white disabled:opacity-60"
              >
                {uploading[lesson.LessonID] ? "جاري الرفع..." : "رفع ملفات الدرس"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
