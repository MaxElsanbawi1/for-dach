import { useState } from "react";

const API = " https://back.acit-net.com/api";

// Staff-only button + modal: shows a registered student's quiz results for this course.
// Registrations aren't always linked to a UserID, so we fall back to matching by email.
export default function StudentQuizResults({ courseId, userId, email, studentName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const load = async () => {
    setOpen(true);
    if (!userId && !email) {
      setError("مفيش حساب مرتبط بهذا التسجيل");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = email ? `?email=${encodeURIComponent(email)}` : "";
      const response = await fetch(
        `${API}/quizzes/course/${courseId}/student/${userId || 0}/attempts${query}`,
        { headers: authHeaders() }
      );
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || "تعذر تحميل نتائج الاختبارات");
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={load}
        className="inline-block bg-purple-500 text-white px-2 md:px-3 py-1 rounded hover:bg-purple-700 focus:outline-none text-xs md:text-sm"
      >
        الاختبارات
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            dir="rtl"
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-bold text-primary">
                نتائج الاختبارات {studentName ? `- ${studentName}` : ""}
              </h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {loading && <p className="text-center text-gray-500">جاري التحميل...</p>}
            {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}

            {!loading && !error && quizzes?.length === 0 && (
              <p className="text-gray-500">لا توجد اختبارات لهذه الدورة</p>
            )}

            {!loading && !error && quizzes?.length > 0 && (
              <div className="grid gap-2">
                {quizzes.map((quiz) => (
                  <div key={quiz.QuizID} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <b>{quiz.Title}</b>
                      {quiz.attemptsUsed === 0 ? (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                          لسه ما حلش
                        </span>
                      ) : (
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${
                            quiz.hasPassed
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {quiz.hasPassed ? "ناجح" : "لم ينجح"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      أفضل نتيجة: {quiz.bestScore ?? "--"}% - المحاولات: {quiz.attemptsUsed}/{quiz.MaxAttempts} - درجة النجاح: {quiz.PassScore}%
                    </p>

                    {quiz.attempts?.length > 0 && (
                      <div className="mt-2 grid gap-1 border-t pt-2">
                        {quiz.attempts.map((attempt, index) => (
                          <div
                            key={attempt.AttemptID}
                            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs"
                          >
                            <span className="font-semibold text-gray-600">
                              محاولة {quiz.attempts.length - index}
                            </span>
                            {attempt.SubmittedAt ? (
                              <>
                                <span
                                  className={`font-bold ${
                                    attempt.Passed ? "text-green-700" : "text-red-700"
                                  }`}
                                >
                                  {attempt.Score}% - {attempt.Passed ? "ناجح" : "لم ينجح"}
                                </span>
                                <span className="text-gray-400">
                                  {new Date(attempt.SubmittedAt).toLocaleString("ar-EG")}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-yellow-700">لسه ما سلمش</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
