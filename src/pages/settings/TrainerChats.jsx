import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Paperclip, ArrowRight, Trash2 } from "lucide-react";
import { API } from "../tax/taxApi";

// Trainer chats: the conversation between each trainer and the admins, carried
// over the Telegram bot. A trainer writes to the bot, it shows up here; a reply
// typed here reaches the trainer on Telegram. Super admin only
// (acit-back/routes/telegramRoutes.js /chats).
const api = `${API.trim()}/telegram`;

const call = async (path, options = {}) => {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  return body;
};

const time = (d) =>
  d ? new Date(d).toLocaleString("ar-EG", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }) : "";

const MEDIA = {
  photo: "صورة", voice: "رسالة صوتية", audio: "ملف صوت", video: "فيديو", video_note: "فيديو",
  document: "ملف", sticker: "ستيكر", animation: "صورة متحركة",
};

const preview = (c) =>
  c.LastPurged
    ? "📦 في الأرشيف"
    : c.LastBody || (c.LastMediaType ? `📎 ${MEDIA[c.LastMediaType] || "ملف"}` : c.LastAt ? "" : c.Linked ? "لسه مفيش رسايل" : "");

export default function TrainerChats() {
  const [chats, setChats] = useState(null);
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [version, setVersion] = useState(0); // remounts the open conversation after a restore

  // Brings back every message the archive channel has and the dashboard lost.
  const restore = async () => {
    if (!window.confirm("استرجاع كل الرسايل اللي في قناة الأرشيف ومش ظاهرة هنا (حتى اللي اتمسحت بإيدك)؟")) return;
    setRestoring(true);
    setRestoreMsg("");
    try {
      const r = await call("/archive/restore", { method: "POST" });
      setRestoreMsg(r.restored ? `✅ اترجع ${r.restored} رسالة من الأرشيف` : "مفيش رسايل ناقصة، كل اللي في الأرشيف ظاهر هنا");
      await loadChats();
      setVersion((v) => v + 1);
    } catch (err) {
      setRestoreMsg(`❌ ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const loadChats = useCallback(async () => {
    try {
      const data = await call("/chats");
      setChats(data.chats);
      setRunning(data.running);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadChats();
    const t = setInterval(loadChats, 10000);
    return () => clearInterval(t);
  }, [loadChats]);

  const current = chats?.find((c) => c.UserID === selected) || null;

  return (
    <div dir="rtl" className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 rounded-lg bg-white p-5 shadow-md">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <MessageSquare className="text-sky-500" /> محادثات المدربين
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          أي رسالة المدرب يبعتها لبوت تليجرام بتظهر هنا، وردك من هنا بيوصله على تليجرام. المدرب لازم يكون رابط تليجرام
          (من صفحة "تنبيهات المحاضرات").
        </p>
        <p className="mt-1 text-xs text-gray-400">
          الرسايل بتتمسح من هنا بعد 3 أسابيع، ونسختها بتفضل في قناة الأرشيف على تليجرام. دوس "تحميل الرسايل الأقدم" جوه المحادثة عشان ترجّعها.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={restore}
            disabled={restoring}
            className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm text-sky-800 hover:bg-sky-100 disabled:opacity-60"
          >
            {restoring ? "جاري الاسترجاع..." : "📦 استرجاع من الأرشيف"}
          </button>
          {restoreMsg && <span className="text-sm">{restoreMsg}</span>}
        </div>
        {!running && <p className="mt-2 text-sm text-red-600">البوت مش شغال دلوقتي، الرسايل مش هتتبعت ولا هتوصل.</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex h-[70vh] overflow-hidden rounded-lg bg-white shadow-md">
        {/* Trainer list (hidden on phones while a chat is open) */}
        <div className={`w-full border-l md:w-80 md:shrink-0 ${current ? "hidden md:block" : "block"} overflow-y-auto`}>
          {!chats ? (
            <p className="p-4 text-sm text-gray-500">جاري التحميل...</p>
          ) : chats.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">مفيش مدربين رابطين تليجرام لسه.</p>
          ) : (
            chats.map((c) => (
              <button
                key={c.UserID}
                type="button"
                onClick={() => setSelected(c.UserID)}
                className={`block w-full border-b px-4 py-3 text-right hover:bg-gray-50 ${selected === c.UserID ? "bg-sky-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-gray-800">{c.FullName}</span>
                  {c.Unread > 0 && (
                    <span className="min-w-[20px] rounded-full bg-sky-500 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                      {c.Unread}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="truncate">
                    {c.LastDirection === "out" && "انت: "}
                    {preview(c)}
                  </span>
                  <span className="shrink-0">{time(c.LastAt)}</span>
                </div>
                {!c.Linked && <div className="mt-0.5 text-[11px] text-orange-600">فك ربط تليجرام</div>}
              </button>
            ))
          )}
        </div>

        {/* Conversation */}
        <div className={`min-w-0 flex-1 ${current ? "flex" : "hidden md:flex"} flex-col`}>
          {current ? (
            <Conversation key={`${current.UserID}:${version}`} trainer={current} onBack={() => setSelected(null)} onChange={loadChats} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">اختار مدرب عشان تشوف المحادثة</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Conversation({ trainer, onBack, onChange }) {
  const [messages, setMessages] = useState(null);
  const [older, setOlder] = useState([]); // read back from the archive channel
  const [archived, setArchived] = useState(0); // still in the archive only
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef(null);
  const lastId = useRef(0);
  const stickToBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await call(`/chats/${trainer.UserID}?after=${lastId.current}`);
      if (lastId.current === 0) setArchived(data.archived);
      if (data.messages.length) {
        lastId.current = data.messages[data.messages.length - 1].ID;
        stickToBottom.current = true;
        setMessages((prev) => [...(prev || []), ...data.messages]);
        onChange();
      } else {
        setMessages((prev) => prev || []);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [trainer.UserID, onChange]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (stickToBottom.current) bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Deleting is from the dashboard's database only; Telegram keeps its copies.
  const removeMessage = async (m) => {
    if (!window.confirm("مسح الرسالة دي من الداشبورد؟ (نسختها في تليجرام مش هتتمسح)")) return;
    try {
      await call(`/chats/${trainer.UserID}/messages/${m.ID}`, { method: "DELETE" });
      setMessages((prev) => (prev || []).filter((x) => x.ID !== m.ID));
      setOlder((prev) => prev.filter((x) => x.ID !== m.ID));
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeAll = async () => {
    if (!window.confirm(`مسح محادثة ${trainer.FullName} كلها من الداشبورد؟ مش هتقدر ترجعها هنا تاني (نسختها في تليجرام مش هتتمسح).`)) return;
    try {
      await call(`/chats/${trainer.UserID}`, { method: "DELETE" });
      setMessages([]);
      setOlder([]);
      setArchived(0);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const loadOlder = async () => {
    setLoadingOlder(true);
    setError("");
    try {
      // Paged by the message number in the archive channel (chronological).
      const before = older[0]?.ArchiveMessageID || 0;
      const data = await call(`/chats/${trainer.UserID}/archive?before=${before}`);
      stickToBottom.current = false;
      setOlder((prev) => [...data.messages, ...prev]);
      setArchived(data.remaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      await call(`/chats/${trainer.UserID}`, { method: "POST", body: JSON.stringify({ text: body }) });
      setText("");
      await load();
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button type="button" onClick={onBack} className="text-gray-500 md:hidden" aria-label="رجوع">
          <ArrowRight size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-gray-800">{trainer.FullName}</div>
          <div className="truncate text-xs text-gray-500" dir="ltr">
            {[trainer.Username || trainer.Email, trainer.TelegramUsername && `@${trainer.TelegramUsername}`].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button
          type="button"
          onClick={removeAll}
          className="flex shrink-0 items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          <Trash2 size={13} /> مسح المحادثة
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-4 py-3">
        {archived > 0 && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-60"
            >
              {loadingOlder ? "جاري التحميل من الأرشيف..." : `📦 تحميل الرسايل الأقدم من الأرشيف (${archived})`}
            </button>
          </div>
        )}
        {older.map((m) => (
          <Bubble key={`a${m.ID}`} m={m} onDelete={removeMessage} />
        ))}
        {!messages ? (
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        ) : messages.length === 0 && !older.length && !archived ? (
          <p className="text-center text-sm text-gray-400">لسه مفيش رسايل. اكتب أول رسالة تحت.</p>
        ) : (
          messages.map((m) => <Bubble key={m.ID} m={m} onDelete={removeMessage} />)
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t p-3">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        {!trainer.Linked && <p className="mb-2 text-xs text-orange-600">المدرب فك ربط تليجرام، ردك مش هيوصله.</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
            rows={2}
            maxLength={3900}
            placeholder="اكتب ردك... (Enter للإرسال، Shift+Enter لسطر جديد)"
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim() || !trainer.Linked}
            className="flex items-center gap-1 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            <Send size={15} /> إرسال
          </button>
        </div>
      </form>
    </>
  );
}

function Bubble({ m, onDelete }) {
  const mine = m.Direction === "out";
  return (
    // Arabic chat apps put your own messages on the left (justify-end in RTL).
    <div className={`group flex items-center gap-1 ${mine ? "flex-row-reverse justify-start" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${
          mine ? "bg-sky-500 text-white" : "bg-white text-gray-800"
        }`}
      >
        {mine && m.AdminName && <div className="mb-0.5 text-[11px] opacity-80">{m.AdminName}</div>}
        {m.Missing && <div className="text-xs italic opacity-80">الرسالة دي اتمسحت من قناة الأرشيف</div>}
        {m.HasFile && <Attachment m={m} />}
        {m.Body && <div className="whitespace-pre-wrap break-words">{m.Body}</div>}
        <div className={`mt-1 text-[10px] ${mine ? "text-sky-100" : "text-gray-400"}`}>
          {m.Archived && "📦 "}
          {time(m.CreatedAt)}
          {m.Status === "failed" && <span className="mr-1 font-semibold text-red-200">· ما اتبعتش{m.Error ? `: ${m.Error}` : ""}</span>}
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(m)}
          title="مسح الرسالة"
          className="rounded p-1 text-gray-300 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

// Files come through the API with the login token, so they are fetched and
// shown from a blob URL (an <img src> to the API would carry no token).
function Attachment({ m }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const label = MEDIA[m.MediaType] || "ملف";
  const inline = ["photo", "sticker", "voice", "audio", "video", "video_note", "animation"].includes(m.MediaType);

  const fetchFile = useCallback(async () => {
    try {
      const res = await fetch(`${api}/${m.Archived ? "chat-archive-files" : "chat-files"}/${m.ID}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      return objectUrl;
    } catch {
      setFailed(true);
      return null;
    }
  }, [m.ID, m.Archived]);

  useEffect(() => {
    if (inline) fetchFile();
  }, [inline, fetchFile]);

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  if (failed) return <div className="mb-1 text-xs opacity-80">📎 {label} (تعذر التحميل)</div>;

  if (m.MediaType === "photo" || m.MediaType === "sticker") {
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={label} className="mb-1 max-h-64 rounded" />
      </a>
    ) : (
      <div className="mb-1 text-xs opacity-80">جاري تحميل {label}...</div>
    );
  }
  if (["voice", "audio"].includes(m.MediaType)) {
    return url ? <audio controls src={url} className="mb-1 max-w-full" /> : <div className="mb-1 text-xs opacity-80">جاري تحميل {label}...</div>;
  }
  if (["video", "video_note", "animation"].includes(m.MediaType)) {
    return url ? <video controls src={url} className="mb-1 max-h-64 rounded" /> : <div className="mb-1 text-xs opacity-80">جاري تحميل {label}...</div>;
  }
  return (
    <button
      type="button"
      onClick={async () => {
        const u = url || (await fetchFile());
        if (!u) return;
        const a = document.createElement("a");
        a.href = u;
        a.download = m.FileName || "file";
        a.click();
      }}
      className="mb-1 flex items-center gap-1 text-xs underline"
    >
      <Paperclip size={13} /> {m.FileName || label}
    </button>
  );
}
