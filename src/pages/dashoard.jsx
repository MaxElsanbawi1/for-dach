import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, Package, Activity, BarChart2, PieChart as PieIcon, Clock, Settings } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { API } from './tax/taxApi';
import { useAuth } from '../AuthContext';
import { allowed } from '../access';

// The dashboard home page. Numbers come from /api/dashboard/summary, which
// sends only what this account may see; anything not sent shows "—".

const nf = new Intl.NumberFormat('ar-EG');
const money = (value) => `${nf.format(Math.round(Number(value) || 0))} ⃁`;
const timeAgo = (value) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${nf.format(minutes)} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `منذ ${nf.format(hours)} ساعة`;
  const days = Math.round(hours / 24);
  if (days < 30) return `منذ ${nf.format(days)} يوم`;
  return new Date(value).toLocaleDateString('ar-EG', { dateStyle: 'medium' });
};

// Brand color (theme variable) for the bars; fixed category order for the pie,
// with "أخرى" always gray.
const brandColor = () => {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue('--acit-gold-rgb').trim();
  return rgb ? `rgb(${rgb.split(/\s+/).join(', ')})` : '#074d84';
};
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const OTHER = '#9ca3af';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d.revenue) return null; // nothing to say about a day without sales
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow" dir="rtl">
      <div className="font-semibold text-gray-800">{d.name || `يوم ${nf.format(label)}`}</div>
      <div className="text-gray-700">{money(d.revenue)}</div>
      <div className="text-xs text-gray-500">{nf.format(d.orders ?? d.sales)} {d.name ? 'مبيعة' : 'طلب مدفوع'}</div>
    </div>
  );
}

// Charts animate in when they scroll into view (not on page load, when they may
// still be off screen).
function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);
  return [ref, inView];
}

const Placeholder = ({ icon: Icon, text }) => (
  <div className="h-64 bg-gray-50 rounded flex flex-col items-center justify-center gap-2">
    <Icon size={48} className="text-gray-400" />
    <p className="text-gray-500">{text}</p>
  </div>
);

const QUICK_ACTIONS = [
  { icon: Settings, text: 'إعدادات النظام', href: '/tax/settings', need: ['tax.issue', 'settings.edit'] },
  { icon: Users, text: 'إدارة المستخدمين', href: '/users', need: 'users.view' },
  { icon: Package, text: 'إدارة الطلبات', href: '/registrations/all', need: 'registrations.view' },
  { icon: Activity, text: 'تقارير النشاط', href: '/activity', need: 'logs.view' },
];

const Dashboard = () => {
  const { access } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/dashboard/summary`)
      .then((res) => (res.ok ? res.json() : {}))
      .then(setData)
      .catch(() => setData({}));
  }, []);

  const { users, finance, courses, activity } = data || {};
  const show = (value) => (data ? value ?? '—' : '...');
  const color = brandColor();
  const hasMonthSales = finance?.month?.some((d) => d.revenue > 0);
  const actions = QUICK_ACTIONS.filter((a) => allowed(a.need, access));
  const [chartsRef, chartsInView] = useInView();

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="bg-primary p-3 rounded-full text-white">
            <Users size={24} />
          </div>
          <div className="mr-4">
            <h2 className="text-lg font-semibold text-primary">إجمالي المستخدمين</h2>
            <p className="text-2xl font-bold">{show(users && nf.format(users.total))}</p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="bg-secondary p-3 rounded-full text-white">
            <CreditCard size={24} />
          </div>
          <div className="mr-4">
            <h2 className="text-lg font-semibold text-primary">إجمالي الإيرادات</h2>
            <p className="text-2xl font-bold">{show(finance && money(finance.revenue))}</p>
          </div>
        </div>

        {/* Total Courses */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="bg-primary p-3 rounded-full text-white">
            <Package size={24} />
          </div>
          <div className="mr-4">
            <h2 className="text-lg font-semibold text-primary">إجمالي المشاريع</h2>
            <p className="text-2xl font-bold">{show(courses && nf.format(courses.total))}</p>
          </div>
        </div>

        {/* Running Courses */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="bg-secondary p-3 rounded-full text-white">
            <Activity size={24} />
          </div>
          <div className="mr-4">
            <h2 className="text-lg font-semibold text-primary">المشاريع النشطة</h2>
            <p className="text-2xl font-bold">{show(courses && nf.format(courses.running))}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart: paid sales per day this month */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-primary">مبيعات الشهر</h2>
          {hasMonthSales && chartsInView ? (
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finance.month} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="day" tickFormatter={(v) => nf.format(v)} reversed tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis orientation="right" tickFormatter={(v) => nf.format(v)} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={56} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="revenue" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24}
                    isAnimationActive animationBegin={100} animationDuration={900} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : hasMonthSales ? (
            <div className="h-64" />
          ) : (
            <Placeholder icon={BarChart2} text={finance ? 'لا توجد مبيعات مدفوعة هذا الشهر' : 'رسم بياني توضيحي'} />
          )}
        </div>

        {/* Pie Chart: share of paid sales by course */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-primary">توزيع المبيعات</h2>
          {finance?.split?.length && chartsInView ? (
            <div className="flex flex-col items-center gap-4 sm:h-64 sm:flex-row">
              <div className="h-48 w-48 shrink-0 sm:h-56 sm:w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={finance.split} dataKey="revenue" nameKey="name" innerRadius="55%" outerRadius="100%" paddingAngle={1} stroke="#fff" strokeWidth={2}
                      startAngle={90} endAngle={-270}
                      isAnimationActive animationBegin={200} animationDuration={1100} animationEasing="ease-out">
                      {finance.split.map((s, i) => (
                        <Cell key={s.name} fill={s.other ? OTHER : SERIES[i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full min-w-0 space-y-2 text-sm">
                {finance.split.map((s, i) => {
                  const total = finance.split.reduce((sum, x) => sum + x.revenue, 0) || 1;
                  return (
                    <li
                      key={s.name}
                      className="flex items-center gap-2 animate-[dash-legend-in_0.4s_ease-out_both]"
                      style={{ animationDelay: `${300 + i * 90}ms` }}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.other ? OTHER : SERIES[i] }} />
                      <span className="flex-1 truncate text-gray-700" title={s.name}>{s.name}</span>
                      <span className="shrink-0 text-gray-500">{nf.format(Math.round((s.revenue / total) * 100))}٪</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : finance?.split?.length ? (
            <div className="h-64" />
          ) : (
            <Placeholder icon={PieIcon} text={finance ? 'لا توجد مبيعات بعد' : 'رسم بياني دائري'} />
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-primary">النشاطات الأخيرة</h2>
        <div className="space-y-4">
          {activity?.length ? (
            activity.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center min-w-0">
                  <Clock size={20} className="text-primary shrink-0" />
                  <p className="mr-2 truncate">
                    <span className="font-medium text-primary">{item.userName || '—'}</span> {item.action}
                  </p>
                </div>
                <p className="text-sm text-gray-500 shrink-0 mr-4">{timeAgo(item.createdAt)}</p>
              </div>
            ))
          ) : (
            <p className="p-4 text-gray-500">{!data ? '...' : activity ? 'لا توجد نشاطات بعد' : 'لا توجد نشاطات متاحة لحسابك'}</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {actions.map((action) => (
          <Link key={action.href} to={action.href} className="bg-white rounded-lg shadow p-6 flex items-center justify-center hover:bg-gray-50">
            <action.icon size={24} className="text-primary" />
            <p className="mr-2 text-primary">{action.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
};

export default Dashboard;
