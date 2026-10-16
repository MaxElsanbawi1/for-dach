import React, { useEffect, useRef, useState } from "react";
import { Save, Upload, X, AlertTriangle } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { taxFetch, money, API, getAuthHeaders } from "./taxApi";
import { assetUrl } from "./InvoiceDocument";

const POLICY_OPTIONS = [
  {
    value: "ALWAYS_REVIEW",
    label: "مراجعة يدوية لكل فاتورة",
    hint: "تبقى كل فاتورة مسودة حتى يعتمدها مسؤول. الأكثر تحكماً، والأكثر عرضة لتراكم المسودات.",
  },
  {
    value: "AUTO_ISSUE",
    label: "إصدار تلقائي فوري",
    hint: "تُصدر الفاتورة فور السداد بدون مرحلة مسودة. المسودات تبقى متاحة للإنشاء اليدوي فقط.",
  },
  {
    value: "AUTO_ISSUE_WITH_TIMEOUT",
    label: "إصدار تلقائي بعد مهلة مراجعة (موصى به)",
    hint: "تبقى الفاتورة مسودة للمراجعة، ثم تُصدر تلقائياً إذا لم تُعدَّل خلال المهلة. أي تعديل يلغي الإصدار التلقائي.",
  },
];

/** Logo / stamp uploader. Files are stored server-side and referenced by path. */
const ImageSetting = ({ label, hint, kind, value, onUploaded }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      // FormData sets its own multipart boundary — never set Content-Type here.
      const res = await fetch(`${API.trim()}/settings/branding/${kind}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "تعذّر رفع الملف");
      onUploaded(data.path);
      toast.success("تم رفع الملف");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 shrink-0 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden">
          {value ? (
            <img src={assetUrl(value)} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">لا يوجد</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => upload(e.target.files && e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current && inputRef.current.click()}
            disabled={busy}
            className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-white text-sm disabled:opacity-50"
          >
            <Upload size={15} />
            {busy ? "جاري الرفع..." : value ? "استبدال" : "رفع صورة"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onUploaded("")}
              className="flex items-center gap-2 text-red-600 text-sm hover:underline"
            >
              <X size={15} />
              إزالة
            </button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  );
};

const FIELDS = [
  { key: "companyLegalName", label: "اسم المنشأة (بالعربية)", placeholder: "شركة ..." },
  { key: "companyLegalNameEn", label: "اسم المنشأة (بالإنجليزية)", placeholder: "Company ..." },
  {
    key: "companyVatNumber",
    label: "الرقم الضريبي",
    placeholder: "15 رقماً يبدأ وينتهي بالرقم 3",
    hint: "مثال: 300000000000003",
  },
  { key: "companyCrNumber", label: "رقم السجل التجاري", placeholder: "1010xxxxxx" },
  { key: "companyAddress", label: "العنوان الوطني", placeholder: "المدينة، الحي، الشارع، الرمز البريدي" },
];

const TaxSettings = () => {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const s = await taxFetch("/settings");
        setForm({
          vatRate: s.vatRate ?? "15",
          invoiceDueDays: s.invoiceDueDays ?? "30",
          invoiceIssuePolicy: s.invoiceIssuePolicy ?? "AUTO_ISSUE_WITH_TIMEOUT",
          invoiceAutoIssueHours: s.invoiceAutoIssueHours ?? "12",
          invoicePendingAlertHours: s.invoicePendingAlertHours ?? "12",
          invoiceEmailOnIssue: String(s.invoiceEmailOnIssue) !== "false",
          accountingBasis: s.accountingBasis ?? "INVOICE",
          companyLogo: s.companyLogo ?? "",
          companyStamp: s.companyStamp ?? "",
          invoiceTerms: s.invoiceTerms ?? "",
          defaultPriceIncludesVat: String(s.defaultPriceIncludesVat) === "true",
          ...FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: s[f.key] || "" }), {}),
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await taxFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          defaultPriceIncludesVat: String(form.defaultPriceIncludesVat),
          invoiceEmailOnIssue: String(form.invoiceEmailOnIssue),
        }),
      });
      toast.success("تم حفظ الإعدادات الضريبية");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const rate = parseFloat(form.vatRate) || 0;
  const sample = 1000;
  const sampleVat = Math.round(sample * (rate / 100) * 100) / 100;

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <ToastContainer rtl position="top-center" />
      <h2 className="text-2xl font-bold mb-2 text-primary">الإعدادات الضريبية</h2>
      <p className="text-sm text-gray-600 mb-6">
        تُطبع هذه البيانات على كل فاتورة ضريبية وتُشفَّر داخل رمز الاستجابة السريعة، لذا يجب أن
        تطابق شهادة التسجيل في هيئة الزكاة والضريبة والجمارك.
      </p>

      {error ? (
        <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.key === "companyAddress" ? "md:col-span-2" : ""}>
            <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
            <input
              type="text"
              value={form[f.key] || ""}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            {f.hint ? <p className="text-xs text-gray-500 mt-1">{f.hint}</p> : null}
          </div>
        ))}
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-4">نسبة الضريبة والتسعير</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.vatRate}
              onChange={(e) => set("vatRate", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              مثال: سعر {money(sample)} بدون ضريبة ← ضريبة {money(sampleVat)} ← الإجمالي{" "}
              {money(sample + sampleVat)}
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              طريقة إدخال أسعار الدورات الجديدة
            </label>
            <select
              value={String(form.defaultPriceIncludesVat)}
              onChange={(e) => set("defaultPriceIncludesVat", e.target.value === "true")}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="false">السعر بدون ضريبة (تُضاف الضريبة فوقه)</option>
              <option value="true">السعر شامل الضريبة (تُستخرج الضريبة منه)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              يُطبَّق على الدورات الجديدة فقط، ويمكن تغييره لكل دورة على حدة.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-4">شروط السداد والتحصيل</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              مهلة السداد الافتراضية (بالأيام)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="365"
              value={form.invoiceDueDays}
              onChange={(e) => set("invoiceDueDays", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              تُحتسب من تاريخ الإصدار. يمكن تحديد تاريخ استحقاق مختلف لكل فاتورة أثناء تحرير
              المسودة. الصفر يعني الاستحقاق فور الإصدار.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-1">أتمتة إصدار الفواتير</h3>
        <p className="text-sm text-gray-600 mb-4">
          تُنشأ الفاتورة تلقائياً ومكتملة البيانات عند سداد طلب أو اعتماد تسجيل. هذا الإعداد يحدد ما
          يحدث بعد ذلك.
        </p>
        <div className="space-y-3 mb-4">
          {POLICY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                form.invoiceIssuePolicy === opt.value
                  ? "border-primary bg-blue-50"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="invoiceIssuePolicy"
                className="mt-1"
                value={opt.value}
                checked={form.invoiceIssuePolicy === opt.value}
                onChange={(e) => set("invoiceIssuePolicy", e.target.value)}
              />
              <span>
                <span className="block text-sm font-semibold text-gray-800">{opt.label}</span>
                <span className="block text-xs text-gray-600 mt-0.5">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">مهلة المراجعة (ساعات)</label>
            <input
              type="number"
              min="1"
              max="24"
              value={form.invoiceAutoIssueHours}
              disabled={form.invoiceIssuePolicy !== "AUTO_ISSUE_WITH_TIMEOUT"}
              onChange={(e) => set("invoiceAutoIssueHours", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              تشترط الهيئة الإبلاغ عن الفاتورة المبسطة خلال 24 ساعة من إصدارها، لذا الحد الأقصى 24.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">تنبيه تراكم المسودات (ساعات)</label>
            <input
              type="number"
              min="1"
              max="24"
              value={form.invoicePendingAlertHours}
              onChange={(e) => set("invoicePendingAlertHours", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              يظهر تحذير في لوحة الضرائب لأي مسودة تجاوزت هذه المدة، مهما كانت السياسة.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">إرسال الفاتورة بالبريد</label>
            <select
              value={String(form.invoiceEmailOnIssue)}
              onChange={(e) => set("invoiceEmailOnIssue", e.target.value === "true")}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="true">إرسال تلقائي عند الإصدار</option>
              <option value="false">لا تُرسل تلقائياً</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              يمكن دائماً إرسالها يدوياً من صفحة الفاتورة.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-1">الأساس المحاسبي للإقرار</h3>
        <p className="text-sm text-gray-600 mb-4">
          يحدد متى تُحتسب ضريبة القيمة المضافة في الإقرار: عند إصدار الفاتورة، أم عند تحصيلها.
        </p>

        <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-4 flex items-start">
          <AlertTriangle className="text-red-600 ml-3 shrink-0" size={20} />
          <div className="text-sm text-red-800">
            <p className="font-semibold">لا تغيّر هذا الإعداد دون التحقق من تسجيلك لدى الهيئة</p>
            <p className="mt-1">
              يجب أن يطابق هذا الإعداد الأساس المسجَّل به المنشأة لدى هيئة الزكاة والضريبة والجمارك.
              الأساس النقدي متاح فقط للمنشآت التي <strong>لا تتجاوز توريداتها السنوية 5,000,000
              ريال</strong>، ولا يجوز اعتماده من طرف واحد — يتطلب أن يكون التسجيل نفسه على هذا
              الأساس. اختيار أساس مخالف لتسجيلك يجعل إقراراتك غير صحيحة.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              value: "INVOICE",
              label: "الأساس المستحق — على الفواتير الصادرة (الافتراضي)",
              hint: "تُستحق الضريبة عند إصدار الفاتورة بغض النظر عن السداد. هذا هو الأساس المطبَّق على معظم المنشآت.",
            },
            {
              value: "CASH",
              label: "الأساس النقدي — على الدفعات المحصّلة",
              hint: "تُستحق الضريبة عند استلام الدفعة، ومنسوبة بالتناسب إلى الفاتورة التي تسددها. مقيّد بحد 5 مليون ريال.",
            },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                form.accountingBasis === opt.value
                  ? "border-primary bg-blue-50"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="accountingBasis"
                className="mt-1"
                value={opt.value}
                checked={form.accountingBasis === opt.value}
                onChange={(e) => set("accountingBasis", e.target.value)}
              />
              <span>
                <span className="block text-sm font-semibold text-gray-800">{opt.label}</span>
                <span className="block text-xs text-gray-600 mt-0.5">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {form.accountingBasis === "CASH" ? (
          <p className="text-xs text-amber-800 bg-amber-50 border-r-4 border-amber-500 p-3 mt-3">
            ملاحظة على التطبيق الحالي: يُحتسب الأساس النقدي من الدفعات المسجَّلة فقط. الاسترداد
            النقدي الناتج عن إشعار دائن لا يُسجَّل كدفعة سالبة، لذا راجع الإقرار يدوياً إن كانت لديك
            مبالغ مستردة فعلياً خلال الفترة.
          </p>
        ) : null}
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-1">شكل الفاتورة</h3>
        <p className="text-sm text-gray-600 mb-4">
          تُطبع هذه العناصر على كل فاتورة. يمكن تغييرها في أي وقت دون الحاجة إلى تحديث النظام —
          والفواتير الصادرة تحتفظ بنسختها وقت الإصدار.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <ImageSetting
            label="شعار المنشأة"
            kind="logo"
            value={form.companyLogo}
            onUploaded={(p) => set("companyLogo", p)}
            hint="يظهر أعلى يمين الفاتورة. PNG بخلفية شفافة يعطي أفضل نتيجة."
          />
          <ImageSetting
            label="الختم الرسمي"
            kind="stamp"
            value={form.companyStamp}
            onUploaded={(p) => set("companyStamp", p)}
            hint="يظهر في قسم السداد أسفل الفاتورة."
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">الشروط والأحكام</label>
          <textarea
            rows={6}
            value={form.invoiceTerms}
            onChange={(e) => set("invoiceTerms", e.target.value)}
            placeholder="سطر واحد لكل شرط"
            className="w-full rounded-md border border-gray-300 px-3 py-2 leading-7"
          />
          <p className="text-xs text-gray-500 mt-1">
            كل سطر يظهر كبند مرقّم أسفل الفاتورة. يمكن تجاوزه لفاتورة بعينها أثناء المراجعة.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
      </div>
    </div>
  );
};

export default TaxSettings;
