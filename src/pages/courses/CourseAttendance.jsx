import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Download, Users, CalendarDays, Percent, AlertCircle, Clock, Video } from "lucide-react";
import { API } from "../tax/taxApi";
import { trainingDaysLabel } from "../../trainerSchedule";

// Attendance per lecture day. The days come from the lecture schedule (course
// timetable + online sessions, Riyadh time) and only approved students are
// listed - see acit-back/controllers/atendanceController.js.

const api = `${API.trim()}/atendance/courses`;

const STATUS = {
  Present: { label: "حاضر", short: "ح", cls: "bg-green-100 text-green-800 border-green-300", solid: "bg-green-600 text-white border-green-600" },
  Late: { label: "متأخر", short: "ت", cls: "bg-yellow-100 text-yellow-800 border-yellow-300", solid: "bg-yellow-500 text-white border-yellow-500" },
  Absent: { label: "غائب", short: "غ", cls: "bg-red-100 text-red-700 border-red-300", solid: "bg-red-600 text-white border-red-600" },
  Excused: { label: "بعذر", short: "ع", cls: "bg-blue-100 text-blue-800 border-blue-300", solid: "bg-blue-600 text-white border-blue-600" },
};
const ORDER = ["Present", "Late", "Absent", "Excused"];
// Clicking a cell in the table moves to the next status.
const NEXT = { "": "Present", Present: "Late", Late: "Absent", Absent: "Excused", Excused: "" };

const dayLabel = (day, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("ar-EG", { ...opts, timeZone: "UTC" });
const timeLabel = (d) =>
  d ? new Date(d).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "";

const request = async (url, body) => {
  const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};

export default function CourseAttendance() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showFuture, setShowFuture] = useState(false);
  const [saving, setSaving] = useState({}); // "regId|day" -> true

  const load = useCallback(async () => {
    try {
      setData(await request(`${api}/${courseId}/attendance`));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const heldDays = useMemo(() => (data ? data.days.filter((d) => d.day <= data.today) : []), [data]);
  const day = selectedDay || heldDays[heldDays.length - 1]?.day || null;
  const todayIsLecture = !!data && heldDays.some((d) => d.day === data.today);

  const statusOf = (regId, d) => data?.records[regId]?.[d]?.status || "";

  const students = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return q
      ? data.students.filter((s) => `${s.fullName} ${s.email} ${s.phone || ""}`.toLowerCase().includes(q))
      : data.students;
  }, [data, query]);

  // Attendance rate: (present + late) over the held days that weren't excused.
  const rateOf = useCallback(
    (regId) => {
      let attended = 0;
      let counted = 0;
      let unmarked = 0;
      heldDays.forEach(({ day: d }) => {
        const st = statusOf(regId, d);
        if (!st) unmarked += 1;
        if (st === "Excused") return;
        counted += 1;
        if (st === "Present" || st === "Late") attended += 1;
      });
      return { rate: counted ? Math.round((attended / counted) * 100) : null, attended, counted, unmarked };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, heldDays]
  );

  const stats = useMemo(() => {
    if (!data) return null;
    const rates = data.students.map((s) => rateOf(s.registrationId));
    const withRate = rates.filter((r) => r.rate !== null);
    return {
      students: data.students.length,
      held: heldDays.length,
      total: data.days.length,
      average: withRate.length ? Math.round(withRate.reduce((a, r) => a + r.rate, 0) / withRate.length) : null,
      unmarked: rates.reduce((a, r) => a + r.unmarked, 0),
    };
  }, [data, heldDays, rateOf]);

  const setStatus = async (regId, d, status) => {
    const key = `${regId}|${d}`;
    const prev = statusOf(regId, d);
    const apply = (st) =>
      setData((cur) => {
        const records = { ...cur.records, [regId]: { ...(cur.records[regId] || {}) } };
        if (st) records[regId][d] = { status: st, notes: "" };
        else delete records[regId][d];
        return { ...cur, records };
      });
    apply(status);
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await request(`${api}/${courseId}/registrations/${regId}/attendance`, { date: d, status });
    } catch (err) {
      apply(prev);
      setError(err.message);
    } finally {
      setSaving((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
    }
  };

  const markAll = async (status, onlyUnmarked) => {
    try {
      await request(`${api}/${courseId}/attendance/bulk`, { date: day, status, onlyUnmarked });
      await load();
      flash(onlyUnmarked ? `الباقيين اتسجلوا ${STATUS[status].label}` : `الكل اتسجل ${STATUS[status].label}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const exportCsv = () => {
    const cols = heldDays.map((d) => d.day);
    const header = ["الطالب", "الإيميل", "الموبايل", ...cols, "نسبة الحضور"];
    const rows = data.students.map((s) => {
      const r = rateOf(s.registrationId);
      return [s.fullName, s.email, s.phone || "", ...cols.map((d) => STATUS[statusOf(s.registrationId, d)]?.label || ""), r.rate === null ? "" : `${r.rate}%`];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${data.course.CourseCode || courseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data && !error) {
    return <div className="flex h-64 items-center justify-center text-gray-500">جاري تحميل الحضور...</div>;
  }
  if (!data) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-center shadow-md">
        <AlertCircle className="mx-auto mb-3 text-red-500" size={36} />
        <p className="text-red-600">{error}</p>
        <button type="button" onClick={load} className="mt-4 rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
          حاول تاني
        </button>
      </div>
    );
  }

  const { course } = data;
  const tableDays = showFuture ? data.days : heldDays;
  const dayInfo = data.days.find((d) => d.day === day);
  const dayCounts = ORDER.reduce((acc, st) => ({ ...acc, [st]: data.students.filter((s) => statusOf(s.registrationId, day) === st).length }), {});
  const dayUnmarked = data.students.length - ORDER.reduce((a, st) => a + dayCounts[st], 0);

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-5 px-2 py-6">
      {/* Header */}
      <div className="rounded-lg bg-white p-5 shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <button type="button" onClick={() => navigate(-1)} className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
              <ArrowRight size={15} /> رجوع
            </button>
            <h1 className="text-2xl font-bold text-gray-800">حضور: {course.CourseName}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              {course.CourseCode && <span>الكود: {course.CourseCode}</span>}
              {course.TrainerName && <span>المدرب: {course.TrainerName}</span>}
              <span>الأيام: {trainingDaysLabel(course.CourseDays)}</span>
              {course.LessonsTime && <span className="flex items-center gap-1"><Clock size={14} /> {course.LessonsTime}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative block">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن طالب"
                className="w-56 rounded-md border border-gray-300 py-2 pl-3 pr-9 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!heldDays.length || !data.students.length}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download size={15} /> تصدير Excel
            </button>
          </div>
        </div>
        {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">{notice}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} color="blue" label="الطلاب المقبولين" value={stats.students} />
        <Stat icon={CalendarDays} color="green" label="المحاضرات اللي اتعملت" value={`${stats.held} من ${stats.total}`} />
        <Stat icon={Percent} color="purple" label="متوسط الحضور" value={stats.average === null ? "—" : `${stats.average}%`} />
        <Stat icon={AlertCircle} color={stats.unmarked ? "orange" : "gray"} label="خانات لسه ما اتسجلتش" value={stats.unmarked} />
      </div>

      {data.students.length === 0 ? (
        <Empty text="مفيش طلاب مقبولين في الدورة دي لسه. الحضور بيظهر للطلاب اللي تسجيلهم اتقبل." />
      ) : data.days.length === 0 ? (
        <Empty text="مفيش محاضرات في جدول الدورة. اتأكد من تاريخ البداية والنهاية وأيام الدورة." />
      ) : heldDays.length === 0 ? (
        <Empty text={`الدورة لسه ما بدأتش. أول محاضرة يوم ${dayLabel(data.days[0].day, { weekday: "long", day: "numeric", month: "long" })}.`} />
      ) : (
        <>
          {/* Taking attendance for one day */}
          <div className="rounded-lg bg-white p-5 shadow-md">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  تسجيل الحضور
                  {day === data.today && <span className="mr-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">النهارده</span>}
                </h2>
                <p className="text-sm text-gray-500">
                  {dayInfo?.start && `المحاضرة الساعة ${timeLabel(dayInfo.start)}`}
                  {dayInfo?.online && <span className="mr-2 inline-flex items-center gap-1"><Video size={13} /> أونلاين</span>}
                  {!todayIsLecture && day === heldDays[heldDays.length - 1]?.day && " · مفيش محاضرة النهارده، دي آخر محاضرة"}
                </p>
              </div>
              <select
                value={day || ""}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {[...heldDays].reverse().map((d) => (
                  <option key={d.day} value={d.day}>
                    {dayLabel(d.day, { weekday: "long", day: "numeric", month: "long" })}
                    {d.day === data.today ? " (النهارده)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              {ORDER.map((st) => (
                <span key={st} className={`rounded-full border px-3 py-1 ${STATUS[st].cls}`}>
                  {STATUS[st].label}: {dayCounts[st]}
                </span>
              ))}
              {dayUnmarked > 0 && <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-600">ما اتسجلش: {dayUnmarked}</span>}
              <div className="mr-auto flex flex-wrap gap-2">
                <button type="button" onClick={() => markAll("Present", false)} className="rounded-md bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">
                  الكل حاضر
                </button>
                {dayUnmarked > 0 && dayUnmarked < data.students.length && (
                  <button type="button" onClick={() => markAll("Absent", true)} className="rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">
                    الباقيين غائب
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 divide-y divide-gray-100 rounded border">
              {students.map((s) => {
                const current = statusOf(s.registrationId, day);
                return (
                  <div key={s.registrationId} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{s.fullName}</div>
                      <div className="truncate text-xs text-gray-500" dir="ltr">{s.phone || s.email}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {ORDER.map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={!!saving[`${s.registrationId}|${day}`]}
                          onClick={() => setStatus(s.registrationId, day, current === st ? "" : st)}
                          className={`rounded-md border px-3 py-1.5 text-sm transition ${current === st ? STATUS[st].solid : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
                        >
                          {STATUS[st].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && <p className="p-4 text-center text-sm text-gray-500">مفيش طالب بالاسم ده.</p>}
            </div>
          </div>

          {/* The whole course */}
          <div className="rounded-lg bg-white p-5 shadow-md">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-800">سجل الحضور كله</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {ORDER.map((st) => (
                  <span key={st} className="flex items-center gap-1">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded border ${STATUS[st].cls}`}>{STATUS[st].short}</span>
                    {STATUS[st].label}
                  </span>
                ))}
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={showFuture} onChange={(e) => setShowFuture(e.target.checked)} />
                  إظهار المحاضرات الجاية
                </label>
              </div>
            </div>
            <p className="mb-2 text-xs text-gray-400">اضغط على أي خانة عشان تغيّرها (حاضر ← متأخر ← غائب ← بعذر ← فاضي).</p>
            <div className="overflow-x-auto rounded border">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-600">
                    <th className="sticky right-0 z-10 min-w-[180px] border-b border-l bg-gray-50 px-3 py-2 text-right font-semibold">الطالب</th>
                    <th className="border-b border-l px-2 py-2 font-semibold">النسبة</th>
                    {tableDays.map((d) => (
                      <th
                        key={d.day}
                        className={`min-w-[56px] border-b border-l px-1 py-2 font-medium ${d.day === data.today ? "bg-blue-100 text-blue-800" : d.day > data.today ? "text-gray-400" : ""}`}
                      >
                        <div>{dayLabel(d.day, { weekday: "short" })}</div>
                        <div className="whitespace-nowrap">{dayLabel(d.day, { day: "numeric", month: "numeric" })}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const r = rateOf(s.registrationId);
                    return (
                      <tr key={s.registrationId} className="hover:bg-gray-50">
                        <td className="sticky right-0 z-10 border-b border-l bg-white px-3 py-2">
                          <div className="font-medium text-gray-900">{s.fullName}</div>
                          <div className="text-xs text-gray-400" dir="ltr">{s.email}</div>
                        </td>
                        <td className="border-b border-l px-2 py-2 text-center">
                          <span className={`font-bold ${r.rate === null ? "text-gray-400" : r.rate >= 75 ? "text-green-700" : r.rate >= 50 ? "text-yellow-700" : "text-red-600"}`}>
                            {r.rate === null ? "—" : `${r.rate}%`}
                          </span>
                          <div className="text-[11px] text-gray-400">{r.attended}/{r.counted}</div>
                        </td>
                        {tableDays.map((d) => {
                          const st = statusOf(s.registrationId, d.day);
                          const future = d.day > data.today;
                          return (
                            <td key={d.day} className={`border-b border-l p-1 text-center ${d.day === data.today ? "bg-blue-50" : ""}`}>
                              {future ? (
                                <span className="text-gray-300">·</span>
                              ) : (
                                <button
                                  type="button"
                                  title={STATUS[st]?.label || "ما اتسجلش"}
                                  disabled={!!saving[`${s.registrationId}|${d.day}`]}
                                  onClick={() => setStatus(s.registrationId, d.day, NEXT[st])}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded border text-sm font-bold ${
                                    st ? STATUS[st].cls : "border-dashed border-gray-300 text-gray-300 hover:border-gray-400"
                                  }`}
                                >
                                  {STATUS[st]?.short || "؟"}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const COLORS = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  purple: "bg-purple-50 text-purple-700",
  orange: "bg-orange-50 text-orange-700",
  gray: "bg-gray-50 text-gray-600",
};

const Stat = ({ icon: Icon, color, label, value }) => (
  <div className={`rounded-lg p-4 shadow-sm ${COLORS[color]}`}>
    <div className="flex items-center gap-2 text-sm font-medium opacity-90">
      <Icon size={16} /> {label}
    </div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
  </div>
);

const Empty = ({ text }) => (
  <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow-md">
    <CalendarDays className="mx-auto mb-3 text-gray-300" size={40} />
    {text}
  </div>
);
