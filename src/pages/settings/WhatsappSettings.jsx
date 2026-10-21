import React, { useCallback, useEffect, useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { API } from "../tax/taxApi";
import TelegramLinkCard from "../../components/TelegramLinkCard";

// Lecture alerts to trainers through the Telegram bot (official and free).
// WhatsApp was removed from here; /whatsapp still serves the shared message
// log and today's lectures. Super admin only (acit-back/routes/telegramRoutes.js,
// whatsappRoutes.js).
const api = `${API.trim()}/whatsapp`;

const KIND = { reminder: "تذكير قبل ساعة", confirm_open: "فتح التأكيد", escalation: "تنبيه عدم التأكيد" };

const call = async (path, options = {}) => {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  return body;
};

const fmt = (d) => (d ? new Date(d).toLocaleString("ar-EG", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }) : "—");

export default function WhatsappSettings() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [today, setToday] = useState(null);

  // The message log and today's lectures still come from /whatsapp (shared by
  // both channels); WhatsApp itself is off (acit-back lectureAlertsCron.js).
  const load = useCallback(async () => {
    try {
      setInfo(await call("/status"));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    call("/today").then(setToday).catch(() => setToday([]));
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <div className="rounded-lg bg-white p-5 shadow-md">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Send className="text-sky-500" /> تنبيهات المحاضرات
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          المدرب بيوصله على تليجرام تذكير قبل المحاضرة بساعة، ورسالة قبلها بربع ساعة لو ما أكّدش. ولو المحاضرة بدأت من غير تأكيد، بيوصلك تنبيه.
          ولو المدرب المربوط بعت أي رسالة للبوت، بتوصل لحساب السوبر أدمن المربوط.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <TelegramSection />

      {/* Today's lectures */}
      <div className="rounded-lg bg-white p-5 shadow-md">
        <h2 className="mb-3 font-bold text-gray-800">محاضرات النهارده</h2>
        {!today ? (
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        ) : today.length === 0 ? (
          <p className="text-sm text-gray-500">مفيش محاضرات النهارده.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">الساعة</th>
                  <th className="px-3 py-2 text-right font-medium">المحاضرة</th>
                  <th className="px-3 py-2 text-right font-medium">المدرب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {today.map((l) => (
                  <tr key={l.key}>
                    <td className="px-3 py-2">{l.start ? new Date(l.start).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "غير محدد"}</td>
                    <td className="px-3 py-2">{l.title}</td>
                    <td className="px-3 py-2">{l.trainerName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log */}
      <div className="rounded-lg bg-white p-5 shadow-md">
        <h2 className="mb-3 font-bold text-gray-800">آخر الرسايل</h2>
        {!info?.log?.length ? (
          <p className="text-sm text-gray-500">لسه مفيش رسايل.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">الوقت</th>
                  <th className="px-3 py-2 text-right font-medium">القناة</th>
                  <th className="px-3 py-2 text-right font-medium">النوع</th>
                  <th className="px-3 py-2 text-right font-medium">إلى</th>
                  <th className="px-3 py-2 text-right font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {info.log.map((m, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-3 py-2">{fmt(m.CreatedAt)}</td>
                    <td className="px-3 py-2">{m.Channel === "telegram" ? "تليجرام" : "واتساب"}</td>
                    <td className="px-3 py-2">{KIND[m.Kind] || m.Kind}</td>
                    <td className="px-3 py-2" dir="ltr">{m.Phone}</td>
                    <td className="px-3 py-2">
                      {m.Status === "sent" ? (
                        <span className="text-green-700">اتبعتت</span>
                      ) : m.Status === "failed" ? (
                        <span className="text-red-600">فشلت: {m.Error}</span>
                      ) : (
                        <span className="text-gray-500">جاري الإرسال</span>
                      )}
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

const tgApi = `${API.trim()}/telegram`;

function TelegramSection() {
  const [info, setInfo] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${tgApi}/status`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.message);
      setInfo(body);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const save = async (body) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${tgApi}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setToken("");
      setMsg("✅ تم الحفظ");
      await load();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <div className="rounded-lg bg-white p-5 text-sm text-gray-500 shadow-md">جاري تحميل تليجرام...{msg && ` ${msg}`}</div>;
  const trainers = info.users.filter((u) => String(u.Role).toLowerCase() === "trainer");
  const linkedCount = trainers.filter((u) => u.Linked).length;
  const linkedAdmins = info.users.filter((u) => u.Linked && String(u.Role).toLowerCase() !== "trainer");

  return (
    <div className="space-y-4 rounded-lg bg-white p-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Send className="text-sky-500" /> تليجرام <span className="text-sm font-normal text-green-700">(رسمي ومجاني، مفيش خطر حظر)</span>
        </h2>
        {info.configured && (
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${info.running ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
            {info.running ? `شغال @${info.botUsername}` : "البوت مش شغال"}
          </span>
        )}
      </div>

      {!info.configured && (
        <ol className="list-decimal space-y-1 rounded-md bg-sky-50 p-4 pr-8 text-sm text-sky-900">
          <li>افتح تليجرام وابحث عن <b dir="ltr">@BotFather</b>.</li>
          <li>ابعتله <b dir="ltr">/newbot</b>، واكتب اسم للبوت (مثلاً: ACIT تنبيهات المحاضرات).</li>
          <li>اكتب username يخلص بـ <b dir="ltr">bot</b> (مثلاً: <span dir="ltr">acit_lectures_bot</span>).</li>
          <li>هيبعتلك توكن شكله <span dir="ltr">123456789:AAH...</span>، انسخه وحطه هنا.</li>
        </ol>
      )}

      {!info.tokenFromEnv && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            {info.configured ? "تغيير توكن البوت" : "توكن البوت"}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              dir="ltr"
              type="password"
              autoComplete="off"
              placeholder="123456789:AAH..."
              className="min-w-[260px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={busy || !token.trim()}
              onClick={() => save({ token })}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              حفظ التوكن
            </button>
          </div>
        </div>
      )}

      {info.configured && (
        <>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={info.enabled}
              disabled={busy}
              onChange={(e) => save({ enabled: e.target.checked })}
              className="h-5 w-5"
            />
            <span className="font-semibold text-gray-800">تشغيل رسائل المحاضرات على تليجرام</span>
          </label>

          <div>
            <p className="mb-2 text-sm text-gray-600">
              تنبيه "المدرب ما أكّدش" بيوصل لحساب السوبر أدمن اللي رابط تليجرام. اربط حسابك:
            </p>
            <TelegramLinkCard compact />
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-gray-800">
              المدربين اللي ربطوا تليجرام: {linkedCount} من {trainers.length}
            </h3>
            <p className="mb-2 text-xs text-gray-500">
              كل مدرب بيلاقي زرار "ربط تليجرام" في صفحة "دوراتي كمدرب"، أو اضغط "لينك ربط" جنبه وابعتهوله: أول ما يفتحه ويدوس Start بيتربط بحسابه هو، مهما كان اسمه على تليجرام. اللي ما ربطش مش هيوصله تنبيهات على تليجرام.
            </p>
            <LinkedUsersTable users={[...linkedAdmins, ...trainers]} contacts={info.contacts || []} botUsername={info.botUsername} onChange={load} />
          </div>
        </>
      )}
      {info.configured && info.running && <TelegramMessageBox users={info.users} />}
      {info.configured && <ArchiveSettings />}
      {info.lastError && <p className="text-xs text-gray-400">آخر خطأ: {info.lastError}</p>}
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}

// Dashboard account next to the Telegram account it is linked to. Names repeat,
// so both sides show what identifies them: username/email, and @handle + Telegram id.
function LinkedUsersTable({ users, contacts, botUsername, onChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const contactLabel = (c) =>
    `${c.TelegramName || "بدون اسم"}${c.TelegramUsername ? ` @${c.TelegramUsername}` : ""} · ID ${c.ChatID}`;

  // Link by hand: pick the Telegram account (anyone who pressed Start in the bot).
  const setLink = async (u, chatId) => {
    const target = contacts.find((c) => String(c.ChatID) === chatId);
    const taken = target && target.UserID && target.UserID !== u.UserID ? users.find((x) => x.UserID === target.UserID) : null;
    const question = !chatId
      ? `فك ربط تليجرام عن ${u.FullName}؟`
      : `ربط ${u.FullName} (${u.Username || u.Email}) بتليجرام ${contactLabel(target)}؟${taken ? `\nالحساب ده مربوط دلوقتي بـ ${taken.FullName} وهيتفك عنه.` : ""}`;
    if (!window.confirm(question)) return;
    setBusy(u.UserID);
    setError("");
    try {
      const res = await fetch(`${tgApi}/links/${u.UserID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chatId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
    <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
      للربط بإيدك: خلي الشخص يفتح البوت{" "}
      {botUsername && (
        <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline" dir="ltr">
          t.me/{botUsername}
        </a>
      )}{" "}
      ويدوس Start، فيظهر عندك في القائمة، وبعدين اختاره جنب حسابه. القائمة فيها كل اللي كلّموا البوت ({contacts.length}).
    </p>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <div className="max-h-96 overflow-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-3 py-2 text-right font-medium">حساب الداشبورد</th>
            <th className="px-3 py-2 text-right font-medium">حساب تليجرام</th>
            <th className="px-3 py-2 text-right font-medium">لينك الربط</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u) => (
            <tr key={u.UserID}>
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900">
                  {u.FullName}
                  {String(u.Role).toLowerCase() !== "trainer" && <span className="mr-1 text-xs text-blue-700">(سوبر أدمن)</span>}
                </div>
                <div className="text-xs text-gray-500" dir="ltr">{[u.Username, u.Email].filter(Boolean).join(" · ")}</div>
              </td>
              <td className="px-3 py-2">
                <select
                  value={u.Linked ? String(u.TelegramID) : ""}
                  disabled={busy === u.UserID}
                  onChange={(e) => setLink(u, e.target.value)}
                  className={`w-full max-w-xs rounded-md border px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none ${
                    u.Linked ? "border-green-300 bg-green-50 text-green-800" : "border-gray-300 text-gray-500"
                  }`}
                >
                  <option value="">— مش مربوط —</option>
                  {u.Linked && !contacts.some((c) => String(c.ChatID) === String(u.TelegramID)) && (
                    <option value={String(u.TelegramID)}>
                      {`${u.TelegramName || "مربوط"}${u.TelegramUsername ? ` @${u.TelegramUsername}` : ""} · ID ${u.TelegramID}`}
                    </option>
                  )}
                  {contacts.map((c) => (
                    <option key={c.ChatID} value={String(c.ChatID)}>
                      {contactLabel(c)}
                      {c.UserID && c.UserID !== u.UserID ? " (مربوط بحد تاني)" : ""}
                    </option>
                  ))}
                </select>
                {u.Linked && u.LinkedAt && <div className="mt-1 text-xs text-gray-400">من {fmt(u.LinkedAt)}</div>}
              </td>
              <td className="px-3 py-2">
                <InviteLink user={u} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

// A link tied to this one dashboard account, for the super admin to send to the
// trainer: whoever opens it and presses Start is linked to this account, under
// any Telegram name. One use, a few days (acit-back services/telegram.js inviteLink).
function InviteLink({ user }) {
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const make = async () => {
    if (user.Linked && !window.confirm(`${user.FullName} مربوط بالفعل. لينك جديد هينقل الربط لأي حد يفتحه. تكمل؟`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${tgApi}/links/${user.UserID}/invite`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setInvite(data);
      setCopied(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
    } catch {
      window.prompt("انسخ اللينك:", invite.link);
    }
  };

  const whatsappText = invite
    ? `أهلاً ${user.FullName}، ده لينك ربط حسابك في داشبورد ACIT بتليجرام عشان توصلك تنبيهات المحاضرات:\n${invite.link}\nافتحه واضغط Start. اللينك ليك انت بس ويشتغل مرة واحدة.`
    : "";

  if (!invite) {
    return (
      <div>
        <button
          type="button"
          onClick={make}
          disabled={busy}
          className="flex items-center gap-1 whitespace-nowrap rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          <Send size={13} /> {busy ? "..." : user.Linked ? "لينك جديد" : "لينك ربط"}
        </button>
        {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="max-w-[220px] truncate rounded bg-gray-50 px-2 py-1 text-xs text-gray-700" dir="ltr" title={invite.link}>
        {invite.link}
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={copy} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
          {copied ? "✅ اتنسخ" : "نسخ"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
        >
          ابعته واتساب
        </a>
      </div>
      <div className="text-[11px] text-gray-400">صالح {invite.days} أيام ولمرة واحدة</div>
    </div>
  );
}

// The archive channel: every trainer chat message is copied there; after three
// weeks the dashboard keeps only its number and reads it back from the channel
// on demand (acit-back services/telegram.js archiveChat, services/telegramMt.js).
function ArchiveSettings() {
  const [info, setInfo] = useState(null);
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [steps, setSteps] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${tgApi}/archive`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setInfo(data);
      setApiId((v) => v || (data.apiId ? String(data.apiId) : ""));
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (body) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${tgApi}/archive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setInfo(data);
      setApiHash("");
      setMsg("✅ تم الحفظ");
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setSteps(null);
    setMsg("");
    try {
      const res = await fetch(`${tgApi}/archive/test`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setSteps(data.steps);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!info) return msg ? <p className="text-sm">{msg}</p> : null;

  return (
    <div className="space-y-3 rounded-md border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-800">أرشيف محادثات المدربين</h3>
      <p className="text-xs text-gray-500">
        كل رسالة بين المدرب والإدارة بتتنسخ في قناة تليجرام خاصة. بعد 3 أسابيع الداشبورد بيمسح محتواها ويحتفظ برقمها في القناة بس،
        ولما تدوس "تحميل الرسايل الأقدم" في محادثات المدربين بتترجع من القناة.
      </p>

      {/* 1. Channel */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">1. قناة الأرشيف</label>
        {info.chatId ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-green-50 px-2 py-1 text-green-800">✅ {info.title || info.chatId}</span>
            <button type="button" disabled={busy} onClick={() => save({ chatId: null })} className="text-xs text-gray-500 hover:text-red-600">
              تغيير
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-gray-500">
              ضيف البوت أدمن في القناة (ومعاه "نشر الرسائل")، واكتب أي رسالة فيها، وبعدين دوس تحديث واختارها.
            </p>
            <div className="flex flex-wrap gap-2">
              {info.channels.map((c) => (
                <button
                  key={c.ChatID}
                  type="button"
                  disabled={busy}
                  onClick={() => save({ chatId: c.ChatID })}
                  className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm text-sky-800 hover:bg-sky-100"
                >
                  {c.Title || c.ChatID}
                </button>
              ))}
              <button type="button" onClick={load} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                تحديث
              </button>
            </div>
            {!info.channels.length && <p className="mt-1 text-xs text-orange-600">البوت لسه ما شافش أي قناة.</p>}
          </>
        )}
      </div>

      {/* 2. App id / hash for reading the archive back */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          2. api_id و api_hash {info.apiId && info.hasApiHash && <span className="font-normal text-green-700">(متسجلين ✅)</span>}
        </label>
        <p className="mb-2 text-xs text-gray-500">
          من{" "}
          <a href="https://my.telegram.org/apps" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline" dir="ltr">
            my.telegram.org/apps
          </a>{" "}
          — بيستخدمهم السيرفر عشان يقرا رسايل القناة بالبوت نفسه، مش بحسابك.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            dir="ltr"
            placeholder="api_id"
            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            value={apiHash}
            onChange={(e) => setApiHash(e.target.value)}
            dir="ltr"
            type="password"
            autoComplete="off"
            placeholder={info.hasApiHash ? "api_hash (متسجل)" : "api_hash"}
            className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !apiId.trim() || !apiHash.trim()}
            onClick={() => save({ apiId, apiHash })}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            حفظ
          </button>
        </div>
      </div>

      {/* 3. End-to-end test */}
      <div>
        <button
          type="button"
          disabled={busy || !info.chatId}
          onClick={test}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {busy ? "..." : "3. تجربة الأرشيف"}
        </button>
        {steps && (
          <ul className="mt-2 space-y-1 text-sm">
            {steps.map((s) => (
              <li key={s.label} className={s.ok ? "text-green-700" : "text-red-600"}>
                {s.ok ? "✅" : "❌"} {s.label}
                {s.detail && <span className="text-xs text-gray-500"> — {s.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}

// Free-text message to linked users. The bot can only write to people who pressed Start (linked).
function TelegramMessageBox({ users }) {
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const linked = users.filter((u) => u.Linked);

  const send = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`${tgApi}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to === "all" ? "all" : [Number(to)], text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      const parts = [`✅ اتبعتت لـ ${data.sent}`];
      if (data.notLinked) parts.push(`${data.notLinked} ما ربطوش تليجرام فما وصلهمش`);
      if (data.failed?.length) parts.push(`فشلت: ${data.failed.join("، ")}`);
      setResult(parts.join(" · "));
      if (data.sent) setText("");
    } catch (err) {
      setResult(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <h3 className="font-semibold text-gray-800">إرسال رسالة على تليجرام</h3>
      {linked.length === 0 ? (
        <p className="text-sm text-orange-700">
          لسه محدش ربط تليجرام. البوت مش بيقدر يبعت لحد غير لما يربط الأول. ابدأ بحسابك من زرار "ربط تليجرام" اللي فوق.
        </p>
      ) : (
        <>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:w-80"
          >
            <option value="">اختار المستلم...</option>
            <option value="all">كل المدربين اللي ربطوا</option>
            {linked.map((u) => (
              <option key={u.UserID} value={u.UserID}>
                {u.FullName} — {u.Username || u.Email}
                {String(u.Role).toLowerCase() === "superadmin" ? " (سوبر أدمن)" : ""}
                {" ← تليجرام: "}
                {u.TelegramUsername ? `@${u.TelegramUsername}` : u.TelegramName}
              </option>
            ))}
          </select>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="اكتب الرسالة..."
            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !to || !text.trim()}
            onClick={send}
            className="flex items-center gap-1.5 rounded-md bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            <Send size={15} /> {busy ? "جاري الإرسال..." : "إرسال"}
          </button>
        </>
      )}
      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}
