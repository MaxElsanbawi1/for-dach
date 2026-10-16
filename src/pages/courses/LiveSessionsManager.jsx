import { useCallback, useEffect, useState } from "react";

const initial = { Title: "", Description: "", ScheduledStart: "", ScheduledEnd: "", MeetingURL: "", Platform: "zoom" };

export default function LiveSessionsManager({ courseId }) {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(` https://back.acit-net.com/api${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json", ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || "تعذر تنفيذ الطلب");
    return data;
  }, []);

  const load = useCallback(() => request(`/live-sessions/course/${courseId}`).then(setSessions).catch((e) => setMessage(e.message)), [courseId, request]);
  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      await request(editing ? `/live-sessions/${editing}` : "/live-sessions", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...form, CourseID: Number(courseId) }),
      });
      setForm(initial); setEditing(null); setMessage("تم حفظ الجلسة المباشرة"); load();
    } catch (error) { setMessage(error.message); }
  };

  const edit = (session) => {
    const localDate = (value) => value ? new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setEditing(session.SessionID);
    setForm({ Title: session.Title, Description: session.Description || "", ScheduledStart: localDate(session.ScheduledStart), ScheduledEnd: localDate(session.ScheduledEnd), MeetingURL: session.MeetingURL || "", Platform: session.Platform || "zoom" });
  };

  const remove = async (id) => {
    if (!confirm("هل تريد حذف الجلسة المباشرة؟")) return;
    try { await request(`/live-sessions/${id}`, { method: "DELETE" }); load(); } catch (error) { setMessage(error.message); }
  };

  return <section dir="rtl" className="my-6 rounded-lg border bg-slate-50 p-4">
    <h3 className="mb-4 text-xl font-bold text-primary">إدارة الجلسات المباشرة</h3>
    <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
      <input required className="rounded border p-2" placeholder="عنوان الجلسة" value={form.Title} onChange={(e) => setForm({ ...form, Title: e.target.value })} />
      <input required className="rounded border p-2" placeholder="رابط الاجتماع" value={form.MeetingURL} onChange={(e) => setForm({ ...form, MeetingURL: e.target.value })} />
      <input required type="datetime-local" className="rounded border p-2" value={form.ScheduledStart} onChange={(e) => setForm({ ...form, ScheduledStart: e.target.value })} />
      <input required type="datetime-local" className="rounded border p-2" value={form.ScheduledEnd} onChange={(e) => setForm({ ...form, ScheduledEnd: e.target.value })} />
      <select className="rounded border p-2" value={form.Platform} onChange={(e) => setForm({ ...form, Platform: e.target.value })}><option value="zoom">Zoom</option><option value="teams">Microsoft Teams</option><option value="meet">Google Meet</option><option value="other">أخرى</option></select>
      <textarea className="rounded border p-2" placeholder="وصف الجلسة" value={form.Description} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
      <button className="rounded bg-primary px-5 py-2 text-white">{editing ? "حفظ التعديل" : "إضافة الجلسة"}</button>
    </form>
    {message && <p className="mt-3">{message}</p>}
    <div className="mt-4 space-y-2">{sessions.map((session) => <div key={session.SessionID} className="flex flex-wrap justify-between gap-2 rounded border bg-white p-3"><div><b>{session.Title}</b><small className="block">{new Date(session.ScheduledStart).toLocaleString("ar-EG")} - {session.computedStatus}</small></div><span className="flex gap-3"><button className="text-blue-600" onClick={() => edit(session)}>تعديل</button><button className="text-red-600" onClick={() => remove(session.SessionID)}>حذف</button></span></div>)}</div>
  </section>;
}
