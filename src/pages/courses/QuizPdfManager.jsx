import { useCallback, useEffect, useState } from "react";
import QuizEditModal from "./QuizEditModal";

const API = " http://localhost:3000/api";

const initialForm = {
  Title: "",
  TimeLimitMinutes: 0,
  PassScore: 60,
  MaxAttempts: 3,
  ShuffleQuestions: true,
  IsPublished: false,
  AllowNeedsReview: true,
};

export default function QuizPdfManager({ courseId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const loadQuizzes = useCallback(async () => {
    try {
      const response = await fetch(`${API}/quizzes/course/${courseId}`, {
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || "تعذر تحميل الاختبارات");
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message);
    }
  }, [courseId]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const importPdf = async (createQuiz) => {
    if (!file) {
      setMessage("اختار ملف PDF الأول");
      return;
    }

    setLoading(true);
    setMessage("");
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("CourseID", courseId);
      formData.append("Title", form.Title || file.name.replace(/\.pdf$/i, ""));
      formData.append("TimeLimitMinutes", form.TimeLimitMinutes);
      formData.append("PassScore", form.PassScore);
      formData.append("MaxAttempts", form.MaxAttempts);
      formData.append("ShuffleQuestions", form.ShuffleQuestions);
      formData.append("IsPublished", form.IsPublished);
      formData.append("allowNeedsReview", form.AllowNeedsReview);
      formData.append("createQuiz", createQuiz);

      const response = await fetch(`${API}/quizzes/import-pdf-ai`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "تعذر إنشاء الاختبار بالذكاء الاصطناعي من PDF");

      setPreview(data);
      setMessage(data.message || (createQuiz ? "تم إنشاء الاختبار" : "تم استخراج الأسئلة"));

      if (data.QuizID) {
        setFile(null);
        setForm(initialForm);
        loadQuizzes();
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const markPreviewCorrect = (questionIndex, optionIndex) => {
    setPreview((current) => {
      if (!current?.questions) return current;
      const questions = current.questions.map((question, qIndex) => {
        if (qIndex !== questionIndex) return question;
        return {
          ...question,
          needsReview: false,
          options: question.options.map((option, oIndex) => ({
            ...option,
            IsCorrect: oIndex === optionIndex,
          })),
        };
      });
      const remaining = questions.filter(
        (question) => !question.options.some((option) => option.IsCorrect)
      ).length;
      setMessage(
        remaining > 0
          ? `تم تحديد الإجابة. متبقي ${remaining} سؤال محتاج إجابة صحيحة`
          : "تم تحديد كل الإجابات الصحيحة، تقدر تنشئ الاختبار من المعاينة"
      );
      return {
        ...current,
        questions,
        needsReviewCount: remaining,
      };
    });
  };

  const createReviewedQuiz = async () => {
    if (!preview?.questions?.length) {
      setMessage("اعمل معاينة للأسئلة الأول");
      return;
    }

    const missingAnswers = preview.questions.filter(
      (question) => !question.options.some((option) => option.IsCorrect)
    ).length;
    if (missingAnswers > 0) {
      setMessage(`لسه فيه ${missingAnswers} سؤال محتاج تحدد له إجابة صحيحة`);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/quizzes`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          CourseID: Number(courseId),
          Title: form.Title || file?.name?.replace(/\.pdf$/i, "") || "PDF Quiz",
          Description: file?.name ? `Imported from PDF: ${file.name}` : "Imported from reviewed PDF questions",
          TimeLimitMinutes: Number(form.TimeLimitMinutes) || 0,
          PassScore: Number(form.PassScore) || 60,
          MaxAttempts: Number(form.MaxAttempts) || 3,
          ShuffleQuestions: form.ShuffleQuestions,
          IsPublished: form.IsPublished,
          questions: preview.questions.map(({ needsReview, ...question }) => question),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "تعذر إنشاء الاختبار من المعاينة");

      setMessage("تم إنشاء الاختبار من الأسئلة المراجعة");
      setPreview(null);
      setFile(null);
      setForm(initialForm);
      loadQuizzes();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!confirm("هل تريد حذف هذا الاختبار؟")) return;

    try {
      const response = await fetch(`${API}/quizzes/${quizId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "تعذر حذف الاختبار");
      setMessage("تم حذف الاختبار");
      loadQuizzes();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section dir="rtl" className="my-6 rounded-lg border bg-white p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-primary">اختبارات بالذكاء الاصطناعي من PDF</h3>
          <p className="text-sm text-gray-500">
            ارفع ملف PDF، هيتم استخراج كل الأسئلة الموجودة فيه، و Gemini AI هيحدد الإجابة الصحيحة لأي سؤال مش موضح له إجابة في الملف.
          </p>
        </div>
        <span className="rounded bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">
          {quizzes.length} اختبار
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          className="rounded border p-2 md:col-span-2"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <input
          className="rounded border p-2"
          placeholder="عنوان الاختبار"
          value={form.Title}
          onChange={(e) => setForm({ ...form, Title: e.target.value })}
        />
        <input
          className="rounded border p-2"
          type="number"
          min="0"
          placeholder="الوقت بالدقائق"
          value={form.TimeLimitMinutes}
          onChange={(e) => setForm({ ...form, TimeLimitMinutes: e.target.value })}
        />
        <input
          className="rounded border p-2"
          type="number"
          min="0"
          max="100"
          placeholder="درجة النجاح"
          value={form.PassScore}
          onChange={(e) => setForm({ ...form, PassScore: e.target.value })}
        />
        <input
          className="rounded border p-2"
          type="number"
          min="1"
          placeholder="عدد المحاولات"
          value={form.MaxAttempts}
          onChange={(e) => setForm({ ...form, MaxAttempts: e.target.value })}
        />
        <label className="flex items-center gap-2 rounded border p-2">
          <input
            type="checkbox"
            checked={form.ShuffleQuestions}
            onChange={(e) => setForm({ ...form, ShuffleQuestions: e.target.checked })}
          />
          ترتيب عشوائي
        </label>
        <label className="flex items-center gap-2 rounded border p-2">
          <input
            type="checkbox"
            checked={form.IsPublished}
            onChange={(e) => setForm({ ...form, IsPublished: e.target.checked })}
          />
          نشر للطلاب
        </label>
        <label className="flex items-center gap-2 rounded border p-2 md:col-span-3">
          <input
            type="checkbox"
            checked={form.AllowNeedsReview}
            onChange={(e) => setForm({ ...form, AllowNeedsReview: e.target.checked })}
          />
          إنشاء كمسودة حتى لو بعض الإجابات لسه محتاجة مراجعة
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => importPdf(false)}
          disabled={loading}
          className="rounded border border-primary px-5 py-2 font-bold text-primary disabled:opacity-60"
        >
          {loading ? "جاري التحليل بالذكاء الاصطناعي..." : "معاينة الأسئلة (AI)"}
        </button>
        <button
          type="button"
          onClick={() => importPdf(true)}
          disabled={loading}
          className="rounded bg-primary px-5 py-2 font-bold text-white disabled:opacity-60"
        >
          إنشاء الاختبار من PDF بالذكاء الاصطناعي
        </button>
        {preview?.questions?.length > 0 && (
          <button
            type="button"
            onClick={createReviewedQuiz}
            disabled={loading}
            className="rounded bg-green-600 px-5 py-2 font-bold text-white disabled:opacity-60"
          >
            إنشاء من المعاينة بعد المراجعة
          </button>
        )}
      </div>

      {message && <p className="mt-3 rounded bg-blue-50 p-3 text-blue-900">{message}</p>}

      {preview?.questions?.length > 0 && (
        <>
          {preview.questions.some((question) => !question.options.some((option) => option.IsCorrect)) && (
            <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3">
              <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <h4 className="font-bold text-yellow-900">أسئلة تحتاج مراجعة</h4>
                <span className="text-sm font-bold text-yellow-800">
                  {preview.questions.filter((question) => !question.options.some((option) => option.IsCorrect)).length} سؤال
                </span>
              </div>
              <div className="max-h-96 overflow-auto rounded border bg-white">
                {preview.questions.map((question, index) => {
                  const hasCorrect = question.options.some((option) => option.IsCorrect);
                  if (hasCorrect) return null;
                  return (
                    <div key={`review-${question.QuestionText}-${index}`} className="border-b p-3 last:border-b-0">
                      <b>{index + 1}. {question.QuestionText}</b>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {question.options.map((option, optionIndex) => (
                          <button
                            type="button"
                            onClick={() => markPreviewCorrect(index, optionIndex)}
                            key={`review-${option.OptionText}-${optionIndex}`}
                            className="rounded border bg-gray-50 p-2 text-right text-sm transition hover:border-green-300 hover:bg-green-50"
                          >
                            {option.OptionText}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 max-h-96 overflow-auto rounded border">
            {preview.questions.map((question, index) => (
              <div key={`${question.QuestionText}-${index}`} className="border-b p-3 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <b>{index + 1}. {question.QuestionText}</b>
                  {!question.options.some((option) => option.IsCorrect) && (
                    <span className="shrink-0 rounded bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">
                      يحتاج مراجعة
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <button
                      type="button"
                      onClick={() => markPreviewCorrect(index, optionIndex)}
                      key={`${option.OptionText}-${optionIndex}`}
                      className={`rounded border p-2 text-right text-sm transition ${
                        option.IsCorrect
                          ? "border-green-500 bg-green-50 font-bold text-green-800"
                          : "bg-gray-50 hover:border-green-300 hover:bg-green-50"
                      }`}
                    >
                      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-xs">
                        {option.IsCorrect ? "✓" : ""}
                      </span>
                      {option.OptionText}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 grid gap-2">
        {quizzes.map((quiz) => (
          <div key={quiz.QuizID} className="flex flex-col gap-2 rounded border p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <b>{quiz.Title}</b>
              <p className="text-sm text-gray-500">
                {quiz.TimeLimitMinutes || 0} دقيقة - نجاح {quiz.PassScore}% - {quiz.IsPublished ? "منشور" : "غير منشور"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">#{quiz.QuizID}</span>
              <button
                type="button"
                onClick={() => setEditingQuizId(quiz.QuizID)}
                className="rounded border border-primary px-3 py-1 text-sm font-bold text-primary hover:bg-blue-50"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => deleteQuiz(quiz.QuizID)}
                className="rounded border border-red-200 px-3 py-1 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingQuizId && (
        <QuizEditModal
          quizId={editingQuizId}
          onClose={() => setEditingQuizId(null)}
          onSaved={loadQuizzes}
        />
      )}
    </section>
  );
}
