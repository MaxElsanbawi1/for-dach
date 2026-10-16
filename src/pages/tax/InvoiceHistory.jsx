import React, { useEffect, useState } from "react";
import {
  FilePlus,
  Pencil,
  Trash2,
  Stamp,
  Banknote,
  Undo2,
  FileMinus,
  FilePlus2,
  Mail,
  BellRing,
  Download,
  CalendarClock,
  Circle,
} from "lucide-react";
import { taxFetch, money, formatDateTime } from "./taxApi";

// One entry per action recorded by services/invoiceAudit.js.
const ACTIONS = {
  draft_created: { label: "أُنشئت المسودة", icon: FilePlus, tone: "bg-gray-400" },
  draft_edited: { label: "عُدّلت المسودة", icon: Pencil, tone: "bg-gray-400" },
  draft_discarded: { label: "حُذفت المسودة", icon: Trash2, tone: "bg-gray-500" },
  invoice_issued: { label: "صدرت الفاتورة", icon: Stamp, tone: "bg-primary" },
  payment_recorded: { label: "تسجيل دفعة", icon: Banknote, tone: "bg-green-600" },
  payment_reversed: { label: "عكس دفعة", icon: Undo2, tone: "bg-amber-600" },
  credit_note_issued: { label: "إشعار دائن", icon: FileMinus, tone: "bg-red-600" },
  debit_note_issued: { label: "إشعار مدين", icon: FilePlus2, tone: "bg-orange-600" },
  invoice_emailed: { label: "إرسال الفاتورة بالبريد", icon: Mail, tone: "bg-secondary" },
  reminder_sent: { label: "إرسال تذكير بالسداد", icon: BellRing, tone: "bg-secondary" },
  pdf_exported: { label: "تصدير PDF", icon: Download, tone: "bg-gray-400" },
  due_date_set: { label: "تحديد تاريخ الاستحقاق", icon: CalendarClock, tone: "bg-gray-400" },
};

// Field names as they appear in a draft_edited diff.
const FIELD_LABELS = {
  buyer_name: "اسم العميل",
  buyer_email: "البريد الإلكتروني",
  buyer_phone: "الهاتف",
  buyer_company_name: "اسم الشركة",
  buyer_vat_number: "الرقم الضريبي للعميل",
  buyer_address: "العنوان",
  invoice_type: "نوع الفاتورة",
  due_date: "تاريخ الاستحقاق",
  vat_rate: "نسبة الضريبة",
  discount: "الخصم",
  price_excluding_vat: "الإجمالي بدون ضريبة",
  vat_amount: "الضريبة",
  total_with_vat: "الإجمالي شامل الضريبة",
};

const show = (v) =>
  v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? money(v) : String(v);

/** The changed-fields table of a draft edit. */
const FieldDiff = ({ changed }) => {
  const keys = Object.keys(changed || {});
  if (keys.length === 0) return null;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="min-w-full text-xs border border-gray-200 rounded">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-1.5 text-right font-semibold text-gray-600">الحقل</th>
            <th className="px-3 py-1.5 text-right font-semibold text-gray-600">قبل</th>
            <th className="px-3 py-1.5 text-right font-semibold text-gray-600">بعد</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-t border-gray-100">
              <td className="px-3 py-1.5 text-gray-700">{FIELD_LABELS[k] || k}</td>
              <td className="px-3 py-1.5 text-red-600 line-through">{show(changed[k].before)}</td>
              <td className="px-3 py-1.5 text-green-700">{show(changed[k].after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** The compact line-level diff of a draft edit. */
const LineDiff = ({ lines }) => {
  if (!lines) return null;
  const render = (list, tone) => (
    <ul className={`text-xs ${tone} space-y-0.5`}>
      {(list || []).map((l, i) => (
        <li key={i}>
          {l.description} × {l.quantity} — {money(l.unit_price)}
          {l.discount ? ` (خصم ${money(l.discount)})` : ""}
        </li>
      ))}
      {(list || []).length === 0 ? <li>لا توجد بنود</li> : null}
    </ul>
  );
  return (
    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-red-50 rounded p-2">
        <p className="text-xs font-semibold text-red-700 mb-1">البنود قبل</p>
        {render(lines.before, "text-red-700")}
      </div>
      <div className="bg-green-50 rounded p-2">
        <p className="text-xs font-semibold text-green-700 mb-1">البنود بعد</p>
        {render(lines.after, "text-green-700")}
      </div>
    </div>
  );
};

/** Everything else: a readable key/value strip. */
const DETAIL_LABELS = {
  invoice_number: "رقم المستند",
  note_number: "رقم الإشعار",
  amount: "المبلغ",
  vat_amount: "الضريبة",
  balance_due: "المتبقي",
  balance_before: "المتبقي قبل",
  balance_after: "المتبقي بعد",
  method: "طريقة الدفع",
  reference: "المرجع",
  to: "المرسل إليه",
  reminder_number: "رقم التذكير",
  send_number: "رقم الإرسال",
  days_overdue: "أيام التأخير",
  due_date: "تاريخ الاستحقاق",
  total_with_vat: "الإجمالي شامل الضريبة",
  sequence_counter: "تسلسل المستند",
  scope: "نطاق الإشعار",
  uuid: "المعرّف الفريد",
  duplicated_from_invoice_number: "نُسخت من",
};

const DetailChips = ({ details }) => {
  const entries = Object.entries(details || {}).filter(
    ([k, v]) =>
      DETAIL_LABELS[k] && v !== null && v !== undefined && v !== "" && typeof v !== "object"
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {entries.map(([k, v]) => (
        <span key={k} className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-700">
          {DETAIL_LABELS[k]}: <strong>{typeof v === "number" ? money(v) : String(v)}</strong>
        </span>
      ))}
    </div>
  );
};

/**
 * The History tab: the invoice_audit_log rendered as a chronological timeline —
 * who did what, when, and why.
 */
const InvoiceHistory = ({ invoiceId }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await taxFetch(`/tax/invoices/${invoiceId}/history`);
        if (!cancelled) setEntries(res.entries || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-r-4 border-red-500 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-center text-gray-500 py-8">لا يوجد سجل لهذه الفاتورة بعد</p>;
  }

  return (
    <div className="relative">
      {/* the spine of the timeline — on the right, for RTL */}
      <div className="absolute top-2 bottom-2 right-[19px] w-px bg-gray-200" />
      <ul className="space-y-6">
        {entries.map((e) => {
          const meta = ACTIONS[e.action] || {
            label: e.action,
            icon: Circle,
            tone: "bg-gray-400",
          };
          const Icon = meta.icon;
          const changed = e.details && e.details.changed_fields;
          return (
            <li key={e.id} className="relative pr-14">
              <span
                className={`absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full text-white ${meta.tone}`}
              >
                <Icon size={18} />
              </span>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-semibold text-primary">{meta.label}</h4>
                  <span className="text-xs text-gray-500">{formatDateTime(e.timestamp)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  بواسطة: {e.actor_name || (e.actor_user_id ? `مستخدم #${e.actor_user_id}` : "النظام")}
                </p>
                {e.reason ? (
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="text-gray-500">السبب: </span>
                    {e.reason}
                  </p>
                ) : null}
                <DetailChips details={e.details} />
                {changed ? <FieldDiff changed={changed} /> : null}
                {e.details && e.details.lines ? <LineDiff lines={e.details.lines} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default InvoiceHistory;
