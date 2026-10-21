import React, { useCallback, useEffect, useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { API } from "../pages/tax/taxApi";

// The signed-in user's own Telegram link for lecture alerts (acit-back/routes/telegramRoutes.js).
// Hidden until the super admin has set up the bot.
const api = `${API.trim()}/telegram/me`;

export default function TelegramLinkCard({ compact = false }) {
  const [me, setMe] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(api);
      if (res.ok) setMe(await res.json());
    } catch {
      /* the card just stays hidden */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // After opening Telegram, check back for the link a few times.
  const openLink = () => {
    window.open(me.link, "_blank", "noopener");
    [5000, 15000, 30000, 60000].forEach((ms) => setTimeout(load, ms));
  };

  const unlink = async () => {
    if (!window.confirm("فك ربط تليجرام؟ مش هتوصلك تنبيهات المحاضرات هناك.")) return;
    const res = await fetch(`${api}/unlink`, { method: "POST" });
    if (res.ok) setMe({ ...me, ...(await res.json()) });
  };

  if (!me?.configured || !me.link) return null;

  if (me.linked) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-sky-900">
          <CheckCircle2 size={16} className="text-green-600" />
          تنبيهات المحاضرات بتوصلك على تليجرام
          {me.telegramName || me.telegramUsername ? (
            <>
              {" "}— حساب <b>{me.telegramName}</b>
              {me.telegramUsername && <span dir="ltr"> @{me.telegramUsername}</span>}
            </>
          ) : null}
          .
        </span>
        <button type="button" onClick={unlink} className="text-xs text-gray-500 hover:text-red-600">
          فك الربط
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3">
      <div className="text-sm text-sky-900">
        <b>اربط تليجرام</b>
        {!compact && " عشان توصلك تنبيهات محاضراتك على الموبايل، وتأكّد حضورك من الرسالة على طول."}
      </div>
      <button
        type="button"
        onClick={openLink}
        className="flex items-center gap-1.5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
      >
        <Send size={15} /> ربط تليجرام
      </button>
    </div>
  );
}
