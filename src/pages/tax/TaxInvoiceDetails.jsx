import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Download,
  Ban,
  FileMinus,
  FilePlus2,
  Banknote,
  BellRing,
  Mail,
  Send,
  AlertTriangle,
  History,
  Receipt,
  Undo2,
  Lock,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { taxFetch, money, formatDate, formatDateTime } from "./taxApi";
import InvoiceHistory from "./InvoiceHistory";
import "./invoiceDocument.css";

const docLabels = {
  INVOICE: "فاتورة ضريبية",
  CREDIT_NOTE: "إشعار دائن",
  DEBIT_NOTE: "إشعار مدين",
};

const docLabelsEn = {
  INVOICE: "Tax Invoice",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};

// The three permitted amendments. An issued invoice is never edited.
const NOTE_ACTIONS = {
  CANCEL: {
    title: "إلغاء الفاتورة بالكامل",
    blurb:
      "سيتم إصدار إشعار دائن (إشعار دائن) بكامل قيمة الفاتورة ومرتبط برقمها. الفاتورة الأصلية تبقى في السجل كما هي.",
    confirm: "تأكيد الإلغاء",
    tone: "bg-red-600 hover:bg-red-700",
    amount: false,
  },
  REDUCE: {
    title: "تخفيض قيمة الفاتورة",
    blurb:
      "إشعار دائن جزئي بقيمة الفرق فقط — للخصم المتأخر أو الاسترداد الجزئي أو حذف بند.",
    confirm: "إصدار إشعار دائن",
    tone: "bg-orange-600 hover:bg-orange-700",
    amount: true,
  },
  INCREASE: {
    title: "زيادة قيمة الفاتورة",
    blurb:
      "إشعار مدين (إشعار مدين) بقيمة الفرق — لبند لم يُحتسب أو سعر أقل من المستحق.",
    confirm: "إصدار إشعار مدين",
    tone: "bg-primary hover:bg-primary/90",
    amount: true,
  },
};

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary";

const statusPill = (invoice) => {
  const map = {
    draft: ["مسودة", "bg-gray-200 text-gray-700"],
    issued: ["صادرة", "bg-green-100 text-green-800"],
    amended: ["معدّلة بإشعار", "bg-orange-100 text-orange-800"],
    cancelled: ["ملغاة", "bg-red-100 text-red-800"],
  };
  const [label, tone] = map[invoice.status] || map.issued;
  return <span className={`px-2 py-1 rounded-full text-xs ${tone}`}>{label}</span>;
};

const paymentPill = (invoice) => {
  const map = {
    paid: ["مسددة", "bg-green-100 text-green-800"],
    partial: ["مسددة جزئياً", "bg-yellow-100 text-yellow-800"],
    unpaid: ["غير مسددة", "bg-gray-200 text-gray-700"],
  };
  const [label, tone] = map[invoice.payment_status] || map.unpaid;
  return <span className={`px-2 py-1 rounded-full text-xs ${tone}`}>{label}</span>;
};

/**
 * Download the invoice as a PDF file, straight to disk - no print dialog.
 *
 * html2canvas was dropped once before because it cropped RTL content: it drew
 * the live sheet, which could be wider than its canvas, and the overflow was
 * cut from the left - the leading edge of every Arabic label. Here it draws a
 * copy laid out in a fixed A4-width box (190mm = A4 minus the 10mm margins),
 * so there is nothing wider than the canvas to crop. The sheet is the server's
 * own inline-styled HTML (invoiceHtml.js), so it needs no stylesheet.
 */
const PDF_WIDTH_PX = 718; // 190mm at 96dpi

async function downloadPdf(source, filename) {
  if (!source) return false;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Two elements, on purpose. The wrapper hides the copy behind the page
  // (html2canvas draws an element far outside the viewport as blank); the box
  // inside it is what gets drawn, and stays a plain static block so none of
  // the hiding styles are part of the picture. (Under html2pdf a fixed,
  // z-index:-1 box was drawn behind html2pdf's own white overlay - an
  // all-white PDF.)
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  Object.assign(wrapper.style, {
    position: "fixed",
    top: "0",
    left: "0",
    zIndex: "-1",
    pointerEvents: "none",
  });
  const box = document.createElement("div");
  box.className = "pdf-capture";
  box.dir = "rtl";
  Object.assign(box.style, {
    width: `${PDF_WIDTH_PX}px`,
    background: "#fff",
    fontFamily: "Tahoma, Arial, 'Segoe UI', sans-serif",
  });
  wrapper.appendChild(box);
  // Tailwind's preflight makes every <img> display:block, and html2canvas
  // 1.4 then mis-measures the text baseline: every line came out drawn too
  // low, sitting on the cell border below it. Undo that inside the copy only.
  box.innerHTML =
    "<style>.pdf-capture img{display:inline-block}.pdf-capture{line-height:normal}</style>" +
    source.innerHTML;
  box.querySelectorAll(".no-print").forEach((el) => el.remove());
  box.querySelectorAll(".inv-sheet").forEach((el) => {
    el.style.border = "0";
    el.style.padding = "0";
  });
  document.body.appendChild(wrapper);

  try {
    // The logo, stamp and QR have to be decoded before they are drawn.
    await Promise.race([
      Promise.all(
        [...box.querySelectorAll("img")].map((img) =>
          img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
        )
      ),
      new Promise((r) => setTimeout(r, 4000)),
    ]);

    // Where a page may end: the bottom edge of any row, list item, paragraph,
    // table or image. html2pdf sliced the picture at a fixed height and cut a
    // line of the terms in half; the whole sheet is one outer table, so its
    // avoid:"tr" rule had nothing usable to hold on to.
    const top = box.getBoundingClientRect().top;
    const total = box.scrollHeight;
    const cuts = [...new Set(
      [...box.querySelectorAll("tr, li, p, table, img")].map((el) =>
        Math.round(el.getBoundingClientRect().bottom - top)
      )
    )].sort((x, y) => x - y);

    const SCALE = 2;
    const canvas = await html2canvas(box, {
      scale: SCALE,
      useCORS: true, // logo and stamp come from back.acit-net.com/uploads
      backgroundColor: "#ffffff",
      width: PDF_WIDTH_PX,
      windowWidth: PDF_WIDTH_PX,
      windowHeight: total,
      scrollX: 0,
      scrollY: 0,
    });

    const MARGIN = 10; // mm
    const contentW = 210 - 2 * MARGIN; // 190mm, which is PDF_WIDTH_PX
    const pageH = Math.floor(PDF_WIDTH_PX * (297 - 2 * MARGIN) / contentW); // css px per page
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    let start = 0;
    let first = true;
    while (start < total - 1) {
      let end = Math.min(start + pageH, total);
      if (end < total) {
        // The lowest safe edge on this page, unless that would leave the page
        // less than half used - then a hard cut is the lesser evil.
        const safe = cuts.filter((c) => c > start + pageH / 2 && c <= end).pop();
        if (safe) end = safe;
      }
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.max(1, Math.round((end - start) * SCALE));
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, Math.round(start * SCALE), canvas.width, slice.height, 0, 0, canvas.width, slice.height);

      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.95),
        "JPEG",
        MARGIN,
        MARGIN,
        contentW,
        ((end - start) * contentW) / PDF_WIDTH_PX
      );
      start = end;
    }

    pdf.save(filename);
    return true;
  } finally {
    wrapper.remove();
  }
}

const TaxInvoiceDetails = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  // Logo, stamp and default terms live in the tax settings, so the document
  // component needs them alongside the invoice itself.
  const [settings, setSettings] = useState({});
  // The rendered invoice document, from the shared server template.
  const [docHtml, setDocHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("details");
  const [busy, setBusy] = useState(false);

  // amendment modal
  const [noteKind, setNoteKind] = useState(null);
  const [reason, setReason] = useState("");
  const [noteAmount, setNoteAmount] = useState("");
  const [noteInclusive, setNoteInclusive] = useState(true);
  const [duplicate, setDuplicate] = useState(false);

  // resend modal — the address is optional and overrides the buyer's for one
  // send only; blank means "send to the address on the invoice".
  const [resendOpen, setResendOpen] = useState(false);
  const [resendTo, setResendTo] = useState("");

  // payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payReference, setPayReference] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The document itself comes from the server template; `inv` still drives
      // the dashboard chrome (status cards, action buttons, history).
      const [inv, cfg, doc] = await Promise.all([
        taxFetch(`/tax/invoices/${invoiceId}`),
        taxFetch("/settings").catch(() => ({})),
        taxFetch(`/tax/invoices/${invoiceId}/html`).catch(() => null),
      ]);
      setInvoice(inv);
      setSettings(cfg);
      setDocHtml(doc && doc.html ? doc.html : "");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The invoice sheet only exists in the DOM on the details tab, but the export
   * button sits in the header and is reachable from the history tab too — so
   * switch back and give React a paint before printing an empty page.
   */
  const ensureDocumentVisible = async () => {
    if (document.getElementById('invoice-content')) return true;
    setTab('details');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return !!document.getElementById('invoice-content');
  };

  /**
   * Export is the browser's own print pipeline, not a canvas rasteriser.
   *
   * html2canvas was replaced because it draws the sheet into a fixed-size
   * bitmap: anything wider than that canvas is cropped from the left origin,
   * which in RTL silently removes the leading edge of every label. Printing
   * hands layout to the engine that already knows how to fit content onto A4,
   * so there is no canvas to overflow, Arabic is shaped by the text engine
   * rather than resampled, and the text in the saved PDF stays selectable.
   *
   * The user picks "Save as PDF" in the print dialog.
   */
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    // This used to return silently when the sheet was missing, which looked
    // exactly like a dead button. Say what went wrong instead.
    if (!(await ensureDocumentVisible())) {
      toast.error("الفاتورة لم تُحمَّل بعد، حاول مرة أخرى بعد ظهورها");
      return;
    }
    setDownloading(true);
    try {
      const name = invoice.invoice_number || invoice.number || `invoice-${invoice.id}`;
      await downloadPdf(document.getElementById("invoice-content"), `${name}.pdf`);
      taxFetch(`/tax/invoices/${invoice.id}/exported`, {
        method: "POST",
        body: JSON.stringify({ format: "pdf" }),
      }).catch(() => {});
    } catch (e) {
      console.error("PDF export failed:", e);
      toast.error(`تعذّر تحميل الفاتورة: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const openNote = (kind) => {
    setNoteKind(kind);
    setReason("");
    setNoteAmount("");
    setNoteInclusive(true);
    setDuplicate(false);
  };

  const submitNote = async () => {
    const cfg = NOTE_ACTIONS[noteKind];
    if (!reason.trim()) return toast.error("سبب الإشعار مطلوب");
    if (cfg.amount && !(Number(noteAmount) > 0)) return toast.error("أدخل قيمة الفرق");

    setBusy(true);
    try {
      const res = await taxFetch(`/tax/invoices/${invoice.id}/notes`, {
        method: "POST",
        body: JSON.stringify({
          type: noteKind,
          reason: reason.trim(),
          confirm: true,
          ...(cfg.amount
            ? { amount: Number(noteAmount), price_includes_vat: noteInclusive }
            : {}),
          ...(noteKind === "CANCEL" ? { duplicate_as_draft: duplicate } : {}),
        }),
      });
      toast.success(`${res.message} — ${res.note_number}`);
      setNoteKind(null);
      if (res.duplicate_draft_id) {
        navigate(`/tax/drafts/${res.duplicate_draft_id}`);
        return;
      }
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    if (!(Number(payAmount) > 0)) return toast.error("أدخل قيمة الدفعة");
    setBusy(true);
    try {
      await taxFetch(`/tax/invoices/${invoice.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payAmount),
          method: payMethod,
          reference: payReference || null,
        }),
      });
      toast.success("تم تسجيل الدفعة");
      setPayOpen(false);
      setPayAmount("");
      setPayReference("");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reversePayment = async (payment) => {
    const why = window.prompt("سبب عكس الدفعة؟");
    if (!why || !why.trim()) return;
    try {
      await taxFetch(`/tax/payments/${payment.id}/reverse`, {
        method: "POST",
        body: JSON.stringify({ reason: why.trim() }),
      });
      toast.success("تم عكس الدفعة");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  /**
   * `to` overrides the buyer's address for this send only.
   *
   * No PDF is attached. The attachment used to be rendered by html2canvas, the
   * same path that was clipping the download — mailing a customer a cropped
   * invoice is worse than mailing none. The server builds the full document
   * into the e-mail body and includes a signed link to the web copy, so the
   * recipient gets everything without an attachment. The endpoint still accepts
   * a `pdf` field if a trustworthy renderer is ever wired up.
   */
  const sendMail = async (kind, to) => {
    setBusy(true);
    try {
      const body = {};
      if (to) body.to = to;

      const res = await taxFetch(
        `/tax/invoices/${invoice.id}/${kind === "reminder" ? "reminder" : "email"}`,
        { method: "POST", body: JSON.stringify(body) }
      );
      toast.success(res.message);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openResend = () => {
    setResendTo("");
    setResendOpen(true);
  };

  const submitResend = async () => {
    const to = resendTo.trim();
    if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
      toast.error("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }
    setResendOpen(false);
    await sendMail("invoice", to || undefined);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return <p className="text-center text-red-500">{error || "الفاتورة غير موجودة"}</p>;
  }

  // A draft has no place on this screen — it belongs in the editor.
  if (invoice.is_draft) {
    navigate(`/tax/drafts/${invoice.id}`, { replace: true });
    return null;
  }

  const isNote = invoice.document_type !== "INVOICE";
  const canAmend = !isNote && invoice.status !== "cancelled";
  const canCollect = !isNote && invoice.balance_due > 0 && invoice.status !== "cancelled";

  const TabButton = ({ id, icon: Icon, children }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
        tab === id ? "bg-primary text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );

  return (
    <div dir="rtl">
      <ToastContainer rtl position="top-center" />

      <div className="flex flex-wrap items-center justify-between mb-4 gap-3 no-print">
        <button
          onClick={() => navigate("/tax/invoices")}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowRight size={18} />
          العودة للفواتير
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {canAmend && (
            <>
              <button
                onClick={() => openNote("CANCEL")}
                className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-700 text-sm"
              >
                <Ban size={16} />
                إلغاء
              </button>
              <button
                onClick={() => openNote("REDUCE")}
                className="flex items-center gap-2 rounded-md bg-orange-600 px-3 py-2 text-white hover:bg-orange-700 text-sm"
              >
                <FileMinus size={16} />
                تخفيض
              </button>
              <button
                onClick={() => openNote("INCREASE")}
                className="flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-white hover:bg-gray-800 text-sm"
              >
                <FilePlus2 size={16} />
                زيادة
              </button>
            </>
          )}
          {canCollect && (
            <>
              <button
                onClick={() => setPayOpen(true)}
                className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700 text-sm"
              >
                <Banknote size={16} />
                تسجيل دفعة
              </button>
              <button
                onClick={() => sendMail("reminder")}
                disabled={busy}
                className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-white hover:opacity-90 text-sm disabled:opacity-50"
              >
                <BellRing size={16} />
                إرسال تذكير
              </button>
            </>
          )}
          {!isNote && (
            <>
              <button
                onClick={() => sendMail("invoice")}
                disabled={busy}
                className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-300 text-sm disabled:opacity-50"
              >
                <Mail size={16} />
                إرسال بالبريد
              </button>
              <button
                onClick={openResend}
                disabled={busy}
                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-100 text-sm disabled:opacity-50"
              >
                <Send size={16} />
                إعادة إرسال
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-white hover:bg-primary/90 disabled:opacity-60 text-sm"
          >
            <Download size={16} />
            {downloading ? "جارٍ التحميل…" : "تحميل PDF"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 no-print bg-gray-100 rounded-lg p-1 w-fit">
        <TabButton id="details" icon={Receipt}>
          تفاصيل الفاتورة
        </TabButton>
        <TabButton id="history" icon={History}>
          السجل
        </TabButton>
      </div>

      {tab === "history" ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-primary mb-6">سجل الفاتورة</h3>
          <InvoiceHistory invoiceId={invoice.id} />
        </div>
      ) : (
        <>
          {/* ---- collection strip ---- */}
          {!isNote && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">الحالة</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {statusPill(invoice)}
                  {paymentPill(invoice)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">المستحق بعد الإشعارات</p>
                <p className="text-xl font-bold text-primary mt-1">
                  {money(invoice.payable_total)} {invoice.currency}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">المسدد</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {money(invoice.amount_paid)} {invoice.currency}
                </p>
              </div>
              <div
                className={`rounded-lg shadow p-4 ${
                  invoice.is_overdue ? "bg-red-50" : "bg-white"
                }`}
              >
                <p className="text-xs text-gray-500">المتبقي</p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    invoice.is_overdue ? "text-red-700" : "text-gray-800"
                  }`}
                >
                  {money(invoice.balance_due)} {invoice.currency}
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  {invoice.due_date ? `الاستحقاق: ${invoice.due_date}` : "بدون تاريخ استحقاق"}
                  {invoice.is_overdue ? ` — متأخرة ${invoice.days_overdue} يوماً` : ""}
                </p>
              </div>
            </div>
          )}

          {/* A send that never left the building. Surfaced here rather than
              only in the trail, so nobody assumes the customer has the invoice. */}
          {invoice.last_email?.status === "failed" && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border-r-4 border-red-500 bg-red-50 p-4 no-print">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    لم يتم تسليم الفاتورة بالبريد الإلكتروني
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    آخر محاولة {formatDateTime(invoice.last_email.at)}
                    {invoice.last_email.to ? (
                      <>
                        {" — "}
                        <span dir="ltr">{invoice.last_email.to}</span>
                      </>
                    ) : null}
                    {invoice.last_email.error ? ` — ${invoice.last_email.error}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={openResend}
                disabled={busy}
                className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Send size={15} />
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Rendered by the server's invoiceHtml template — the same markup
              the customer receives by e-mail and at the secure link. Injecting
              it here rather than re-implementing the document in React is what
              makes "the customer sees what we see" true by construction: there
              is no second layout that can drift. */}
          <div className="inv-scroll">
            {docHtml ? (
              // id="invoice-content" is what the print button looks for. The
              // server's HTML carries the .inv-sheet but no id, so without it
              // ensureDocumentVisible() found nothing and the button silently
              // did nothing. The wrapper (not the sheet) is printed, so the
              // document's own <style> block travels with it.
              <div id="invoice-content" dangerouslySetInnerHTML={{ __html: docHtml }} />
            ) : (
              <p className="p-6 text-sm text-gray-500">جارٍ تحميل الفاتورة…</p>
            )}
          </div>

          {invoice.status === "cancelled" && (
            <div className="mt-4 bg-red-50 border-r-4 border-red-500 p-4 no-print">
              <p className="text-sm text-red-700">
                أُلغيت هذه الفاتورة بإشعار دائن رقم {invoice.credit_note_id}
              </p>
            </div>
          )}
          {isNote && invoice.reason ? (
            <div className="mt-4 bg-orange-50 border-r-4 border-orange-500 p-4 no-print">
              <p className="text-sm text-orange-700">سبب الإشعار: {invoice.reason}</p>
            </div>
          ) : null}

          {/* ---- linked notes ---- */}
          {invoice.related_notes && invoice.related_notes.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6 mt-6 no-print">
              <h3 className="text-lg font-semibold text-primary mb-4">
                الإشعارات المرتبطة بهذه الفاتورة
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-right text-sm font-semibold text-primary">الرقم</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-primary">النوع</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-primary">التاريخ</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-primary">القيمة</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-primary">السبب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.related_notes.map((n) => (
                      <tr
                        key={n.id}
                        className="border-b cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/tax/invoices/${n.id}`)}
                      >
                        <td className="px-4 py-2 text-right text-sm text-primary">
                          {n.invoice_number}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              n.document_type === "DEBIT_NOTE"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {docLabels[n.document_type]}
                            {n.note_scope === "FULL" ? " (كامل)" : " (جزئي)"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">
                          {formatDate(n.issued_at)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-gray-800">
                          {money(n.total_with_vat)} {invoice.currency}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-600">{n.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* ---- payments ---- */}
          {!isNote && (
            <div className="bg-white rounded-lg shadow p-6 mt-6 no-print">
              <h3 className="text-lg font-semibold text-primary mb-4">الدفعات</h3>
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-right text-sm font-semibold text-primary">التاريخ</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-primary">المبلغ</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-primary">الطريقة</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-primary">المرجع</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-primary">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="px-4 py-2 text-right text-sm text-gray-700">
                            {formatDateTime(p.paid_at)}
                          </td>
                          <td
                            className={`px-4 py-2 text-right text-sm font-semibold ${
                              p.reversed ? "text-gray-400 line-through" : "text-gray-800"
                            }`}
                          >
                            {money(p.amount)} {invoice.currency}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-700">{p.method}</td>
                          <td className="px-4 py-2 text-right text-sm text-gray-600">
                            {p.reference || "—"}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {p.reversed ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                                معكوسة
                              </span>
                            ) : (
                              <button
                                onClick={() => reversePayment(p)}
                                className="flex items-center gap-1 text-amber-700 hover:underline text-sm"
                              >
                                <Undo2 size={14} />
                                عكس الدفعة
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">لم تُسجَّل أي دفعة بعد</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-6 text-xs text-gray-500 no-print">
            <Lock size={14} />
            هذا المستند مُجمّد: لا يمكن تعديله أو حذفه. أي تصحيح يتم بإشعار دائن أو مدين.
          </div>
        </>
      )}

      {/* ---- amendment modal ---- */}
      {noteKind && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" dir="rtl">
            <h3 className="text-lg font-semibold text-primary mb-2">
              {NOTE_ACTIONS[noteKind].title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">{NOTE_ACTIONS[noteKind].blurb}</p>

            {NOTE_ACTIONS[noteKind].amount && (
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">
                  قيمة الفرق <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={input}
                  value={noteAmount}
                  onChange={(e) => setNoteAmount(e.target.value)}
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={noteInclusive}
                    onChange={(e) => setNoteInclusive(e.target.checked)}
                  />
                  القيمة شاملة الضريبة
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  تُحتسب الضريبة بنفس نسبة الفاتورة الأصلية ({invoice.vat_rate}%).
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">
                السبب <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                className={input}
                value={reason}
                placeholder="اكتب سبب الإشعار — يُحفظ في سجل الفاتورة"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {noteKind === "CANCEL" && (
              <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={duplicate}
                  onChange={(e) => setDuplicate(e.target.checked)}
                />
                إنشاء نسخة كمسودة جديدة لتحضير فاتورة مصححة
              </label>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setNoteKind(null)}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={submitNote}
                disabled={busy || !reason.trim()}
                className={`px-4 py-2 rounded-md text-white disabled:opacity-50 ${NOTE_ACTIONS[noteKind].tone}`}
              >
                {busy ? "جاري الإصدار..." : NOTE_ACTIONS[noteKind].confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- payment modal ---- */}
      {resendOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" dir="rtl">
            <h3 className="text-lg font-semibold text-primary mb-2">إعادة إرسال الفاتورة</h3>
            <p className="text-sm text-gray-600 mb-4">
              تُرسل إلى{" "}
              <span dir="ltr" className="font-medium">
                {invoice.buyer?.email || "—"}
              </span>{" "}
              ما لم تحدد عنواناً آخر.
            </p>
            <label className="block text-sm text-gray-600 mb-1">
              بريد إلكتروني بديل (اختياري)
            </label>
            <input
              type="email"
              dir="ltr"
              value={resendTo}
              onChange={(e) => setResendTo(e.target.value)}
              placeholder={invoice.buyer?.email || "name@example.com"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-5"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResendOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={submitResend}
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
              >
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}

      {payOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" dir="rtl">
            <h3 className="text-lg font-semibold text-primary mb-2">تسجيل دفعة</h3>
            <p className="text-sm text-gray-600 mb-4">
              المتبقي على الفاتورة: {money(invoice.balance_due)} {invoice.currency}
            </p>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">المبلغ</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.balance_due}
                  className={input}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">طريقة الدفع</label>
                <select
                  className={input}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="cash">نقداً</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="card">بطاقة</option>
                  <option value="cheque">شيك</option>
                  <option value="online">دفع إلكتروني</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">المرجع (اختياري)</label>
                <input
                  className={input}
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPayOpen(false)}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={submitPayment}
                disabled={busy}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {busy ? "جاري الحفظ..." : "تسجيل الدفعة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxInvoiceDetails;
