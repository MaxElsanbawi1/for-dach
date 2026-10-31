import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

const API = 'https://back.acit-net.com/api';

const TYPE_LABELS = {
  SINGLE: 'اختيار واحد',
  MULTI: 'اختيار متعدد',
  TEXT: 'إجابة نصية',
};

const emptyQuestion = {
  question: '',
  answer_type: 'SINGLE',
  // One entry per choice. A single textarea made every option share a box,
  // which is awkward to reorder and easy to mangle by hitting Enter.
  options: [''],
  is_required: false,
  is_active: true,
  sort_order: 0,
};

export default function OnboardingQuestions() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const authHeaders = (json = false) => {
    const token = localStorage.getItem('token');
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/onboarding/questions/all`, { headers: authHeaders() });
      // Parse defensively: an auth failure returns HTML from the proxy, not JSON.
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'انتهت صلاحية الجلسة أو حسابك غير مصرّح له — سجّل خروج ثم دخول مرة أخرى.'
          );
        }
        throw new Error(data.message || `تعذّر تحميل الأسئلة (${response.status})`);
      }
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    // A fresh array each time, or every reset would hand back the same one.
    setForm({ ...emptyQuestion, options: [''] });
    setEditingId(null);
  };

  const setOption = (index, value) =>
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => (i === index ? value : o)),
    }));

  const addOption = () => setForm((prev) => ({ ...prev, options: [...prev.options, ''] }));

  const removeOption = (index) =>
    setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        // A blank row is an unfinished field, not a choice.
        options: form.options.map((o) => o.trim()).filter(Boolean),
        sort_order: Number(form.sort_order) || 0,
      };
      const response = await fetch(
        editingId ? `${API}/onboarding/questions/${editingId}` : `${API}/onboarding/questions`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'تعذّر الحفظ');
      setNotice(data.message || 'تم الحفظ');
      reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({
      question: row.question,
      answer_type: row.answer_type,
      options: (row.options || []).length ? [...row.options] : [''],
      is_required: row.is_required,
      is_active: row.is_active,
      sort_order: row.sort_order,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!window.confirm('متأكد إنك عايز تحذف السؤال ده؟ الإجابات القديمة هتفضل محفوظة.')) return;
    try {
      const response = await fetch(`${API}/onboarding/questions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error('تعذّر الحذف');
      if (editingId === id) reset();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (row) => {
    try {
      const response = await fetch(`${API}/onboarding/questions/${row.id}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({
          question: row.question,
          answer_type: row.answer_type,
          options: row.options,
          is_required: row.is_required,
          is_active: !row.is_active,
          sort_order: row.sort_order,
        }),
      });
      if (!response.ok) throw new Error('تعذّر تغيير الحالة');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const needsOptions = form.answer_type !== 'TEXT';

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">أسئلة التعريف بالزائر</h2>
            <p className="mt-1 text-sm text-gray-500">
              الأسئلة اللي بتظهر لزوّار الموقع أول مرة. رتّبها وفعّلها وعدّلها من هنا —
              مفيش حاجة تتغيّر في الكود.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>

        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold">نص السؤال</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="مثال: إيه المجال اللي يهمك؟"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">نوع الإجابة</span>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
              value={form.answer_type}
              onChange={(e) => setForm({ ...form, answer_type: e.target.value })}
            >
              <option value="SINGLE">اختيار واحد</option>
              <option value="MULTI">اختيار متعدد</option>
              <option value="TEXT">إجابة نصية</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">ترتيب الظهور</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            />
          </label>

          {needsOptions && (
            <div className="md:col-span-2">
              <span className="text-sm font-semibold">الخيارات</span>
              <div className="mt-2 space-y-2">
                {form.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
                    <input
                      className="flex-1 rounded-md border border-gray-300 p-2"
                      value={option}
                      onChange={(e) => setOption(index, e.target.value)}
                      placeholder={`الخيار ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      // The last field stays: a choice question with no field at
                      // all would leave nothing to type into.
                      disabled={form.options.length === 1}
                      className="rounded border p-2 text-red-600 disabled:opacity-30"
                      title="حذف الخيار"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1 rounded border px-3 py-1 text-sm text-primary"
              >
                <Plus size={14} />
                إضافة خيار
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              />
              سؤال إجباري
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              مفعّل
            </label>
          </div>

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-semibold text-white disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? 'جاري الحفظ...' : editingId ? 'تحديث السؤال' : 'إضافة السؤال'}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="rounded-md border px-5 py-2">
                إلغاء
              </button>
            )}
          </div>
        </form>

        {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
        {notice && <p className="mt-4 rounded bg-green-50 p-3 text-green-700">{notice}</p>}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading && <p className="py-8 text-center text-gray-500">جاري التحميل...</p>}

        {!loading && rows.length === 0 && (
          <div className="rounded bg-gray-50 p-8 text-center text-gray-600">
            لا توجد أسئلة — ولذلك لا تظهر أي نافذة للزوّار.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-right text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="border p-3">الترتيب</th>
                  <th className="border p-3">السؤال</th>
                  <th className="border p-3">النوع</th>
                  <th className="border p-3">الخيارات</th>
                  <th className="border p-3">إجباري</th>
                  <th className="border p-3">الحالة</th>
                  <th className="border p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-gray-50">
                    <td className="border p-3">{row.sort_order}</td>
                    <td className="border p-3 font-semibold">{row.question}</td>
                    <td className="border p-3 whitespace-nowrap">
                      {TYPE_LABELS[row.answer_type] || row.answer_type}
                    </td>
                    <td className="border p-3">
                      {row.options.length === 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <ul className="list-inside list-disc text-gray-600">
                          {row.options.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="border p-3">{row.is_required ? 'نعم' : 'لا'}</td>
                    <td className="border p-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(row)}
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          row.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {row.is_active ? 'مفعّل' : 'متوقف'}
                      </button>
                    </td>
                    <td className="border p-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => edit(row)}
                        className="text-primary hover:underline"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
