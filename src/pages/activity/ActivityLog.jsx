import React, { useEffect, useMemo, useState } from 'react';
import { History, User, ChevronDown, ChevronUp, X, Search } from 'lucide-react';
import { API } from '../tax/taxApi';

// "السجل": every change made in the dashboard - who, what, when, and the values
// they sent. Pick an employee to see everything that account did. Entries are
// written by the API itself (acit-back/services/activityLog.js), so nothing a
// page forgets to report is missing here.

const PAGE_SIZE = 50;

const api = async (path) => {
  const res = await fetch(`${API}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `خطأ ${res.status}`);
  return data;
};

const METHOD_STYLE = {
  POST: 'bg-green-50 text-green-700',
  PUT: 'bg-blue-50 text-blue-700',
  PATCH: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
  // Signed out automatically when the session length ran out.
  AUTO: 'bg-red-600 text-white',
};
const METHOD_LABEL = { POST: 'إضافة', PUT: 'تعديل', PATCH: 'تعديل', DELETE: 'حذف', AUTO: 'خرج تلقائي' };

const formatTime = (value) =>
  new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

// Arabic names for the fields the API receives most often; any other field
// shows under its own name.
const FIELD_LABELS = {
  role: 'الدور', Role: 'الدور', allow: 'صلاحيات زيادة عن القالب', deny: 'صلاحيات مسحوبة من القالب',
  permissions: 'الصلاحيات', label: 'الاسم', status: 'الحالة', Status: 'الحالة', action: 'الإجراء',
  CourseName: 'اسم الدورة', Price: 'السعر', Description: 'الوصف', StartingTime: 'تاريخ البداية', EndingTime: 'تاريخ النهاية',
  CategoryID: 'القسم', CategoryName: 'اسم القسم', InstructorID: 'المدرب', CourseType: 'نوع الدورة',
  FullName: 'الاسم', fullname: 'الاسم', Username: 'اسم المستخدم', Email: 'الإيميل', email: 'الإيميل',
  PhoneNumber: 'الجوال', phonenumber: 'الجوال', NationalId: 'رقم الهوية', Location: 'المدينة', location: 'المدينة',
  IsBlocked: 'محظور', title: 'العنوان', Title: 'العنوان', name: 'الاسم', Code: 'الكود', code: 'الكود', Amount: 'القيمة',
  CourseID: 'الدورة', Notes: 'ملاحظات', note: 'ملاحظة',
};

function Details({ details, permLabel, roleLabel }) {
  const entries = Object.entries(details || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (!entries.length) return <p className="text-sm text-gray-500">مفيش تفاصيل إضافية.</p>;
  const show = (key, value) => {
    if (['allow', 'deny', 'permissions'].includes(key) && Array.isArray(value)) {
      return value.length ? value.map(permLabel).join('، ') : 'لا شيء';
    }
    if (['role', 'Role'].includes(key)) return roleLabel(value);
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (Array.isArray(value)) return value.length ? value.join('، ') : 'لا شيء';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };
  return (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[200px_1fr]">
      {entries.map(([key, value]) => (
        <React.Fragment key={key}>
          <dt className="font-medium text-gray-500">{FIELD_LABELS[key] || key}</dt>
          <dd className="break-words text-gray-800">{show(key, value)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function ActivityLog() {
  const [people, setPeople] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ userId: '', section: '', from: '', to: '', q: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [permNames, setPermNames] = useState({});
  const [roleNames, setRoleNames] = useState({ superadmin: 'سوبر أدمن', student: 'طالب' });

  useEffect(() => {
    api('/activity/people').then(setPeople).catch(() => {});
    api('/activity/sections').then(setSections).catch(() => {});
    // Labels for permission keys and role names in the details (optional).
    api('/permissions/catalog')
      .then((c) => {
        setPermNames(Object.fromEntries(c.groups.flatMap((g) => g.permissions.map((p) => [p.key, p.label]))));
        setRoleNames((r) => ({ ...r, ...Object.fromEntries((c.roles || []).map((x) => [x.name, x.label])) }));
      })
      .catch(() => {});
  }, []);
  const permLabel = (key) => permNames[key] || key;
  const roleLabel = (name) => roleNames[name] || name;

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    setLoading(true);
    api(`/activity?${params}`)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters, page]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const person = useMemo(() => people.find((p) => String(p.user_id) === String(filters.userId)), [people, filters.userId]);
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const input = 'rounded-md border border-gray-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <History className="text-primary" />
        <h1 className="text-2xl font-bold text-gray-800">السجل</h1>
      </div>
      <p className="max-w-3xl text-sm text-gray-600">
        كل تعديل اتعمل في الداشبورد: مين عمله، وإمتى، والقيم اللي اتبعتت. اختار موظف تشوف سجله كله، أو دوس على أي سطر تشوف تفاصيله.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">الموظف</span>
          <select value={filters.userId} onChange={(e) => setFilter('userId', e.target.value)} className={`${input} min-w-[220px]`}>
            <option value="">كل الموظفين</option>
            {people.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.name || `#${p.user_id}`} ({p.actions})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">القسم</span>
          <select value={filters.section} onChange={(e) => setFilter('section', e.target.value)} className={input}>
            <option value="">كل الأقسام</option>
            {sections.map((s) => <option key={s.section} value={s.section}>{s.section}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">من</span>
          <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">إلى</span>
          <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className={input} />
        </label>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter('q', search.trim());
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">بحث</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم دورة، إيميل..." className={input} />
          </label>
          <button type="submit" className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50" aria-label="بحث">
            <Search size={18} />
          </button>
        </form>
        {Object.values(filters).some(Boolean) && (
          <button
            type="button"
            onClick={() => {
              setFilters({ userId: '', section: '', from: '', to: '', q: '' });
              setSearch('');
              setPage(1);
            }}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline"
          >
            <X size={14} /> مسح الفلاتر
          </button>
        )}
      </div>

      {person && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm">
          <User className="text-blue-700" />
          <span className="text-lg font-semibold text-gray-800">{person.name}</span>
          {person.role && <span className="rounded bg-white px-2 py-0.5 text-gray-600">{person.role}</span>}
          <span className="text-gray-600">{person.actions} عملية</span>
          <span className="text-gray-600">آخر نشاط: {formatTime(person.last_at)}</span>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b px-4 py-2 text-sm text-gray-500">
          {loading ? 'جاري التحميل...' : `${data.total} عملية`}
        </div>
        {!loading && data.rows.length === 0 && (
          <p className="p-8 text-center text-gray-500">مفيش عمليات بالفلاتر دي.</p>
        )}
        <ul className="divide-y">
          {data.rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpen(open === row.id ? null : row.id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-right hover:bg-gray-50"
              >
                <span className="w-36 shrink-0 text-xs text-gray-500">{formatTime(row.created_at)}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${METHOD_STYLE[row.method] || 'bg-gray-100 text-gray-600'}`}>
                  {METHOD_LABEL[row.method] || row.method}
                </span>
                <span
                  role="link"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (row.user_id) setFilter('userId', String(row.user_id));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && row.user_id) setFilter('userId', String(row.user_id));
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  {row.user_name || `#${row.user_id}`}
                </span>
                <span className="flex-1 text-gray-800">{row.action}</span>
                <span className="text-xs text-gray-400">{row.section}</span>
                {open === row.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {open === row.id && (
                <div className="space-y-3 bg-gray-50 px-6 py-4">
                  <Details details={row.details} permLabel={permLabel} roleLabel={roleLabel} />
                  <p className="text-xs text-gray-400" dir="ltr" style={{ textAlign: 'right' }}>
                    {row.method} /api{row.path} · {row.ip || ''}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">
            السابق
          </button>
          <span className="text-gray-600">صفحة {page} من {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
