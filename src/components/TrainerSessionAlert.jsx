import React, { useEffect, useMemo, useState } from "react";
import { AlarmClock, CheckCircle2, ExternalLink, X } from "lucide-react";
import { useAuth } from "../AuthContext";
import {
  useTrainerSchedule, lecturesBetween, lectureState, countdown, fmtTime, canConfirmAt, CONFIRM_BEFORE_MS, safeUrl,
} from "../trainerSchedule";

// Shown to a trainer anywhere in the dashboard. An hour before each of their
// lectures a window opens with a live countdown; until 15 minutes before the
// start it can be put aside (it shrinks to a countdown chip in the corner).
// From 15 minutes before, confirming opens and the window stays until they
// confirm. After confirming, the chip stays until the lecture starts.


const TrainerSessionAlert = () => {
  const { access } = useAuth();
  const isTrainer = !!access && !access.isSuperAdmin && access.role === "trainer";
  const { data, confirmations, confirm } = useTrainerSchedule(isTrainer);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hiddenChips, setHiddenChips] = useState({});
  const [setAside, setSetAside] = useState({}); // lectures whose early alert was put aside

  useEffect(() => {
    if (!isTrainer) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isTrainer]);

  // Today's lectures (and yesterday's, for one that runs past midnight) - recomputed once a minute.
  const minute = Math.floor(now / 60000);
  const lectures = useMemo(() => {
    const today = new Date(minute * 60000);
    const yesterday = new Date(today.getTime() - 86400000);
    return lecturesBetween(data, yesterday, today);
  }, [data, minute]);

  if (!isTrainer) return null;

  const active = lectures.filter((l) => ["soon", "live"].includes(lectureState(l, now)));
  const unconfirmed = active.filter((l) => !confirmations[l.key]);
  // Before the confirm window the alert can be put aside; once it opens it comes back and stays.
  const pending = unconfirmed.find((l) => canConfirmAt(l, now) || !setAside[l.key]);
  const pendingOpen = !!pending && canConfirmAt(pending, now);
  const chips = active.filter((l) => l !== pending && !hiddenChips[l.key]);

  const onConfirm = async () => {
    setBusy(true);
    setError("");
    try {
      await confirm(pending);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {pending && (
        <div dir="rtl" className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className={`p-5 text-white ${lectureState(pending, now) === "live" ? "bg-red-600" : "bg-blue-600"}`}>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <AlarmClock size={18} />
                {lectureState(pending, now) === "live" ? "المحاضرة بدأت" : "متبقي على المحاضرة"}
              </div>
              <div className="mt-2 text-center font-mono text-5xl font-bold tracking-wider" dir="ltr">
                {lectureState(pending, now) === "live" ? `+${countdown(now - pending.start.getTime())}` : countdown(pending.start.getTime() - now)}
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{pending.title}</h3>
                {pending.title !== pending.course.CourseName && <p className="text-sm text-gray-500">{pending.course.CourseName}</p>}
                <p className="mt-1 text-sm text-gray-600">
                  الساعة {fmtTime(pending.start)}{pending.end ? ` حتى ${fmtTime(pending.end)}` : ""}
                  {pending.platform ? ` · ${pending.platform}` : ""}
                </p>
              </div>
              <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                {pendingOpen
                  ? "من فضلك أكّد إنك جاهز للمحاضرة. التأكيد بيوصل للإدارة."
                  : `التأكيد بيفتح قبل المحاضرة بربع ساعة (الساعة ${fmtTime(new Date(pending.start.getTime() - CONFIRM_BEFORE_MS))}).`}
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {pendingOpen ? (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={20} /> {busy ? "جاري التأكيد..." : "تأكيد — أنا جاهز للمحاضرة"}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-200 py-3 font-semibold text-gray-500"
                  >
                    <CheckCircle2 size={20} /> التأكيد بعد{" "}
                    <span dir="ltr" className="font-mono">{countdown(pending.start.getTime() - CONFIRM_BEFORE_MS - now)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetAside((h) => ({ ...h, [pending.key]: true }))}
                    className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    تمام، فكّرني وقت التأكيد
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div dir="rtl" className="fixed bottom-4 left-4 z-[900] space-y-2">
          {chips.map((l) => {
            const live = lectureState(l, now) === "live";
            const done = !!confirmations[l.key];
            return (
              <div key={l.key} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg ${live ? "bg-red-600" : "bg-blue-600"}`}>
                <AlarmClock size={18} />
                <div className="text-sm">
                  <div className="font-semibold">{l.title}</div>
                  <div className="opacity-90">
                    {live ? "المحاضرة شغالة الآن" : <>تبدأ بعد <span dir="ltr" className="font-mono">{countdown(l.start.getTime() - now)}</span></>}
                  </div>
                  {!done && (
                    <div className="text-xs opacity-90">
                      التأكيد بعد <span dir="ltr" className="font-mono">{countdown(l.start.getTime() - CONFIRM_BEFORE_MS - now)}</span>
                    </div>
                  )}
                </div>
                {safeUrl(l.meetingURL) && (
                  <a href={safeUrl(l.meetingURL)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded bg-white/20 px-2 py-1 text-xs hover:bg-white/30">
                    <ExternalLink size={13} /> دخول
                  </a>
                )}
                {done && (
                  <button type="button" onClick={() => setHiddenChips((h) => ({ ...h, [l.key]: true }))} className="opacity-80 hover:opacity-100" aria-label="إخفاء">
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default TrainerSessionAlert;
