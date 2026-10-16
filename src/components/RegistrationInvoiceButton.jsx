import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Receipt, FileText, Loader2 } from "lucide-react";
import { taxFetch } from "../pages/tax/taxApi";

/**
 * The invoice action for one course enrolment.
 *
 * Used from the student detail page and from both course detail pages, which
 * previously each had their own idea of what an "invoice" was — the course
 * pages downloaded a PDF built from a hardcoded HTML string, with no sequential
 * number, no UUID, no QR and no entry in the ledger. That document is not a tax
 * invoice and must not be handed to a customer, so all three now open the real
 * one from tax_invoices.
 *
 * Creating is idempotent server-side: pressing twice never yields two invoices.
 */

/**
 * Batch-load which of these registrations already have an invoice.
 *
 * One request for a whole table rather than one per row. Failures are
 * swallowed: the tax endpoints are admin/accountant-only, and a role that
 * cannot see them should still get a working page.
 */
export function useRegistrationInvoices(registrationIds) {
  const [invoices, setInvoices] = useState({});
  // Join to a primitive so the effect does not re-run on every render just
  // because the caller rebuilt the array.
  const key = (registrationIds || []).filter(Boolean).join(",");

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      const res = await taxFetch(`/tax/registrations/invoices?ids=${key}`);
      setInvoices(res.data || {});
    } catch (_) {
      setInvoices({});
    }
  }, [key]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { invoices, refresh };
}

const TONES = {
  draft: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  issued: "bg-green-100 text-green-800 hover:bg-green-200",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-200",
};

const RegistrationInvoiceButton = ({ registration, invoice, onChanged, compact }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const registrationId = registration.RegistrationID;
  const approved = String(registration.Status || "").toLowerCase() === "approved";

  const open = (inv) =>
    navigate(inv.is_draft ? `/tax/drafts/${inv.id}` : `/tax/invoices/${inv.id}`);

  const handle = async () => {
    if (invoice) return open(invoice);

    setBusy(true);
    setError("");
    try {
      const res = await taxFetch(`/tax/registrations/${registrationId}/invoice`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (onChanged) onChanged();
      open(res.invoice);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const base =
    "inline-flex items-center justify-center gap-1.5 rounded px-2 md:px-3 py-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";

  if (invoice) {
    return (
      <button
        type="button"
        onClick={handle}
        title={
          // An invoice reached through the order is the same document, but the
          // student was billed for a basket rather than for this seat alone —
          // worth saying so before it is opened.
          (invoice.via_order ? "فاتورة الطلب المدفوع — " : "") +
          (invoice.is_draft
            ? "مسودة بانتظار الاعتماد — اضغط للمراجعة والإصدار"
            : `عرض الفاتورة ${invoice.invoice_number || ""}`)
        }
        className={`${base} ${TONES[invoice.status] || TONES.issued}`}
      >
        <FileText size={14} />
        <span className="truncate max-w-[10rem]">
          {invoice.is_draft ? "مسودة" : compact ? "الفاتورة" : invoice.invoice_number || "الفاتورة"}
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={busy || !approved}
        title={
          approved
            ? "إنشاء فاتورة ضريبية لهذا التسجيل"
            : "يجب اعتماد التسجيل (Approved) قبل إصدار الفاتورة"
        }
        className={`${base} bg-primary text-white hover:bg-primary/90`}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
        <span>{busy ? "جاري الإنشاء..." : "إنشاء فاتورة"}</span>
      </button>
      {error ? <p className="mt-1 text-[11px] leading-tight text-red-600">{error}</p> : null}
    </>
  );
};

export default RegistrationInvoiceButton;
