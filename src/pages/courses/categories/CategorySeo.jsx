import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileUp, Check, ExternalLink } from 'lucide-react';
import { API as RAW_API } from '../../tax/taxApi';
import { toBase64 } from '../../../encodeField';

// "SEO الأقسام": each course category's Google title and description, its H1,
// and the text shown above its course list on acit.edu.sa (intro, "من أين
// تبدأ؟", "لماذا ACIT؟", call to contact). One category at a time; empty
// fields fall back to the category name on the site. "استيراد من Excel" reads
// the content sheet (one row per category, matched by the id in its link).

const API = RAW_API.trim();
const SITE = 'https://acit.edu.sa';

export const SEO_FIELDS = ['SeoTitle', 'MetaDescription', 'SeoH1', 'SeoIntro', 'SeoStartHeading', 'SeoStart', 'SeoWhy', 'SeoCta'];
const DEFAULT_START_HEADING = 'من أين تبدأ؟';

const seoOf = (c = {}) => Object.fromEntries(SEO_FIELDS.map((f) => [f, c[f] || '']));
const filledCount = (c) => SEO_FIELDS.filter((f) => String(c[f] || '').trim()).length;

// Same slug rule as acit-front/src/utils/urls.js, for the "open page" link.
const slugify = (text = '') =>
  String(text).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\+/g, ' plus ').replace(/#/g, ' sharp ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-');
const pageUrl = (c) => {
  const slug = slugify(c.CategoryName);
  return `${SITE}/categories/${slug ? `${c.CategoryID}-${slug}` : c.CategoryID}`;
};

async function saveSeo(id, seo) {
  // Base64, as the firewall in front of the API rejects some prose.
  const body = Object.fromEntries(SEO_FIELDS.map((f) => [`${f}__b64`, toBase64(String(seo[f] || '').trim())]));
  const res = await fetch(`${API}/categories/${id}/seo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `خطأ ${res.status}`);
}

// --- Excel import -----------------------------------------------------------

const cellText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
    if (v.text !== undefined) return cellText(v.text);
    if (v.result !== undefined) return cellText(v.result);
    if (v.hyperlink) return String(v.hyperlink);
    return '';
  }
  return String(v).trim();
};

// Header text -> field. Checked in order; "طول Title" is a length column, not the title.
const COLUMNS = [
  ['link', (h) => h === 'الرابط'],
  ['SeoTitle', (h) => h === 'title'],
  ['MetaDescription', (h) => h === 'meta description'],
  ['SeoH1', (h) => h === 'h1'],
  ['SeoIntro', (h) => h.includes('فقرة تعريفية')],
  ['SeoStart', (h) => h.includes('من أين تبدأ')],
  ['SeoWhy', (h) => h.includes('لماذا acit')],
  ['SeoCta', (h) => h.includes('دعوة للتواصل')],
];

/** Rows of the sheet as { id, seo }, id taken from ".../categories/16-security". */
async function readSheet(file) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const out = [];
  wb.eachSheet((ws) => {
    let cols = null;
    ws.eachRow((row) => {
      const values = row.values.map(cellText); // 1-based
      if (!cols) {
        const map = {};
        values.forEach((h, i) => {
          const hit = COLUMNS.find(([key, test]) => !(key in map) && test(h.toLowerCase()));
          if (hit) map[hit[0]] = i;
        });
        if (map.link && map.SeoTitle) cols = map;
        return;
      }
      const link = values[cols.link] || '';
      const id = (link.match(/\/categories\/(\d+)/) || [])[1];
      const seo = {};
      for (const [key] of COLUMNS) if (key !== 'link' && cols[key]) seo[key] = values[cols[key]] || '';
      // "من أين تبدأ؟ ..." / "لمن هذه الدورات؟ ...": the opening question is the heading.
      const start = (seo.SeoStart || '').match(/^\s*([^.؟?:]{3,40}[؟?])\s*/);
      if (start) {
        seo.SeoStartHeading = start[1];
        seo.SeoStart = seo.SeoStart.slice(start[0].length);
      }
      seo.SeoWhy = (seo.SeoWhy || '').replace(/^\s*لماذا\s*ACIT\s*[؟?]\s*/i, '');
      out.push({ id: id ? Number(id) : null, link, name: values[1] || link, seo });
    });
  });
  return out;
}

// --- UI ---------------------------------------------------------------------

const Counter = ({ value, min, max }) => {
  const n = value.trim().length;
  const ok = n === 0 || (n >= min && n <= max);
  return (
    <span className={`text-xs ${ok ? 'text-gray-500' : 'text-red-600'}`}>
      {n} / {min}-{max} حرف
    </span>
  );
};

export default function CategorySeo() {
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(seoOf());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }
  const [importPlan, setImportPlan] = useState(null); // { matched, skipped }
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);

  const load = async () => {
    try {
      const res = await fetch(`${API}/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch {
      setLoadError('تعذر تحميل الأقسام');
    }
  };
  useEffect(() => {
    load();
  }, []);

  const selected = categories.find((c) => c.CategoryID === selectedId) || null;
  useEffect(() => {
    if (selected) setForm(seoOf(selected));
    setMessage(null);
    // Only when switching category, not when the list refreshes after a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const shown = useMemo(
    () => categories.filter((c) => !query || String(c.CategoryName).includes(query) || String(c.CategoryID) === query),
    [categories, query]
  );
  const dirty = selected && SEO_FIELDS.some((f) => (form[f] || '') !== (selected[f] || ''));

  const pick = (id) => {
    if (dirty && !window.confirm('فيه تعديلات مش محفوظة. تسيبها؟')) return;
    setSelectedId(id);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveSeo(selected.CategoryID, form);
      const trimmed = Object.fromEntries(SEO_FIELDS.map((f) => [f, String(form[f] || '').trim()]));
      setCategories((list) => list.map((c) => (c.CategoryID === selected.CategoryID ? { ...c, ...trimmed } : c)));
      setForm(trimmed);
      setMessage({ ok: true, text: 'اتحفظ. هيظهر في الموقع على طول، وفي معاينة واتساب بعد إعادة بناء الموقع.' });
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = async (file) => {
    if (!file) return;
    setMessage(null);
    try {
      const rows = await readSheet(file);
      const byId = new Map(categories.map((c) => [c.CategoryID, c]));
      const matched = rows.filter((r) => r.id && byId.has(r.id)).map((r) => ({ ...r, category: byId.get(r.id) }));
      const skipped = rows.filter((r) => !r.id || !byId.has(r.id));
      if (!matched.length) throw new Error('مفيش ولا صف في الملف ليه رابط قسم موجود (/categories/<رقم>-...).');
      setImportPlan({ matched, skipped });
    } catch (e) {
      setMessage({ ok: false, text: e.message || 'تعذر قراءة الملف' });
    }
  };

  const runImport = async () => {
    setImporting(true);
    const failed = [];
    for (const r of importPlan.matched) {
      const seo = { ...seoOf(r.category), ...r.seo };
      if (!seo.SeoStartHeading && seo.SeoStart) seo.SeoStartHeading = DEFAULT_START_HEADING;
      try {
        await saveSeo(r.id, seo);
      } catch (e) {
        failed.push(`${r.category.CategoryName}: ${e.message}`);
      }
    }
    setImporting(false);
    setImportPlan(null);
    await load();
    if (selectedId) setSelectedId(null);
    setMessage(
      failed.length
        ? { ok: false, text: `فشل ${failed.length}: ${failed.join(' · ')}` }
        : { ok: true, text: `اتحفظ SEO ${importPlan.matched.length} قسم من الملف.` }
    );
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const input = 'w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none';
  const previewTitle = form.SeoTitle.trim() || (selected ? `دورات ${selected.CategoryName} المعتمدة | معهد ACIT` : '');
  const previewDesc = form.MetaDescription.trim() || 'تصفح دورات القسم التدريبية المعتمدة في معهد ACIT...';

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">SEO الأقسام</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            عنوان كل قسم ووصفه في جوجل، والنص اللي بيظهر في صفحته على الموقع. أي خانة فاضية بيتحط مكانها اسم القسم.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <FileUp size={16} /> استيراد من Excel
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            onPickFile(e.target.files && e.target.files[0]);
            e.target.value = '';
          }}
        />
      </div>

      {loadError && <p className="rounded-md bg-red-50 p-3 text-red-700">{loadError}</p>}
      {message && (
        <p className={`rounded-md p-3 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Category list */}
        <aside className="rounded-lg border border-gray-200 bg-white">
          <div className="relative border-b p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث عن قسم..."
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
            <Search size={16} className="absolute left-6 top-5 text-gray-400" />
          </div>
          <ul className="max-h-[70vh] divide-y overflow-y-auto">
            {shown.map((c) => {
              const n = filledCount(c);
              return (
                <li key={c.CategoryID}>
                  <button
                    type="button"
                    onClick={() => pick(c.CategoryID)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-right text-sm hover:bg-gray-50 ${
                      c.CategoryID === selectedId ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <span>{c.CategoryName}</span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                        n === SEO_FIELDS.length ? 'bg-green-100 text-green-700' : n ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {n === SEO_FIELDS.length ? 'كامل' : n ? `${n}/${SEO_FIELDS.length}` : 'فاضي'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Editor */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          {!selected ? (
            <p className="p-10 text-center text-gray-500">اختار قسم من القائمة.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-gray-800">{selected.CategoryName}</h2>
                <a href={pageUrl(selected)} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm text-blue-700 hover:underline">
                  افتح صفحة القسم <ExternalLink size={14} />
                </a>
              </div>

              <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
                <legend className="px-2 font-bold">الظهور في جوجل</legend>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="font-medium">عنوان الصفحة (Title)</label>
                    <Counter value={form.SeoTitle} min={30} max={60} />
                  </div>
                  <input className={input} value={form.SeoTitle} onChange={set('SeoTitle')} placeholder="مثال: دورات سيسكو CCNA و CCNP في جدة | معهد ACIT" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="font-medium">الوصف (Meta Description)</label>
                    <Counter value={form.MetaDescription} min={120} max={160} />
                  </div>
                  <textarea className={input} rows={3} value={form.MetaDescription} onChange={set('MetaDescription')} />
                </div>
                {/* How it looks in Google results. */}
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500" dir="ltr" style={{ textAlign: 'right' }}>{pageUrl(selected)}</p>
                  <p className="truncate text-lg text-[#1a0dab]">{previewTitle}</p>
                  <p className="line-clamp-2 text-sm text-gray-700">{previewDesc}</p>
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
                <legend className="px-2 font-bold">محتوى الصفحة</legend>
                <div>
                  <label className="mb-1 block font-medium">العنوان الظاهر (H1)</label>
                  <input className={input} value={form.SeoH1} onChange={set('SeoH1')} placeholder={`دورات ${selected.CategoryName}`} />
                </div>
                <div>
                  <label className="mb-1 block font-medium">فقرة تعريفية</label>
                  <textarea className={input} rows={3} value={form.SeoIntro} onChange={set('SeoIntro')} />
                </div>
                <div>
                  <label className="mb-1 block font-medium">عنوان فرعي (H2)</label>
                  <input className={input} value={form.SeoStartHeading} onChange={set('SeoStartHeading')} placeholder={DEFAULT_START_HEADING} />
                  <label className="mb-1 mt-2 block text-sm text-gray-600">النص تحته</label>
                  <textarea className={input} rows={3} value={form.SeoStart} onChange={set('SeoStart')} />
                </div>
                <div>
                  <label className="mb-1 block font-medium">لماذا ACIT؟</label>
                  <textarea className={input} rows={3} value={form.SeoWhy} onChange={set('SeoWhy')} />
                </div>
                <div>
                  <label className="mb-1 block font-medium">دعوة للتواصل</label>
                  <input className={input} value={form.SeoCta} onChange={set('SeoCta')} placeholder="تواصل معنا لاستشارة مجانية..." />
                  <p className="mt-1 text-xs text-gray-500">بيظهر جنبه زرار واتساب في آخر الصفحة.</p>
                </div>
              </fieldset>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !dirty}
                  className="flex items-center gap-1 rounded-md bg-primary px-6 py-2 font-semibold text-white disabled:opacity-50"
                >
                  <Check size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                {dirty && (
                  <button type="button" onClick={() => setForm(seoOf(selected))} className="text-sm text-gray-600 hover:underline">
                    تراجع عن التعديلات
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {importPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-primary">استيراد من Excel</h3>
            <p className="mb-2 text-sm text-gray-700">هيتحفظ SEO الأقسام دي (الخانات اللي في الملف هتكتب فوق الموجود):</p>
            <ul className="mb-3 list-disc space-y-1 pr-5 text-sm">
              {importPlan.matched.map((r) => (
                <li key={r.id}>
                  {r.category.CategoryName} <span className="text-gray-400">#{r.id}</span>
                </li>
              ))}
            </ul>
            {importPlan.skipped.length > 0 && (
              <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
                مش هيتحفظ (مش قسم أو القسم مش موجود): {importPlan.skipped.map((r) => r.name).join('، ')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runImport}
                disabled={importing}
                className="rounded-md bg-primary px-5 py-2 font-semibold text-white disabled:opacity-60"
              >
                {importing ? 'جاري الحفظ...' : `حفظ ${importPlan.matched.length} قسم`}
              </button>
              <button type="button" onClick={() => setImportPlan(null)} disabled={importing} className="rounded-md border px-5 py-2">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
