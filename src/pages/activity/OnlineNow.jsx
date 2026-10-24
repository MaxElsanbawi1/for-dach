import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { API } from '../tax/taxApi';
import { MENU, matchPath } from '../../access';

// "المتصلون الآن": accounts that have the dashboard open, and the page each one
// is on. The API keeps this in memory from the requests every open tab already
// makes (acit-back/services/activityLog.js); an account drops off two minutes
// after its last request (tab closed, computer asleep).

const REFRESH_MS = 30000;
const ROLE_LABEL = { superadmin: 'سوبر أدمن', admin: 'أدمن', trainer: 'مدرب', partner: 'شريك' };

const PAGES = MENU.flatMap((item) => item.subItems || [item]).filter((e) => e.href);
const pageName = (path) => {
  const hit = PAGES.find((e) => matchPath(e.href, path));
  return hit ? hit.text.trim() : path;
};

const ago = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return 'الآن';
  const m = Math.round(s / 60);
  if (m < 60) return `منذ ${m} دقيقة`;
  return `منذ ${Math.floor(m / 60)} ساعة و${m % 60} دقيقة`;
};

export default function OnlineNow() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      // A hidden tab skips its turn; it refreshes when shown again.
      if (document.hidden) return;
      try {
        const res = await fetch(`${API}/activity/online`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || `خطأ ${res.status}`);
        if (alive) {
          setData(body);
          setError('');
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  const rows = data?.rows || [];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Radio className="text-green-600" />
        <h1 className="text-2xl font-bold text-gray-800">المتصلون الآن</h1>
      </div>
      <p className="max-w-3xl text-sm text-gray-600">
        مين فاتح الداشبورد دلوقتي، وفاتح أنهي صفحة. الحساب بيختفي من القائمة بعد دقيقتين من قفل الصفحة. بتتحدث كل 30 ثانية.
      </p>

      {error && <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b px-4 py-2 text-sm text-gray-500">
          {!data ? 'جاري التحميل...' : `${rows.length} متصل`}
        </div>
        {data && rows.length === 0 && <p className="p-8 text-center text-gray-500">مفيش حد متصل دلوقتي.</p>}
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
              <span className="font-medium text-gray-800">{r.name || `#${r.userId}`}</span>
              {r.role && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{ROLE_LABEL[r.role] || r.role}</span>
              )}
              <span className="flex-1 text-sm text-gray-700">
                فاتح: <span className="font-medium">{pageName(r.page)}</span>
              </span>
              <span className="text-xs text-gray-500">
                دخل {ago(data.now - r.firstAt)} · آخر نشاط {ago(data.now - r.lastAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
