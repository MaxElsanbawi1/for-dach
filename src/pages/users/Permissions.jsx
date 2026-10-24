import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Users, Layers, History, AlertTriangle, Plus, Trash2, Save, Eye } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API } from '../tax/taxApi';
import { useAuth } from '../../AuthContext';
import { visibleMenu } from '../../access';

// The super admin's permissions screen.
//  - Staff: pick an account, give it a template (role), then add or remove
//    single permissions on top of it. Differences from the template are shown
//    as "+ زيادة" / "− مسحوبة" so nothing drifts unnoticed.
//  - Templates: what each role can do by default.
//  - Log: who changed whose access, and when.
// The API enforces all of it (acit-back/routes/permissionsRoutes.js); every
// save takes effect on the account's next request.

const api = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `خطأ ${res.status}`);
  return data;
};

const tabs = [
  { key: 'users', label: 'الموظفين', icon: Users },
  { key: 'roles', label: 'القوالب', icon: Layers },
  { key: 'audit', label: 'سجل التغييرات', icon: History },
];

// Login length before the account is signed out; empty = inherit.
const DEFAULT_SESSION_HOURS = 4;
const SUPERADMIN_SESSION_HOURS = 24;
const MAX_SESSION_HOURS = 168;
const toHours = (value) => (value === '' || value == null ? null : Number(value));

function SessionHoursInput({ value, onChange, inherited, disabled }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600">مدة الجلسة (ساعات)</span>
      <input
        type="number"
        min={1}
        max={MAX_SESSION_HOURS}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${inherited} (الافتراضي)`}
        className="w-36 rounded-md border border-gray-300 px-3 py-2"
      />
    </label>
  );
}

function PermissionGroups({ groups, isOn, sourceOf, onToggle, disabled }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.key} className="rounded-lg border border-gray-200">
          <div className="border-b bg-gray-50 px-4 py-2 font-semibold text-gray-800">{group.label}</div>
          <div className="divide-y">
            {group.permissions.map((p) => {
              const source = sourceOf ? sourceOf(p.key) : null;
              return (
                <label key={p.key} className={`flex items-start gap-3 px-4 py-2.5 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={isOn(p.key)}
                    disabled={disabled}
                    onChange={() => onToggle(p.key)}
                  />
                  <span className="flex-1 text-sm text-gray-700">
                    {p.label}
                    {p.sensitive && (
                      <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        <AlertTriangle size={12} /> حساس
                      </span>
                    )}
                  </span>
                  {source === 'allow' && <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">+ زيادة</span>}
                  {source === 'deny' && <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">− مسحوبة</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffTab({ groups, roles, users, reload, myId }) {
  const [selectedId, setSelectedId] = useState(null);
  const [role, setRole] = useState('');
  const [allow, setAllow] = useState([]);
  const [deny, setDeny] = useState([]);
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const selected = users.find((u) => u.UserID === selectedId);
  useEffect(() => {
    if (!selected) return;
    setRole(selected.Role);
    setAllow(selected.allow);
    setDeny(selected.deny);
    setHours(selected.SessionHours ?? '');
  }, [selected]);

  const roleLabel = (name) => (name === 'superadmin' ? 'سوبر أدمن' : roles.find((r) => r.name === name)?.label || name);
  const template = useMemo(() => new Set(roles.find((r) => r.name === role)?.permissions || []), [roles, role]);
  const isSuper = role === 'superadmin';
  // What the account gets when its own field is left empty.
  const inheritedHours = isSuper
    ? SUPERADMIN_SESSION_HOURS
    : roles.find((r) => r.name === role)?.sessionHours || DEFAULT_SESSION_HOURS;
  const isOn = (key) => isSuper || (template.has(key) ? !deny.includes(key) : allow.includes(key));
  const sourceOf = (key) => (allow.includes(key) ? 'allow' : deny.includes(key) ? 'deny' : null);

  const toggle = (key) => {
    if (template.has(key)) {
      setDeny((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
    } else {
      setAllow((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]));
    }
  };

  // Switching template drops overrides that the new template makes redundant.
  const changeRole = (next) => {
    const t = new Set(roles.find((r) => r.name === next)?.permissions || []);
    setRole(next);
    setAllow((a) => a.filter((k) => !t.has(k)));
    setDeny((d) => d.filter((k) => t.has(k)));
  };

  // "View as this user": the menu this account will get.
  const preview = useMemo(() => {
    const permissions = new Set(groups.flatMap((g) => g.permissions.map((p) => p.key)).filter(isOn));
    return visibleMenu({ role, isSuperAdmin: isSuper, permissions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, role, allow, deny, template]);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/permissions/users/${selectedId}`, { method: 'PUT', body: JSON.stringify({ role, allow, deny, sessionHours: toHours(hours) }) });
      toast.success('تم حفظ صلاحيات المستخدم');
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const shown = users.filter((u) =>
    `${u.FullName} ${u.Username} ${u.Email}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const isSelf = selected && String(selected.UserID) === String(myId);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الإيميل"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="max-h-[70vh] divide-y overflow-y-auto">
          {shown.map((u) => (
            <button
              key={u.UserID}
              type="button"
              onClick={() => setSelectedId(u.UserID)}
              className={`block w-full px-4 py-3 text-right hover:bg-gray-50 ${selectedId === u.UserID ? 'bg-blue-50' : ''}`}
            >
              <div className="font-medium text-gray-800">{u.FullName || u.Username}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-2 py-0.5">{roleLabel(u.Role)}</span>
                {u.allow.length > 0 && <span className="text-green-700">+{u.allow.length}</span>}
                {u.deny.length > 0 && <span className="text-red-700">−{u.deny.length}</span>}
                {u.IsBlocked ? <span className="text-red-700">محظور</span> : null}
              </div>
            </button>
          ))}
          {shown.length === 0 && <p className="p-4 text-sm text-gray-500">لا يوجد موظفين.</p>}
        </div>
      </div>

      <div>
        {!selected ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
            اختار موظف من القايمة عشان تشوف وتعدّل صلاحياته.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <div>
                <div className="text-lg font-semibold text-gray-800">{selected.FullName || selected.Username}</div>
                <div className="text-sm text-gray-500">{selected.Email}</div>
              </div>
              <label className="mr-auto block text-sm">
                <span className="mb-1 block text-gray-600">القالب (الدور)</span>
                <select
                  value={role}
                  disabled={isSelf}
                  onChange={(e) => changeRole(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                >
                  {roles.map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
                  <option value="superadmin">سوبر أدمن (كل الصلاحيات)</option>
                </select>
              </label>
              <SessionHoursInput value={hours} onChange={setHours} inherited={inheritedHours} disabled={isSelf} />
              <button
                type="button"
                onClick={save}
                disabled={saving || isSelf}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-white disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>

            {isSelf && (
              <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                ده حسابك. صلاحياتك بيعدّلها سوبر أدمن تاني، عشان محدش يقدر يزوّد صلاحيات نفسه.
              </p>
            )}
            {!isSuper && (allow.length > 0 || deny.length > 0) && (
              <p className="text-sm text-gray-600">
                مختلف عن القالب: <span className="text-green-700">+{allow.length} زيادة</span>،{' '}
                <span className="text-red-700">−{deny.length} مسحوبة</span>
              </p>
            )}

            {isSuper ? (
              <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">السوبر أدمن عنده كل الصلاحيات دايمًا.</p>
            ) : (
              <PermissionGroups groups={groups} isOn={isOn} sourceOf={sourceOf} onToggle={toggle} disabled={isSelf} />
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-gray-800">
                <Eye size={16} /> هيشوف في المنيو
              </div>
              {preview.length === 0 ? (
                <p className="text-sm text-gray-500">ولا صفحة. الحساب ده مش هيشوف حاجة في الداشبورد.</p>
              ) : (
                <ul className="flex flex-wrap gap-2 text-sm">
                  {preview.map((item) => (
                    <li key={item.text} className="rounded bg-gray-100 px-2 py-1">
                      {item.text}
                      {item.subItems && (
                        <span className="text-gray-500"> ({item.subItems.filter((s) => !s.action).map((s) => s.text.trim()).join('، ')})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RolesTab({ groups, roles, reload }) {
  const [selected, setSelected] = useState(null);
  const [label, setLabel] = useState('');
  const [perms, setPerms] = useState([]);
  const [hours, setHours] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const current = roles.find((r) => r.name === selected);
  useEffect(() => {
    if (current) {
      setLabel(current.label);
      setPerms(current.permissions);
      setHours(current.sessionHours ?? '');
    }
  }, [current]);

  const save = async (name, body) => {
    setSaving(true);
    try {
      await api(`/permissions/roles/${encodeURIComponent(name)}`, { method: 'PUT', body: JSON.stringify(body) });
      toast.success('تم حفظ القالب');
      await reload();
      setSelected(name);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const create = () => {
    const name = newName.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{1,29}$/.test(name)) {
      toast.error('اسم القالب بالإنجليزي: حروف صغيرة وأرقام، زي callcenter');
      return;
    }
    if (roles.some((r) => r.name === name)) {
      toast.error('في قالب بنفس الاسم');
      return;
    }
    setNewName('');
    save(name, { label: name, permissions: [] });
  };

  const remove = async () => {
    if (!window.confirm(`حذف القالب "${current.label}"؟`)) return;
    try {
      await api(`/permissions/roles/${encodeURIComponent(current.name)}`, { method: 'DELETE' });
      toast.success('تم حذف القالب');
      setSelected(null);
      await reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <div className="divide-y rounded-lg border border-gray-200 bg-white">
          {roles.map((r) => (
            <button
              key={r.name}
              type="button"
              onClick={() => setSelected(r.name)}
              className={`flex w-full items-center justify-between px-4 py-3 text-right hover:bg-gray-50 ${selected === r.name ? 'bg-blue-50' : ''}`}
            >
              <span>
                <span className="font-medium text-gray-800">{r.label}</span>
                <span className="mr-2 text-xs text-gray-400">{r.name}</span>
              </span>
              <span className="text-xs text-gray-500">{r.users} مستخدم · {r.permissions.length} صلاحية · {r.sessionHours || DEFAULT_SESSION_HOURS} س</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم قالب جديد بالإنجليزي"
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            dir="ltr"
          />
          <button type="button" onClick={create} className="inline-flex items-center gap-1 rounded-md border border-primary px-3 text-sm text-primary">
            <Plus size={16} /> إضافة
          </button>
        </div>
      </div>

      <div>
        {!current ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
            القالب هو الصلاحيات الافتراضية للدور. أي تعديل هنا بيوصل لكل الموظفين اللي عليه.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">اسم القالب بالعربي</span>
                <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <SessionHoursInput value={hours} onChange={setHours} inherited={DEFAULT_SESSION_HOURS} />
              <span className="text-sm text-gray-500">عليه {current.users} مستخدم</span>
              <div className="mr-auto flex gap-2">
                {current.users === 0 && (
                  <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-md border border-red-300 px-4 py-2 text-sm text-red-700">
                    <Trash2 size={16} /> حذف
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(current.name, { label, permissions: perms, sessionHours: toHours(hours) })}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-white disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
            <PermissionGroups
              groups={groups}
              isOn={(k) => perms.includes(k)}
              onToggle={(k) => setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AuditTab({ labelOf }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api('/permissions/audit').then(setRows).catch((e) => toast.error(e.message));
  }, []);
  if (!rows) return <p className="text-gray-500">جاري التحميل...</p>;
  if (rows.length === 0) return <p className="text-gray-500">لسه مفيش تغييرات.</p>;
  const keys = (list) => (list || []).map(labelOf).join('، ');
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-right text-gray-600">
          <tr>
            <th className="px-4 py-2">الوقت</th>
            <th className="px-4 py-2">مين عدّل</th>
            <th className="px-4 py-2">على</th>
            <th className="px-4 py-2">التغيير</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => {
            const d = r.details || {};
            return (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-2 text-gray-500">{new Date(r.created_at).toLocaleString('ar-EG')}</td>
                <td className="px-4 py-2">{r.actor || '—'}</td>
                <td className="px-4 py-2">{r.target_type === 'role' ? `قالب ${r.target}` : r.target_name || `مستخدم #${r.target}`}</td>
                <td className="px-4 py-2 text-gray-700">
                  {d.deleted && 'حذف القالب'}
                  {d.role && d.role.from !== d.role.to && <div>الدور: {d.role.from} ← {d.role.to}</div>}
                  {d.added?.length > 0 && <div className="text-green-700">أضاف: {keys(d.added)}</div>}
                  {d.removed?.length > 0 && <div className="text-red-700">شال: {keys(d.removed)}</div>}
                  {d.allow?.length > 0 && <div className="text-green-700">زيادة: {keys(d.allow)}</div>}
                  {d.deny?.length > 0 && <div className="text-red-700">مسحوبة: {keys(d.deny)}</div>}
                  {d.sessionHours && (
                    <div>مدة الجلسة: {d.sessionHours.from ?? 'الافتراضي'} ← {d.sessionHours.to ?? 'الافتراضي'} ساعة</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Permissions() {
  const { user, refreshAccess } = useAuth();
  const [tab, setTab] = useState('users');
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [catalog, roleList, userList] = await Promise.all([
        api('/permissions/catalog'),
        api('/permissions/roles'),
        api('/permissions/users'),
      ]);
      setGroups(catalog.groups);
      setRoles(roleList);
      setUsers(userList);
      setError('');
      refreshAccess();
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelOf = (key) => groups.flatMap((g) => g.permissions).find((p) => p.key === key)?.label || key;

  return (
    <div className="space-y-6" dir="rtl">
      <ToastContainer position="top-center" rtl />
      <div className="flex items-center gap-3">
        <Shield className="text-primary" />
        <h1 className="text-2xl font-bold text-gray-800">الصلاحيات</h1>
      </div>
      <p className="max-w-3xl text-sm text-gray-600">
        كل موظف عليه قالب (دور) بيحدد يشوف إيه ويعمل إيه في الداشبورد. تقدر تزوّد أو تسحب صلاحية لموظف معيّن من غير ما تغيّر القالب.
        الصلاحيات اللي عليها علامة <span className="text-red-700">حساس</span> فيها بيانات شخصية أو فلوس أو حذف. التغيير بيشتغل على طول، وبيتسجّل في سجل التغييرات.
        مدة الجلسة: بعدها الحساب بيتعمله تسجيل خروج تلقائي. لو سبتها فاضية بياخد مدة القالب، والقالب لو فاضي بياخد {DEFAULT_SESSION_HOURS} ساعات (السوبر أدمن {SUPERADMIN_SESSION_HOURS} ساعة).
      </p>

      {error && <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm ${tab === t.key ? 'border-primary font-semibold text-primary' : 'border-transparent text-gray-600'}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <StaffTab groups={groups} roles={roles} users={users} reload={load} myId={user?.user_id} />}
      {tab === 'roles' && <RolesTab groups={groups} roles={roles} reload={load} />}
      {tab === 'audit' && <AuditTab labelOf={labelOf} />}
    </div>
  );
}
