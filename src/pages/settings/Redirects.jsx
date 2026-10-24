import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Trash2, Plus } from 'lucide-react';
import { API } from '../tax/taxApi';

// "تحويل الروابط": an old site URL that should open a new one (acit-back
// services/redirects.js). Renaming a course adds its row by itself; this page
// is for checking them and for any other page that moved. The site follows
// them right away, and the next build turns each into a 301 for Google.
const SITE = 'https://acit.edu.sa';

const api = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `خطأ ${res.status}`);
  return data;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('ar-EG', { dateStyle: 'medium' }) : '';

export default function Redirects() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fromPath: '', toPath: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    api(`/redirects?t=${Date.now()}`)
      .then((d) => {
        setRows(Array.isArray(d) ? d : []);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api('/redirects', { method: 'POST', body: JSON.stringify(form) });
      setForm({ fromPath: '', toPath: '', note: '' });
      setMessage('تم حفظ التحويل.');
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`حذف التحويل من ${row.fromPath}؟ الرابط القديم هيفتح «الصفحة غير موجودة».`)) return;
    try {
      await api(`/redirects/${row.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const input = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <ArrowLeftRight className="text-primary" />
        <h1 className="text-2xl font-bold text-gray-800">تحويل الروابط</h1>
      </div>
      <p className="max-w-3xl text-sm text-gray-600">
        لما رابط صفحة يتغير، الرابط القديم بيفتح الجديد بدل «الصفحة غير موجودة». تغيير اسم دورة بيضيف التحويل هنا لوحده،
        والصفحة دي لأي رابط تاني اتنقل. الموقع بيطبّق التحويل على طول، وجوجل بيشوفه بعد الـ build الجاي للموقع.
      </p>

      <form onSubmit={add} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">الرابط القديم</span>
          <input
            dir="ltr"
            className={input}
            value={form.fromPath}
            onChange={(e) => setForm({ ...form, fromPath: e.target.value })}
            placeholder="/courses/old-name"
            required
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">الرابط الجديد</span>
          <input
            dir="ltr"
            className={input}
            value={form.toPath}
            onChange={(e) => setForm({ ...form, toPath: e.target.value })}
            placeholder="/courses/new-name"
            required
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">ملاحظة (اختياري)</span>
          <input className={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Plus size={16} /> {saving ? 'جاري الحفظ...' : 'إضافة'}
        </button>
        <p className="text-xs text-gray-500 md:col-span-4">
          تقدر تلصق الرابط كامل (https://acit.edu.sa/...) أو تكتبه من أول «/».
        </p>
        {message && <p className="text-sm text-gray-700 md:col-span-4">{message}</p>}
      </form>

      {error && <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-right">الرابط القديم</th>
              <th className="px-4 py-2 text-right">يفتح</th>
              <th className="px-4 py-2 text-right">ملاحظة</th>
              <th className="px-4 py-2 text-right">التاريخ</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">مفيش تحويلات.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2" dir="ltr" style={{ textAlign: 'right' }}>
                  {r.fromPath}
                </td>
                <td className="px-4 py-2" dir="ltr" style={{ textAlign: 'right' }}>
                  <a href={SITE + r.toPath} target="_blank" rel="noopener" className="text-primary hover:underline">
                    {r.toPath}
                  </a>
                </td>
                <td className="px-4 py-2 text-gray-600">{r.note}</td>
                <td className="px-4 py-2 text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-2 text-left">
                  <button type="button" onClick={() => remove(r)} className="rounded p-1 text-red-600 hover:bg-red-50" title="حذف">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
