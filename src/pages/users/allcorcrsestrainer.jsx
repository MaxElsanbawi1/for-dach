import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Video, FileQuestion, ClipboardCheck, Info, Users, Search, Calendar, Clock,
  ChevronDown, ChevronUp, Phone, Mail, ExternalLink, CheckCircle2, AlertCircle, AlarmClock,
} from "lucide-react";
import { API } from "../tax/taxApi";
import { useAuth } from "../../AuthContext";
import TelegramLinkCard from "../../components/TelegramLinkCard";
import { useDateRange, DateRangeBar, exportExcel } from "../../components/DateExport";
import {
  useTrainerSchedule, lecturesBetween, dayKey, canConfirmAt, safeUrl, lectureState, countdown, fmtTime, trainingDaysLabel,
} from "../../trainerSchedule";

const api = API.trim();

const TABS = [
  { id: "today", label: "النهارده" },
  { id: "running", label: "الجارية" },
  { id: "upcoming", label: "القادمة" },
  { id: "ended", label: "المنتهية" },
  { id: "all", label: "الكل" },
];

const courseState = (course, now) => {
  const start = new Date(course.StartingTime).getTime();
  const end = new Date(course.EndingTime).getTime();
  if (end && now > end) return "ended";
  if (start && now < start) return "upcoming";
  return "running";
};

// Links pasted from Meet's joining info have no scheme and would open as a path on our own site.
// Only http(s) links reach an href (see safeUrl in trainerSchedule.js).
const withScheme = safeUrl;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");
const fmtDateTime = (d) =>
  new Date(d).toLocaleString("ar-EG", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

const span = (diff) => {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return days > 0 ? `${days} يوم ${hours} ساعة` : hours > 0 ? `${hours} ساعة ${minutes} دقيقة` : `${minutes} دقيقة`;
};

const remaining = (course, now) => {
  const toStart = new Date(course.StartingTime).getTime() - now;
  if (toStart > 0) return { text: `تبدأ بعد: ${span(toStart)}`, cls: "bg-blue-100 text-blue-800" };
  const diff = new Date(course.EndingTime).getTime() - now;
  if (!(diff > 0)) return { text: "انتهت الدورة", cls: "bg-red-100 text-red-800" };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const text = `متبقي على الانتهاء: ${days > 0 ? `${days} يوم ${hours} ساعة` : hours > 0 ? `${hours} ساعة ${minutes} دقيقة` : `${minutes} دقيقة`}`;
  const cls =
    days > 7 ? "bg-green-100 text-green-800" : days > 3 ? "bg-yellow-100 text-yellow-800" : "bg-orange-100 text-orange-800";
  return { text, cls };
};

const getJson = async (url) => {
  const res = await fetch(url);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const isApproved = (r) => String(r.Status || "").toLowerCase() === "approved";

const STATE_LABELS = { running: "جارية", upcoming: "قادمة", ended: "منتهية" };

const Trainer1 = () => {
  const navigate = useNavigate();
  const { access } = useAuth();
  // Staff other than trainers (the super admin, admins) oversee every trainer's courses.
  const overseer = !!access && (access.isSuperAdmin || access.role !== "trainer");
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState(null); // null: pick the first tab that has something
  const [query, setQuery] = useState("");
  // Per course: { sessions: [...] | null, students: [...] | null }
  const [extra, setExtra] = useState({});
  const [openStudents, setOpenStudents] = useState(null);
  // Courses are matched on their start date, so a range picks the courses that began in it.
  const range = useDateRange();

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/");
      return;
    }
    if (!access) return;
    (async () => {
      try {
        let list;
        if (overseer) {
          const [trainerList, all] = await Promise.all([getJson(`${api}/courses/trainers`), getJson(`${api}/courses`)]);
          setTrainers(Array.isArray(trainerList) ? trainerList : []);
          list = (Array.isArray(all) ? all : []).filter((c) => c.InstructorID);
        } else {
          const profile = await getJson(`${api}/profile`);
          list = profile.trainerCourses || [];
        }
        setCourses(list);

        // Sessions and students for every course, in parallel; a failure only hides that piece.
        list.forEach((c) => {
          Promise.allSettled([
            getJson(`${api}/live-sessions/course/${c.CourseID}`),
            getJson(`${api}/registrations/course/${c.CourseID}`),
          ]).then(([s, r]) => {
            setExtra((prev) => ({
              ...prev,
              [c.CourseID]: {
                sessions: s.status === "fulfilled" && Array.isArray(s.value) ? s.value : null,
                students: r.status === "fulfilled" && Array.isArray(r.value) ? r.value : null,
              },
            }));
          });
        });
      } catch (err) {
        console.error("Error fetching trainer courses:", err);
        setError("تعذّر تحميل دوراتك. حاول مرة أخرى.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, access, overseer]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const schedule = useTrainerSchedule(!!access);
  const minute = Math.floor(now / 60000);
  // Lectures from today through the next week, in the selected trainer's scope.
  const lectures = useMemo(() => {
    const today = new Date(minute * 60000);
    const all = lecturesBetween(schedule.data, today, new Date(today.getTime() + 7 * 86400000));
    return trainerId === "all" ? all : all.filter((l) => String(l.course.InstructorID) === trainerId);
  }, [schedule.data, minute, trainerId]);
  const allTodayLectures = useMemo(() => {
    const d = dayKey(new Date(minute * 60000));
    return lectures.filter((l) => l.day === d);
  }, [lectures, minute]);
  const todayLectures = range.active
    ? allTodayLectures.filter((l) => range.contains(l.course?.StartingTime))
    : allTodayLectures;
  const nextLectureOf = useMemo(() => {
    const m = {};
    lectures.forEach((l) => {
      if (!l.start || lectureState(l, now) === "ended") return;
      if (!m[l.courseId]) m[l.courseId] = l;
    });
    return m;
  }, [lectures, now]);

  const coursesPerTrainer = useMemo(() => {
    const m = {};
    courses.forEach((c) => { m[c.InstructorID] = (m[c.InstructorID] || 0) + 1; });
    return m;
  }, [courses]);

  const inRange = range.filter(courses, (c) => c.StartingTime);
  const scoped = useMemo(
    () => (trainerId === "all" ? inRange : inRange.filter((c) => String(c.InstructorID) === trainerId)),
    [inRange, trainerId]
  );

  const counts = useMemo(() => {
    const c = { today: todayLectures.length, running: 0, upcoming: 0, ended: 0, all: scoped.length };
    scoped.forEach((course) => { c[courseState(course, now)] += 1; });
    return c;
  }, [scoped, now, todayLectures]);

  const activeTab = tab || (counts.today ? "today" : counts.running ? "running" : "all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((c) => {
      if (activeTab !== "all" && courseState(c, now) !== activeTab) return false;
      if (!q) return true;
      return `${c.CourseName} ${c.CourseCode} ${c.InstructorName || ""}`.toLowerCase().includes(q);
    });
  }, [scoped, activeTab, query, now]);

  // The today tab lists lectures, not courses; its export is the courses behind them.
  const exportRows =
    activeTab === "today"
      ? [...new Map(todayLectures.filter((l) => l.course).map((l) => [l.courseId, l.course])).values()]
      : visible;

  const exportColumns = [
    { header: "اسم الدورة", key: "CourseName" },
    { header: "الكود", key: "CourseCode" },
    ...(overseer ? [{ header: "المدرب", key: "InstructorName" }] : []),
    { header: "تاريخ البدء", key: "StartingTime" },
    { header: "تاريخ الانتهاء", key: "EndingTime" },
    { header: "الأيام", value: (c) => trainingDaysLabel(c.CourseDays) },
    { header: "وقت المحاضرات", key: "LessonsTime" },
    { header: "الحالة", value: (c) => STATE_LABELS[courseState(c, now)] },
    { header: "المسجلين", value: (c) => extra[c.CourseID]?.students?.length ?? "" },
    { header: "المقبولين", value: (c) => extra[c.CourseID]?.students?.filter(isApproved).length ?? "" },
  ];
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-xl font-semibold">جاري تحميل دوراتك...</div>;
  }
  if (error) {
    return <div className="flex h-screen items-center justify-center text-xl font-semibold text-red-500">{error}</div>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{overseer ? "دورات المدربين" : "دوراتي كمدرب"}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {overseer
                ? "متابعة كل مدرب ودوراته: الطلاب، المحاضرات، الدروس، الاختبارات والحضور."
                : "كل ما تحتاجه لإدارة دوراتك: الطلاب، المحاضرات، الدروس، الاختبارات والحضور."}
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
          {overseer && (
            <select
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:w-60"
            >
              <option value="all">كل المدربين ({courses.length} دورة)</option>
              {trainers.map((t) => (
                <option key={t.UserID} value={String(t.UserID)}>
                  {t.FullName || t.Username} ({coursesPerTrainer[t.UserID] || 0} دورة)
                </option>
              ))}
            </select>
          )}
          <label className="relative block md:w-72">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الدورة أو الكود"
              className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          </div>
        </div>

        <DateRangeBar
          range={range}
          count={exportRows.length}
          onExport={() =>
            exportExcel(overseer ? "دورات المدربين" : "دوراتي كمدرب", exportColumns, exportRows, { rangeLabel: range.label })
          }
        >
          <span className="text-xs text-gray-500">حسب تاريخ بداية الدورة</span>
        </DateRangeBar>

        {!overseer && <TelegramLinkCard />}

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === t.id ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label} <span className="opacity-75">({counts[t.id]})</span>
            </button>
          ))}
        </div>

        {activeTab === "today" ? (
          <TodayLectures
            lectures={todayLectures}
            now={now}
            showTrainer={overseer}
            confirmations={schedule.confirmations}
            canConfirm={!overseer}
            onConfirm={schedule.confirm}
            onCancel={access?.isSuperAdmin ? schedule.cancelConfirmation : null}
            error={schedule.data ? null : schedule.error}
            loading={!schedule.data && !schedule.error}
          />
        ) : visible.length === 0 ? (
          <p className="rounded-lg bg-white p-8 text-center text-gray-600 shadow-md">
            {scoped.length > 0
              ? "لا توجد دورات في هذا القسم."
              : overseer
                ? "لا توجد دورات مسندة لهذا المدرب."
                : "لا توجد دورات مسندة إليك حالياً."}
          </p>
        ) : (
          visible.map((course) => (
            <CourseCard
              key={course.CourseID}
              course={course}
              showTrainer={overseer}
              nextLecture={nextLectureOf[course.CourseID]}
              now={now}
              extra={extra[course.CourseID]}
              studentsOpen={openStudents === course.CourseID}
              onToggleStudents={() => setOpenStudents((id) => (id === course.CourseID ? null : course.CourseID))}
              navigate={navigate}
            />
          ))
        )}
      </div>
    </div>
  );
};

const CourseCard = ({ course, showTrainer, nextLecture, now, extra, studentsOpen, onToggleStudents, navigate }) => {
  const left = remaining(course, now);
  const id = course.CourseID;
  const students = extra?.students;
  const approved = students ? students.filter(isApproved) : [];

  // The coming week's lecture (online session or timetable day), else the next online session further out.
  const nextSession = nextLecture
    ? { Title: nextLecture.title, ScheduledStart: nextLecture.start, Platform: nextLecture.platform, MeetingURL: nextLecture.meetingURL }
    : extra?.sessions
      ?.filter((s) => new Date(s.ScheduledEnd).getTime() >= now)
      .sort((a, b) => new Date(a.ScheduledStart) - new Date(b.ScheduledStart))[0];
  const isLive = nextSession && new Date(nextSession.ScheduledStart).getTime() <= now;

  const actions = [
    { label: "تفاصيل الدورة", icon: Info, to: `/courses/${id}/details` },
    { label: "الدروس والفيديوهات", icon: BookOpen, to: `/courses/${id}/details#lessons` },
    { label: "الاختبارات", icon: FileQuestion, to: `/courses/${id}/details#quizzes` },
    { label: "المحاضرات الأونلاين", icon: Video, to: `/courses/${id}/details#sessions` },
    { label: "سجل الحضور", icon: ClipboardCheck, to: `/courses/${id}/attendance` },
  ];

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{course.CourseName}</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              {showTrainer && <span className="font-medium text-gray-700">المدرب: {course.InstructorName || "—"}</span>}
              <span>الكود: {course.CourseCode || "—"}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {fmtDate(course.StartingTime)} ← {fmtDate(course.EndingTime)}</span>
              <span>تبدأ: {fmtDate(course.StartingTime)}</span>
              <span>الأيام: {trainingDaysLabel(course.CourseDays)}</span>
              {course.LessonsTime && <span className="flex items-center gap-1"><Clock size={14} /> {course.LessonsTime}</span>}
            </div>
          </div>
          <span className={`shrink-0 self-start rounded-full px-3 py-1 text-sm font-semibold ${left.cls}`}>{left.text}</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className={`rounded-lg border p-3 ${isLive ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Video size={16} /> المحاضرة الجاية
              {isLive && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">مباشر الآن</span>}
            </div>
            {nextLecture ? null : !extra ? (
              <p className="text-sm text-gray-400">جاري التحميل...</p>
            ) : extra.sessions === null ? (
              <p className="text-sm text-gray-400">تعذّر تحميل المحاضرات.</p>
            ) : null}
            {nextSession ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <b className="text-gray-900">{nextSession.Title}</b>
                  <p className="text-gray-500">{fmtDateTime(nextSession.ScheduledStart)}{nextSession.Platform ? ` · ${nextSession.Platform}` : ""}</p>
                </div>
                {withScheme(nextSession.MeetingURL) && (
                  <a
                    href={withScheme(nextSession.MeetingURL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                  >
                    <ExternalLink size={14} /> دخول المحاضرة
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                لا توجد محاضرات قادمة.{" "}
                <button type="button" onClick={() => navigate(`/courses/${id}/details#sessions`)} className="text-blue-600 hover:underline">
                  أضف محاضرة
                </button>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleStudents}
            disabled={!students}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-right hover:bg-gray-100 disabled:cursor-default disabled:hover:bg-gray-50"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Users size={16} /> طلاب الدورة</div>
              <p className="mt-1 text-sm text-gray-500">
                {!extra ? "جاري التحميل..." : students === null ? "تعذّر تحميل الطلاب." : `${approved.length} مقبول من ${students.length} مسجّل`}
              </p>
            </div>
            {students && (studentsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(to)}
              className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {studentsOpen && students && <StudentsTable students={students} />}
    </div>
  );
};

const LECTURE_BADGE = {
  upcoming: ["قادمة", "bg-gray-100 text-gray-700"],
  soon: ["خلال ساعة", "bg-orange-100 text-orange-800"],
  live: ["شغالة الآن", "bg-red-100 text-red-700"],
  ended: ["انتهت", "bg-gray-100 text-gray-500"],
  unknown: ["الوقت غير محدد", "bg-gray-100 text-gray-500"],
};

const TodayLectures = ({ lectures, now, showTrainer, confirmations, canConfirm, onConfirm, onCancel, error, loading }) => {
  const [busy, setBusy] = useState(null);
  if (loading) return <p className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-md">جاري تحميل محاضرات النهارده...</p>;
  if (error) return <p className="rounded-lg bg-white p-8 text-center text-red-500 shadow-md">تعذّر تحميل جدول المحاضرات.</p>;
  if (lectures.length === 0) return <p className="rounded-lg bg-white p-8 text-center text-gray-600 shadow-md">مفيش محاضرات النهارده.</p>;

  const cancelOne = async (l) => {
    if (!window.confirm(`إلغاء تأكيد محاضرة "${l.title}"؟ المدرب هيحتاج يأكّد تاني.`)) return;
    setBusy(l.key);
    try {
      await onCancel(l);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmOne = async (l) => {
    setBusy(l.key);
    try {
      await onConfirm(l);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {lectures.map((l) => {
        const state = lectureState(l, now);
        const [label, cls] = LECTURE_BADGE[state];
        const done = confirmations[l.key];
        const toStart = l.start ? l.start.getTime() - now : 0;
        return (
          <div key={l.key} className={`rounded-lg bg-white p-4 shadow-md ${state === "soon" || state === "live" ? "ring-2 ring-orange-300" : ""}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="min-w-[90px] rounded-lg bg-blue-50 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-blue-700">{l.start ? fmtTime(l.start) : "—"}</div>
                  {l.end && <div className="text-xs text-blue-500">حتى {fmtTime(l.end)}</div>}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{l.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {l.title !== l.course.CourseName && <span>{l.course.CourseName}</span>}
                    {showTrainer && <span className="font-medium text-gray-700">المدرب: {l.course.InstructorName || "—"}</span>}
                    {showTrainer && l.course.InstructorPhoneNumber && (
                      <a href={`tel:${l.course.InstructorPhoneNumber}`} dir="ltr" className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Phone size={13} /> {l.course.InstructorPhoneNumber}
                      </a>
                    )}
                    <span>{l.online ? `أونلاين${l.platform ? ` · ${l.platform}` : ""}` : "حسب جدول الدورة"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>
                  {state === "upcoming" || state === "soon" ? (
                    <>بعد <span dir="ltr" className="font-mono">{countdown(toStart)}</span></>
                  ) : label}
                </span>
                {done ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                    <CheckCircle2 size={15} /> أكّد {showTrainer ? "المدرب" : ""} الساعة {fmtTime(new Date(done.ConfirmedAt))}
                    {onCancel && (
                      <button
                        type="button"
                        disabled={busy === l.key}
                        onClick={() => cancelOne(l)}
                        className="mr-2 text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        إلغاء التأكيد
                      </button>
                    )}
                  </span>
                ) : canConfirm && state !== "ended" ? (
                  <button
                    type="button"
                    disabled={busy === l.key || !canConfirmAt(l, now)}
                    title={canConfirmAt(l, now) ? "" : "التأكيد يفتح قبل المحاضرة بربع ساعة"}
                    onClick={() => confirmOne(l)}
                    className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={15} /> {canConfirmAt(l, now) ? "تأكيد الحضور" : "التأكيد قبلها بربع ساعة"}
                  </button>
                ) : (
                  <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${state === "soon" || state === "live" || state === "ended" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                    {state === "soon" || state === "live" ? <AlarmClock size={15} /> : <AlertCircle size={15} />} لم يؤكد بعد
                  </span>
                )}
                {withScheme(l.meetingURL) && (
                  <a href={withScheme(l.meetingURL)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                    <ExternalLink size={14} /> دخول
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const STATUS_LABEL = { approved: ["مقبول", "bg-green-100 text-green-800"], pending: ["قيد المراجعة", "bg-yellow-100 text-yellow-800"], rejected: ["مرفوض", "bg-red-100 text-red-800"] };

const StudentsTable = ({ students }) => {
  if (students.length === 0) {
    return <p className="border-t bg-gray-50 p-4 text-center text-sm text-gray-500">لا يوجد طلاب مسجلين في هذه الدورة بعد.</p>;
  }
  const sorted = [...students].sort((a, b) => Number(isApproved(b)) - Number(isApproved(a)));
  return (
    <div className="overflow-x-auto border-t bg-gray-50">
      <table className="min-w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="px-4 py-2 text-right font-medium">#</th>
            <th className="px-4 py-2 text-right font-medium">الاسم</th>
            <th className="px-4 py-2 text-right font-medium">الهاتف</th>
            <th className="px-4 py-2 text-right font-medium">البريد</th>
            <th className="px-4 py-2 text-right font-medium">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((s, i) => {
            const [label, cls] = STATUS_LABEL[String(s.Status || "").toLowerCase()] || [s.Status || "—", "bg-gray-100 text-gray-700"];
            return (
              <tr key={s.RegistrationID} className="bg-white">
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{s.FullName}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  {s.PhoneNumber ? (
                    <a href={`tel:${s.PhoneNumber}`} dir="ltr" className="flex items-center gap-1 text-blue-600 hover:underline"><Phone size={13} /> {s.PhoneNumber}</a>
                  ) : "—"}
                </td>
                <td className="px-4 py-2">
                  {s.Email ? (
                    <a href={`mailto:${s.Email}`} className="flex items-center gap-1 text-blue-600 hover:underline"><Mail size={13} /> {s.Email}</a>
                  ) : "—"}
                </td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Trainer1;
