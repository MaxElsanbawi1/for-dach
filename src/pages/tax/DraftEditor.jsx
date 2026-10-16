import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Save, Stamp, Trash2, AlertTriangle, Search, Lock, UserPlus } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { taxFetch, money } from "./taxApi";
import { calculateInvoice } from "./taxCalc";
import InvoiceDocument from "./InvoiceDocument";
import "./invoiceDocument.css";

const emptyLine = () => ({
  description: "",
  quantity: 1,
  unit_price: "",
  discount: 0,
  tax_category: "STANDARD",
  price_includes_vat: false,
});

/** Human labels for the field keys the server reports as missing. */
const MISSING_LABELS = {
  "buyer.name": "اسم المتدرب",
  "buyer.email": "البريد الإلكتروني",
  "buyer.phone": "رقم الجوال",
  "buyer.vatNumber": "الرقم الضريبي للمشتري",
  "buyer.companyName": "اسم الشركة",
  lines: "بنود الفاتورة",
  "seller.name": "اسم المنشأة (الإعدادات الضريبية)",
  "seller.vatNumber": "الرقم الضريبي للمنشأة (الإعدادات الضريبية)",
};

/**
 * Review and approve a DRAFT invoice.
 *
 * The draft opens in the finished invoice layout, already populated by the
 * automation — this screen is a review step, not a data-entry form. Only the
 * fields a human may legitimately change are editable; the seller block, the
 * VAT rate and every computed total are rendered read-only because they come
 * from the tax settings and from taxService.
 *
 * Approving is irreversible: it assigns the sequential number, the UUID, the
 * timestamp and the QR, and freezes the record. Hence the confirmation.
 */
const DraftEditor = () => {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const isNew = !draftId || draftId === "new";

  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [dirty, setDirty] = useState(false);

  // customer picker (manual creation only)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const searchTimer = useRef(null);

  const [draft, setDraft] = useState({
    buyer: {
      name: "",
      email: "",
      phone: "",
      company_name: "",
      vat_number: "",
      address: "",
      enrollment_date: "",
    },
    lines: [emptyLine()],
    discount: 0,
    discount_mode: "FIXED",
    discount_rate: 0,
    due_date: "",
    notes: "",
    terms_override: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await taxFetch("/settings");
      setSettings(s);

      if (isNew) {
        const days = parseInt(s.invoiceDueDays, 10) || 30;
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDraft((prev) => ({ ...prev, due_date: d.toISOString().slice(0, 10) }));
        // A blank shell so the document renders while the admin picks a student.
        setInvoice({
          document_type: "INVOICE",
          invoice_type: "SIMPLIFIED_TAX_INVOICE",
          invoice_number: null,
          uuid: null,
          timestamp: null,
          issued_at: null,
          is_draft: true,
          currency: s.currency || "SAR",
          vat_rate: parseFloat(s.vatRate) || 15,
          seller: {
            name: s.companyLegalName,
            name_en: s.companyLegalNameEn,
            vat_number: s.companyVatNumber,
            cr_number: s.companyCrNumber,
            address: s.companyAddress,
          },
          buyer: {},
          items: [],
          payments: [],
          amount_paid: 0,
          balance_due: 0,
          discount: 0,
          price_excluding_vat: 0,
          vat_amount: 0,
          total_with_vat: 0,
        });
        setPickerOpen(true);
        return;
      }

      const inv = await taxFetch(`/tax/invoices/${draftId}`);
      if (!inv.is_draft) {
        // An issued invoice must never reach an edit screen.
        navigate(`/tax/invoices/${inv.id}`, { replace: true });
        return;
      }
      setInvoice(inv);
      setDraft({
        buyer: {
          name: inv.buyer.name || "",
          email: inv.buyer.email || "",
          phone: inv.buyer.phone || "",
          company_name: inv.buyer.company_name || "",
          vat_number: inv.buyer.vat_number || "",
          address: inv.buyer.address || "",
          enrollment_date: inv.buyer.enrollment_date || "",
        },
        lines:
          inv.items.length > 0
            ? inv.items.map((it) => ({
                description: it.description || it.title || "",
                quantity: it.quantity,
                unit_price: it.unit_price,
                discount: 0, // cart discount is re-allocated on every recalc
                tax_category: it.tax_category,
                price_includes_vat: it.price_includes_vat,
              }))
            : [emptyLine()],
        discount: inv.discount_mode === "PERCENT" ? 0 : inv.discount || 0,
        discount_mode: inv.discount_mode || "FIXED",
        discount_rate: inv.discount_rate || 0,
        due_date: inv.due_date || "",
        // Guard the type, not just the value: anything that is not a string
        // here ends up as a SQL parameter on save.
        notes: typeof inv.notes === "string" ? inv.notes : "",
        terms_override: typeof inv.terms_override === "string" ? inv.terms_override : "",
      });
      setDirty(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [draftId, isNew, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- live recalculation ----------------------------------------------
  const vatRate = invoice ? invoice.vat_rate : parseFloat(settings.vatRate) || 15;
  const calc = useMemo(
    () =>
      calculateInvoice(draft.lines, {
        vatRate,
        discount: draft.discount,
        discountMode: draft.discount_mode,
        discountRate: draft.discount_rate,
      }),
    [draft.lines, draft.discount, draft.discount_mode, draft.discount_rate, vatRate]
  );

  // The document renders the recalculated lines, so the computed columns move
  // the moment a price is typed.
  const documentInvoice = useMemo(() => {
    if (!invoice) return null;
    return {
      ...invoice,
      items: calc.items,
      discount: calc.discount,
      price_excluding_vat: calc.net,
      vat_amount: calc.vat,
      total_with_vat: calc.total,
      balance_due: calc.total - (invoice.amount_paid || 0),
    };
  }, [invoice, calc]);

  const touch = () => setDirty(true);
  const setField = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    touch();
  };
  const setLine = (i, key, value) => {
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)),
    }));
    touch();
  };
  const addLine = () => {
    setDraft((d) => ({ ...d, lines: [...d.lines, emptyLine()] }));
    touch();
  };
  const removeLine = (i) => {
    setDraft((d) => ({
      ...d,
      lines: d.lines.length === 1 ? [emptyLine()] : d.lines.filter((_, idx) => idx !== i),
    }));
    touch();
  };

  // ---- customer autofill (manual creation) ------------------------------
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await taxFetch(`/tax/customers/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data || []);
      } catch (_) {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  /** Picking a student fills every buyer field — nothing is typed twice. */
  const pickCustomer = (c) => {
    setDraft((d) => ({
      ...d,
      buyer: {
        name: c.name || "",
        email: c.email || "",
        phone: c.phone || "",
        company_name: c.company_name || "",
        vat_number: "",
        address: c.address || "",
        enrollment_date: c.enrollment_date || "",
      },
      lines:
        c.courses && c.courses.length > 0
          ? c.courses.map((co) => ({ ...emptyLine(), ...co }))
          : d.lines,
    }));
    setPickerOpen(false);
    setQuery("");
    touch();
    toast.success(`تم تعبئة بيانات ${c.name}`);
  };

  // ---- persistence -------------------------------------------------------
  const payload = () => ({
    buyer: draft.buyer,
    lines: draft.lines
      .filter((l) => l.description || l.unit_price)
      .map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 1,
        unit_price: Number(l.unit_price) || 0,
        tax_category: l.tax_category,
        price_includes_vat: !!l.price_includes_vat,
      })),
    discount: Number(draft.discount) || 0,
    discount_mode: draft.discount_mode,
    discount_rate: Number(draft.discount_rate) || 0,
    due_date: draft.due_date || null,
    notes: draft.notes || null,
    terms_override: draft.terms_override || null,
  });

  const save = async ({ silent } = {}) => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await taxFetch("/tax/drafts", {
          method: "POST",
          body: JSON.stringify(payload()),
        });
        if (!silent) toast.success("تم إنشاء المسودة");
        navigate(`/tax/drafts/${res.draft.id}`, { replace: true });
        return res.draft.id;
      }
      await taxFetch(`/tax/drafts/${draftId}`, {
        method: "PUT",
        body: JSON.stringify(payload()),
      });
      setDirty(false);
      if (!silent) toast.success("تم حفظ التعديلات");
      return draftId;
    } catch (e) {
      toast.error(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const issue = async () => {
    setIssuing(true);
    try {
      // Save first, so what gets frozen is exactly what is on screen.
      const id = await save({ silent: true });
      const res = await taxFetch(`/tax/drafts/${id}/issue`, {
        method: "POST",
        body: JSON.stringify({ due_date: draft.due_date || null }),
      });
      toast.success(res.message);
      setConfirmIssue(false);
      navigate(`/tax/invoices/${res.invoice.id}`);
    } catch (e) {
      toast.error(e.message);
      setConfirmIssue(false);
    } finally {
      setIssuing(false);
    }
  };

  const discard = async () => {
    if (isNew) return navigate("/tax/drafts");
    if (!window.confirm("حذف هذه المسودة نهائياً؟ لن يترك ذلك فجوة في تسلسل الفواتير.")) return;
    try {
      await taxFetch(`/tax/drafts/${draftId}`, { method: "DELETE" });
      toast.success("تم حذف المسودة");
      navigate("/tax/drafts");
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !documentInvoice) {
    return <p className="text-center text-red-500">{error || "المسودة غير موجودة"}</p>;
  }

  // Client-side view of what still blocks approval.
  const missing = [];
  if (!draft.buyer.name) missing.push("buyer.name");
  if (!draft.buyer.email) missing.push("buyer.email");
  if (!draft.buyer.phone) missing.push("buyer.phone");
  if (calc.items.length === 0) missing.push("lines");
  if (!settings.companyLegalName) missing.push("seller.name");
  if (!/^3\d{13}3$/.test(String(settings.companyVatNumber || ""))) missing.push("seller.vatNumber");
  if (draft.buyer.vat_number) {
    if (!/^3\d{13}3$/.test(draft.buyer.vat_number)) missing.push("buyer.vatNumber");
    if (!draft.buyer.company_name) missing.push("buyer.companyName");
  }

  return (
    <div dir="rtl">
      <ToastContainer rtl position="top-center" />

      {/* ---- action bar (screen only) ---- */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3 no-print">
        <button
          onClick={() => navigate("/tax/drafts")}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowRight size={18} />
          العودة لقائمة المراجعة
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {isNew ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-white text-sm"
            >
              <UserPlus size={16} />
              اختيار متدرب
            </button>
          ) : null}
          <button
            onClick={discard}
            className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-300 text-sm"
          >
            <Trash2 size={16} />
            حذف المسودة
          </button>
          <button
            onClick={() => save()}
            disabled={saving || !dirty}
            className="flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-white hover:bg-gray-800 text-sm disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "جاري الحفظ..." : dirty ? "حفظ التعديلات" : "لا توجد تعديلات"}
          </button>
          <button
            onClick={() => setConfirmIssue(true)}
            disabled={missing.length > 0}
            title={missing.length > 0 ? "أكمل الحقول الناقصة أولاً" : ""}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 text-sm disabled:opacity-50"
          >
            <Stamp size={16} />
            اعتماد وإصدار / Approve &amp; Issue
          </button>
        </div>
      </div>

      {/* ---- status strip (screen only) ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 no-print">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">الحالة</p>
          <p className="mt-1">
            <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">مسودة</span>
            {invoice.source_kind && invoice.source_kind !== "MANUAL" ? (
              <span className="mr-2 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                {invoice.source_kind === "ORDER" ? "من طلب مدفوع" : "من تسجيل معتمد"}
              </span>
            ) : null}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">تاريخ الاستحقاق</p>
          <input
            type="date"
            value={draft.due_date || ""}
            onChange={(e) => setField("due_date", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">الإجمالي شامل الضريبة</p>
          <p className="text-2xl font-bold text-primary">
            {money(calc.total)} {documentInvoice.currency}
          </p>
        </div>
      </div>

      {invoice.auto_issue_at ? (
        <div className="bg-blue-50 border-r-4 border-blue-500 p-4 mb-4 no-print text-sm text-blue-800">
          ستُصدر هذه المسودة تلقائياً في {new Date(invoice.auto_issue_at).toLocaleString("en-GB")} ما
          لم تُعدَّل. أي تعديل يلغي الإصدار التلقائي ويجعلها تنتظر اعتماداً يدوياً.
        </div>
      ) : null}

      {missing.length > 0 ? (
        <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 mb-4 no-print flex items-start">
          <AlertTriangle className="text-yellow-600 ml-3 shrink-0" size={20} />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">لا يمكن الاعتماد قبل استكمال:</p>
            <ul className="list-disc pr-5">
              {missing.map((m) => (
                <li key={m}>{MISSING_LABELS[m] || m}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="bg-gray-100 border-r-4 border-gray-400 p-3 mb-4 no-print flex items-center gap-2 text-xs text-gray-700">
        <Lock size={14} />
        الحقول ذات الخلفية الفاتحة قابلة للتعديل. بيانات البائع ونسبة الضريبة وجميع المبالغ المحسوبة
        تأتي من الإعدادات ومن محرك الحساب، ولا يمكن تعديلها.
      </div>

      {/* ---- the document, editable in place ---- */}
      <div className="inv-scroll">
        <InvoiceDocument
          invoice={documentInvoice}
          settings={settings}
          editable
          draft={draft}
          totals={calc}
          onDraftChange={setField}
          onLineChange={setLine}
          onAddLine={addLine}
          onRemoveLine={removeLine}
        />
      </div>

      {/* ---- customer picker ---- */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 px-4 py-16">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg" dir="rtl">
            <h3 className="text-lg font-semibold text-primary mb-2">اختيار متدرب</h3>
            <p className="text-sm text-gray-600 mb-4">
              اختر متدرباً مسجلاً لتعبئة بياناته ودوراته تلقائياً. الإنشاء اليدوي مخصص للمبيعات خارج
              المنصة فقط.
            </p>
            <div className="relative mb-4">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو البريد أو الجوال..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  {query.trim().length < 2 ? "اكتب حرفين على الأقل" : "لا توجد نتائج"}
                </p>
              ) : (
                results.map((c, i) => (
                  <button
                    key={`${c.email}-${i}`}
                    onClick={() => pickCustomer(c)}
                    className="w-full text-right border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500" dir="ltr">
                      {c.email} · {c.phone || "—"}
                    </p>
                    {c.courses && c.courses.length > 0 ? (
                      <p className="text-xs text-primary mt-0.5">{c.courses[0].description}</p>
                    ) : null}
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setPickerOpen(false)}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700"
              >
                إدخال يدوي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- irreversible-action confirmation ---- */}
      {confirmIssue && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" dir="rtl">
            <h3 className="text-lg font-semibold text-primary mb-2">تأكيد الاعتماد والإصدار</h3>
            <p className="text-sm text-gray-600 mb-4">
              سيتم منح الفاتورة رقماً تسلسلياً ومعرّفاً فريداً وطابعاً زمنياً ورمز QR، وتصبح مستنداً
              قانونياً <strong>لا يمكن تعديله أو حذفه</strong>. أي تصحيح بعد ذلك يتطلب إشعاراً دائناً
              أو مديناً.
            </p>
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">المتدرب</span>
                <strong>{draft.buyer.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">عدد البنود</span>
                <strong>{calc.items.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">الضريبة</span>
                <strong>
                  {money(calc.vat)} {documentInvoice.currency}
                </strong>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2 text-base">
                <span className="text-gray-700 font-semibold">الإجمالي شامل الضريبة</span>
                <strong className="text-primary">
                  {money(calc.total)} {documentInvoice.currency}
                </strong>
              </div>
            </div>
            {String(settings.invoiceEmailOnIssue) === "true" && draft.buyer.email ? (
              <p className="text-xs text-gray-500 mb-4">
                ستُرسل الفاتورة تلقائياً إلى {draft.buyer.email} بعد الإصدار.
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmIssue(false)}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={issue}
                disabled={issuing}
                className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {issuing ? "جاري الإصدار..." : "اعتماد وإصدار"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftEditor;
