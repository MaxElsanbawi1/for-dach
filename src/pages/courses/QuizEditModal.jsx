import { useEffect, useState } from "react";

const API = " http://localhost:3000/api";

// Staff-only modal: edit a quiz's settings and its questions/options, then save.
export default function QuizEditModal({ quizId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API}/quizzes/${quizId}`, {
          headers: authHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "تعذر تحميل الاختبار");
        setQuiz(data);
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quizId]);

  const updateQuestionText = (qIndex, text) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, QuestionText: text } : q))
    );
  };

  const updateOptionText = (qIndex, oIndex, text) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, oi) =>
                oi === oIndex ? { ...o, OptionText: text } : o
              ),
            }
          : q
      )
    );
  };

  const setCorrectOption = (qIndex, oIndex) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, oi) => ({ ...o, IsCorrect: oi === oIndex })),
            }
          : q
      )
    );
  };

  const removeQuestion = (qIndex) => {
    setQuestions((prev) => prev.filter((_, i) => i !== qIndex));
  };

  const save = async () => {
    const missingAnswer = questions.find(
      (q) => !q.options?.some((o) => o.IsCorrect)
    );
    if (missingAnswer) {
      setError(`السؤال "${missingAnswer.QuestionText}" محتاج إجابة صحيحة محددة`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API}/quizzes/${quizId}`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Title: quiz.Title,
          Description: quiz.Description,
          TimeLimitMinutes: Number(quiz.TimeLimitMinutes) || 0,
          PassScore: Number(quiz.PassScore) || 60,
          MaxAttempts: Number(quiz.MaxAttempts) || 3,
          ShuffleQuestions: !!quiz.ShuffleQuestions,
          IsPublished: !!quiz.IsPublished,
          questions: questions.map((q) => ({
            QuestionText: q.QuestionText,
            Type: q.Type || "MCQ",
            Points: q.Points || 1,
            options: q.options.map((o) => ({
              OptionText: o.OptionText,
              IsCorrect: !!o.IsCorrect,
            })),
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "تعذر حفظ التعديلات");
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-bold text-primary">تعديل الاختبار</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {loading && <p className="text-center text-gray-500">جاري التحميل...</p>}
        {error && <p className="mb-3 rounded bg-red-50 p-3 text-red-700">{error}</p>}

        {!loading && quiz && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded border p-2 md:col-span-3"
                placeholder="عنوان الاختبار"
                value={quiz.Title || ""}
                onChange={(e) => setQuiz({ ...quiz, Title: e.target.value })}
              />
              <input
                className="rounded border p-2"
                type="number"
                min="0"
                placeholder="الوقت بالدقائق"
                value={quiz.TimeLimitMinutes ?? 0}
                onChange={(e) => setQuiz({ ...quiz, TimeLimitMinutes: e.target.value })}
              />
              <input
                className="rounded border p-2"
                type="number"
                min="0"
                max="100"
                placeholder="درجة النجاح"
                value={quiz.PassScore ?? 60}
                onChange={(e) => setQuiz({ ...quiz, PassScore: e.target.value })}
              />
              <input
                className="rounded border p-2"
                type="number"
                min="1"
                placeholder="عدد المحاولات"
                value={quiz.MaxAttempts ?? 3}
                onChange={(e) => setQuiz({ ...quiz, MaxAttempts: e.target.value })}
              />
              <label className="flex items-center gap-2 rounded border p-2">
                <input
                  type="checkbox"
                  checked={!!quiz.ShuffleQuestions}
                  onChange={(e) => setQuiz({ ...quiz, ShuffleQuestions: e.target.checked })}
                />
                ترتيب عشوائي
              </label>
              <label className="flex items-center gap-2 rounded border p-2">
                <input
                  type="checkbox"
                  checked={!!quiz.IsPublished}
                  onChange={(e) => setQuiz({ ...quiz, IsPublished: e.target.checked })}
                />
                نشر للطلاب
              </label>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h5 className="font-bold text-primary">الأسئلة ({questions.length})</h5>
              </div>
              <div className="grid max-h-96 gap-3 overflow-auto rounded border p-2">
                {questions.map((question, qIndex) => (
                  <div key={qIndex} className="rounded border p-3">
                    <div className="flex items-start gap-2">
                      <textarea
                        className="w-full rounded border p-2 text-sm"
                        rows={2}
                        value={question.QuestionText}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        حذف السؤال
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {question.options.map((option, oIndex) => (
                        <label
                          key={oIndex}
                          className={`flex items-center gap-2 rounded border p-2 text-sm ${
                            option.IsCorrect ? "border-green-500 bg-green-50" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${qIndex}-correct`}
                            checked={!!option.IsCorrect}
                            onChange={() => setCorrectOption(qIndex, oIndex)}
                          />
                          <input
                            className="w-full rounded border p-1 text-sm"
                            value={option.OptionText}
                            onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border px-5 py-2 font-bold text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded bg-primary px-5 py-2 font-bold text-white disabled:opacity-60"
              >
                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
