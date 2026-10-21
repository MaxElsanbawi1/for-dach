import { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "./pages/tax/taxApi";

// Trainers' lectures, worked out in the viewer's local time from the data that
// GET /api/trainer-schedule returns (see acit-back/controllers/trainerScheduleController.js):
// the online sessions of a day when the course has any, else the course's own
// timetable (CourseDays + LessonsTime). Used by the trainers' page ("النهارده"
// tab) and by the alert that asks a trainer to confirm an hour before a lecture.

const api = API.trim();

/**
 * A meeting link safe to put in href: http(s) only, "https://" added to links
 * pasted without a scheme. Anything else (javascript:, data:...) -> "".
 */
export const safeUrl = (url) => {
  const u = String(url || "").trim();
  if (!u) return "";
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
  } catch {
    return "";
  }
};

export const ALERT_BEFORE_MS = 60 * 60 * 1000; // the countdown alert appears
export const CONFIRM_BEFORE_MS = 15 * 60 * 1000; // confirming opens (the API enforces the same window)

/** Confirming is open from 15 minutes before the start until the lecture ends. */
export const canConfirmAt = (lecture, now) =>
  !!lecture.start && now >= lecture.start.getTime() - CONFIRM_BEFORE_MS && now < (lecture.end || lecture.start).getTime();


const toLatinDigits = (s) =>
  String(s)
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/‏|‎/g, "");

// "20:00", "8:00 م", "8:00 PM" -> minutes after midnight (same rules as the API's parseSessionTime).
const parseTime = (value) => {
  const m = toLatinDigits(value || "").trim().match(/(\d{1,2})(?::(\d{2}))?\s*(ص|صباح|صباحا|صباحًا|am|م|مساء|مساءا|مساءً|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const marker = (m[3] || "").toLowerCase();
  if ((marker.includes("pm") || marker.includes("م")) && h < 12) h += 12;
  if ((marker.includes("am") || marker.includes("ص")) && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** LessonsTime ("20:00 - 22:00", "من 8:00 م إلى 10:00 م") -> { start, end } in minutes; either may be null. */
export const parseLessonsTime = (text) => {
  if (!text) return { start: null, end: null };
  const parts = toLatinDigits(text)
    .replace(/\s+إلى\s+|\s+الى\s+|\s+حتى\s+/g, " - ")
    .replace(/من\s+/g, "")
    .split(/\s*-\s*/);
  return { start: parseTime(parts[0]), end: parts.length > 1 ? parseTime(parts.slice(1).join(" - ")) : null };
};

// Same days as the API (getCourseTrainingDays): weekends Thu-Fri, otherwise Sun-Wed.
export const trainingDays = (courseDays) =>
  String(courseDays || "").toLowerCase().includes("weekend") ? [4, 5] : [0, 1, 2, 3];

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const trainingDaysLabel = (courseDays) => {
  const days = trainingDays(courseDays);
  return days.length > 2 ? `${DAY_NAMES[days[0]]} - ${DAY_NAMES[days[days.length - 1]]}` : days.map((d) => DAY_NAMES[d]).join(" و");
};

// Days and times are on the academy's clock, Riyadh (UTC+3 all year), whatever
// the viewer's device is set to - the same as the API's services/lectureSchedule.js,
// so lecture keys (and confirmations) match the WhatsApp reminders.
const RIYADH_OFFSET_MS = 3 * 3600 * 1000;
const DAY_MS = 86400000;
/** YYYY-MM-DD of an instant on the Riyadh calendar. */
export const dayKey = (t) => new Date(new Date(t).getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10);
const atMinutes = (day, minutes) => new Date(Date.parse(`${day}T00:00:00Z`) - RIYADH_OFFSET_MS + minutes * 60000);
const nextDay = (day) => new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();

/**
 * The lectures between two days (inclusive, Riyadh calendar), sorted by start.
 * Each: { key, day (YYYY-MM-DD), courseId, course, title, start: Date|null, end: Date|null, meetingURL, platform, online }
 * start is null when the course has no readable LessonsTime.
 */
export function lecturesBetween(data, fromDay, toDay) {
  if (!data) return [];
  const out = [];
  const liveByCourseDay = {};
  data.liveSessions.forEach((s) => {
    const k = `${s.CourseID}|${dayKey(s.ScheduledStart)}`;
    (liveByCourseDay[k] ||= []).push(s);
  });
  const courseById = Object.fromEntries(data.courses.map((c) => [c.CourseID, c]));
  const first = dayKey(fromDay);
  const last = dayKey(toDay);

  data.courses.forEach((course) => {
    const courseStart = course.StartingTime ? dayKey(course.StartingTime) : null;
    const courseEnd = course.EndingTime ? dayKey(course.EndingTime) : null;
    const days = trainingDays(course.CourseDays);
    const { start, end } = parseLessonsTime(course.LessonsTime);

    for (let day = first; day <= last; day = nextDay(day)) {
      if (liveByCourseDay[`${course.CourseID}|${day}`]) continue; // online sessions take this day
      if (!courseStart || day < courseStart || (courseEnd && day > courseEnd)) continue;
      if (!days.includes(weekday(day))) continue;
      const s = start === null ? null : atMinutes(day, start);
      let e = end === null || start === null ? null : atMinutes(day, end);
      if (s && e && e <= s) e = new Date(e.getTime() + DAY_MS); // runs past midnight
      out.push({
        key: `course-${course.CourseID}-${day}`,
        day,
        courseId: course.CourseID,
        course,
        title: course.CourseName,
        start: s,
        end: e || (s ? new Date(s.getTime() + 2 * 3600000) : null),
        meetingURL: "",
        platform: "",
        online: false,
      });
    }
  });

  data.liveSessions.forEach((s) => {
    const start = new Date(s.ScheduledStart);
    const day = dayKey(start);
    if (day < first || day > last || !courseById[s.CourseID]) return;
    out.push({
      key: `live-${s.SessionID}`,
      day,
      courseId: s.CourseID,
      course: courseById[s.CourseID],
      title: s.Title || courseById[s.CourseID].CourseName,
      start,
      end: new Date(s.ScheduledEnd),
      meetingURL: s.MeetingURL || "",
      platform: s.Platform || "",
      online: true,
    });
  });

  return out.sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));
}

/** Where a lecture stands at `now`: upcoming | soon (within the hour) | live | ended | unknown (no time). */
export function lectureState(lecture, now) {
  if (!lecture.start) return "unknown";
  const s = lecture.start.getTime();
  const e = lecture.end ? lecture.end.getTime() : s;
  if (now >= e) return "ended";
  if (now >= s) return "live";
  if (s - now <= ALERT_BEFORE_MS) return "soon";
  return "upcoming";
}

/** "01:05:09" / "05:09" */
export const countdown = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

// Riyadh time, matching the course's written LessonsTime and the WhatsApp messages.
export const fmtTime = (d) =>
  d ? d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "الوقت غير محدد";

/** Loads /api/trainer-schedule, refreshes it every few minutes, and confirms lectures. */
export function useTrainerSchedule(enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${api}/trainer-schedule`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setData({ courses: body.courses || [], liveSessions: body.liveSessions || [], confirmations: body.confirmations || [] });
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [enabled, load]);

  const confirmations = useMemo(() => {
    const m = {};
    (data?.confirmations || []).forEach((c) => { m[c.SessionKey] = c; });
    return m;
  }, [data]);

  const confirm = useCallback(async (lecture) => {
    const res = await fetch(`${api}/trainer-schedule/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionKey: lecture.key, courseId: lecture.courseId, sessionStart: lecture.start?.toISOString() }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || "تعذر حفظ التأكيد");
    setData((d) => d && { ...d, confirmations: [...d.confirmations.filter((c) => c.SessionKey !== body.SessionKey), body] });
    return body;
  }, []);

  // Super admin: undo a confirmation.
  const cancelConfirmation = useCallback(async (lecture) => {
    const res = await fetch(`${api}/trainer-schedule/confirm/${encodeURIComponent(lecture.key)}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || "تعذر إلغاء التأكيد");
    setData((d) => d && { ...d, confirmations: d.confirmations.filter((c) => c.SessionKey !== lecture.key) });
  }, []);

  return { data, error, confirmations, confirm, cancelConfirmation, reload: load };
}
