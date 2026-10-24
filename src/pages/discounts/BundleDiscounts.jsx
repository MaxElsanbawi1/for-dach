import React, { useEffect, useMemo, useState } from "react";
import { Save, Plus, Trash2, Power } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { taxFetch, money } from "../tax/taxApi";

// Multi-course discount, two modes (same rules as acit-back/services/bundleDiscount.js,
// which re-checks everything):
//   "cart"       - the whole cart gets the rate for its number of courses.
//   "per_course" - the n-th course, most expensive first, gets the n-th rate.
// In both, the last rate repeats for every course after it.
const MAX_RATE = 90;
const MAX_TIERS = 10;
// Prices for the worked example the owner sees under the inputs.
const EXAMPLE_PRICES = [1200, 900, 500, 400, 300, 250, 200, 150, 120, 100];

const ORDINALS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];

function parseTiers(raw) {
  try {
    const t = JSON.parse(raw);
    if (Array.isArray(t) && t.length) return t.map(Number);
  } catch {
    /* fall back to the default */
  }
  return [10, 25, 40];
}

function validate(tiers) {
  if (tiers.length === 0) return "أدخل نسبة خصم واحدة على الأقل";
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (!Number.isInteger(t) || t < 0 || t > MAX_RATE) return `كل نسبة يجب أن تكون رقماً صحيحاً بين 0 و ${MAX_RATE}`;
    if (i > 0 && t < tiers[i - 1]) {
      return `نسبة الدورة ${ORDINALS[i]} أقل من التي قبلها. يجب أن تساويها أو تزيد عليها، وإلا قلّ سعر السلة عند إضافة دورة`;
    }
  }
  return null;
}

const rateAt = (tiers, i) => tiers[Math.min(i, tiers.length - 1)] || 0;

// What a student buying `count` example courses pays under `tiers`.
function example(tiers, count, mode) {
  const rows = EXAMPLE_PRICES.slice(0, count).map((price, i) => {
    const rate = mode === "cart" ? rateAt(tiers, count - 1) : rateAt(tiers, i);
    const discount = Math.round(price * rate) / 100;
    return { price, rate, after: price - discount };
  });
  const before = rows.reduce((s, r) => s + r.price, 0);
  const after = rows.reduce((s, r) => s + r.after, 0);
  return { rows, before, after };
}

const MODE_LABELS = { cart: "على مجموع السلة", per_course: "على كل دورة حسب ترتيبها" };

const exampleLine = (tiers, mode) => {
  const ex = example(tiers, 3, mode);
  return `3 دورات (${EXAMPLE_PRICES.slice(0, 3).join(" + ")}): كانت ${money(ex.before)} وتصبح ${money(ex.after)} ريال`;
};

export default function BundleDiscounts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [savedTiers, setSavedTiers] = useState([10, 25, 40]);
  const [inputs, setInputs] = useState(["10", "25", "40"]);
  const [savedMode, setSavedMode] = useState("cart");
  const [mode, setMode] = useState("cart");

  useEffect(() => {
    taxFetch("/settings")
      .then((s) => {
        const tiers = parseTiers(s.bundleDiscountTiers);
        setEnabled(String(s.bundleDiscountEnabled) === "true");
        setSavedTiers(tiers);
        setInputs(tiers.map(String));
        const m = s.bundleDiscountMode === "per_course" ? "per_course" : "cart";
        setSavedMode(m);
        setMode(m);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tiers = useMemo(() => inputs.map((v) => (v.trim() === "" ? NaN : Number(v))), [inputs]);
  const error = validate(tiers);
  const dirty = JSON.stringify(tiers) !== JSON.stringify(savedTiers) || mode !== savedMode;
  const ex = !error ? example(tiers, Math.max(3, tiers.length), mode) : null;

  const save = async (body) => {
    setSaving(true);
    try {
      const res = await taxFetch("/settings", { method: "PUT", body: JSON.stringify(body) });
      const s = res.settings || {};
      const t = parseTiers(s.bundleDiscountTiers);
      setEnabled(String(s.bundleDiscountEnabled) === "true");
      setSavedTiers(t);
      setInputs(t.map(String));
      const m = s.bundleDiscountMode === "per_course" ? "per_course" : "cart";
      setSavedMode(m);
      setMode(m);
      toast.success("تم الحفظ");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = () => {
    const next = !enabled;
    const msg = next
      ? `سيبدأ تطبيق الخصم على كل السلال فوراً بالنسب الحالية: ${savedTiers.join("% / ")}%\n\nمثال: ${exampleLine(savedTiers, savedMode)}\n\nهل تريد التفعيل؟`
      : "سيتوقف الخصم فوراً وترجع كل السلال إلى السعر الكامل.\n\nهل تريد الإيقاف؟";
    if (window.confirm(msg)) save({ bundleDiscountEnabled: String(next) });
  };

  const saveTiers = () => {
    if (error) return;
    const msg =
      `الحالي: ${savedTiers.join("% / ")}% ${MODE_LABELS[savedMode]}\n${exampleLine(savedTiers, savedMode)}\n\n` +
      `الجديد: ${tiers.join("% / ")}% ${MODE_LABELS[mode]}\n${exampleLine(tiers, mode)}\n\n` +
      (enabled ? "الخصم مفعّل، وستُطبق النسب الجديدة فوراً على كل السلال." : "الخصم موقوف حالياً، ولن يظهر للعملاء حتى تفعّله.") +
      "\n\nهل تريد الحفظ؟";
    if (window.confirm(msg)) save({ bundleDiscountTiers: JSON.stringify(tiers), bundleDiscountMode: mode });
  };

  const setAt = (i, v) => setInputs((prev) => prev.map((x, j) => (j === i ? v.replace(/[^\d]/g, "") : x)));
  const addTier = () =>
    inputs.length < MAX_TIERS && setInputs((prev) => [...prev, prev[prev.length - 1] || "0"]);
  const removeTier = (i) => inputs.length > 1 && setInputs((prev) => prev.filter((_, j) => j !== i));

  if (loading) return <div className="p-6 text-gray-500">جاري التحميل…</div>;

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <ToastContainer position="top-center" rtl />
      <div>
        <h1 className="text-2xl font-bold text-gray-800">خصم الموقع</h1>
        <p className="text-gray-600 mt-1">
          كلما أضاف الطالب دورة أخرى للسلة زاد الخصم. ولا يُجمع الخصم مع الكوبون: يأخذ الطالب الأوفر له منهما.
        </p>
      </div>

      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${enabled ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50"}`}>
        <div>
          <div className="font-bold text-gray-800">{enabled ? "الخصم مفعّل" : "الخصم موقوف"}</div>
          <div className="text-sm text-gray-600">
            {enabled ? "العملاء يرون الخصم الآن في السلة وصفحات الدورات." : "العملاء يدفعون السعر الكامل، ولا يظهر العرض في الموقع."}
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-bold text-white disabled:opacity-50 ${enabled ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
        >
          <Power size={18} />
          {enabled ? "إيقاف الخصم" : "تفعيل الخصم"}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="font-bold text-gray-800">طريقة الحساب</h2>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="radio" name="mode" checked={mode === "cart"} onChange={() => setMode("cart")} className="mt-1" />
          <span>
            <span className="font-bold text-gray-800">على مجموع السلة</span>
            <span className="block text-sm text-gray-600">
              السلة كلها تأخذ نسبة واحدة حسب عدد الدورات فيها: دورة واحدة {rateAt(tiers, 0) || 0}%، دورتان{" "}
              {rateAt(tiers, 1) || 0}% على المجموع، وهكذا.
            </span>
            {mode === "cart" && (
              <span className="block text-xs text-amber-700 mt-1">
                تنبيه: إضافة دورة رخيصة لسلة غالية قد تُنقص المبلغ المدفوع، لأن النسبة الأعلى تنطبق على كل الدورات.
              </span>
            )}
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="radio" name="mode" checked={mode === "per_course"} onChange={() => setMode("per_course")} className="mt-1" />
          <span>
            <span className="font-bold text-gray-800">على كل دورة حسب ترتيبها</span>
            <span className="block text-sm text-gray-600">
              تُرتب الدورات من الأغلى للأرخص: الأغلى تأخذ النسبة الأولى، والثانية النسبة الثانية، وهكذا. المبلغ يزيد
              دائماً عند إضافة دورة.
            </span>
          </span>
        </label>

        <h2 className="font-bold text-gray-800 pt-2">نسب الخصم</h2>
        {inputs.map((v, i) => (
          <div key={i} className="flex items-center gap-3">
            <label className="w-48 text-gray-700">
              {mode === "cart"
                ? `${i + 1} ${i === 0 ? "دورة" : i === 1 ? "دورتان" : "دورات"}${i === inputs.length - 1 && i > 0 ? " فأكثر" : ""}`
                : `الدورة ${ORDINALS[i]}${i === 0 ? " (الأغلى)" : ""}${i === inputs.length - 1 && i > 0 ? " فأكثر" : ""}`}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                value={v}
                onChange={(e) => setAt(i, e.target.value)}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-center"
              />
              <span className="text-gray-600">%</span>
            </div>
            {inputs.length > 1 && (
              <button type="button" onClick={() => removeTier(i)} className="text-red-500 hover:text-red-700" title="حذف">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {inputs.length < MAX_TIERS && (
          <button type="button" onClick={addTier} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <Plus size={16} /> إضافة نسبة لدورة أخرى
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {ex && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
            <div className="font-bold text-gray-800 mb-2">مثال: طالب يشتري {ex.rows.length} دورات</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-right font-normal">سعر الدورة</th>
                  <th className="text-right font-normal">الخصم</th>
                  <th className="text-right font-normal">بعد الخصم</th>
                </tr>
              </thead>
              <tbody>
                {ex.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{money(r.price)}</td>
                    <td>{r.rate}%</td>
                    <td>{money(r.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 font-bold text-gray-800">
              يدفع {money(ex.after)} ريال بدلاً من {money(ex.before)} ريال (يوفّر {money(ex.before - ex.after)} ريال)
            </div>
            <div className="text-xs text-gray-500 mt-1">المبالغ قبل ضريبة القيمة المضافة.</div>
          </div>
        )}

        <button
          type="button"
          onClick={saveTiers}
          disabled={saving || !!error || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={18} /> حفظ
        </button>
      </div>
    </div>
  );
}
