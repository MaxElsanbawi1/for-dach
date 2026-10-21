import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, FileText, CheckCheck, AlertTriangle, Clock } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { taxFetch, money, formatDateTime } from "./taxApi";
import { useDateRange, DateRangeBar, exportExcel } from "../../components/DateExport";

const POLICY_LABELS = {
  ALWAYS_REVIEW: "مراجعة يدوية لكل فاتورة",
  AUTO_ISSUE: "إصدار تلقائي فوري",
  AUTO_ISSUE_WITH_TIMEOUT: "إصدار تلقائي بعد مهلة المراجعة",
};

const SOURCE_LABELS = {
  ORDER: ["من طلب مدفوع", "bg-blue-100 text-blue-700"],
  REGISTRATION: ["من تسجيل معتمد", "bg-purple-100 text-purple-700"],
  MANUAL: ["إنشاء يدوي", "bg-gray-200 text-gray-700"],
};

const EXPORT_COLUMNS = [
  { header: "رقم المسودة", key: "id" },
  { header: "العميل", value: (d) => d.buyer?.name || "غير محدد" },
  { header: "الإيميل", value: (d) => d.buyer?.email || "" },
  { header: "المصدر", value: (d) => (SOURCE_LABELS[d.source_kind] || SOURCE_LABELS.MANUAL)[0] },
  { header: "البنود", key: "line_count" },
  { header: "الإجمالي", value: (d) => Number(d.total_with_vat || 0) },
  { header: "العملة", key: "currency" },
  { header: "تاريخ الإنشاء", key: "created_at" },
  { header: "الانتظار", value: (d) => waitedFor(d.waiting_hours) },
  { header: "متأخرة", value: (d) => !!d.is_stale },
  { header: "معدّلة", value: (d) => !!d.was_edited },
];

/** "منذ 14 ساعة" / "منذ 3 أيام" */
const waitedFor = (hours) => {
  if (hours < 1) return "منذ أقل من ساعة";
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
};

/**
 * The review queue: every draft awaiting approval, oldest first.
 *
 * Drafts arrive here automatically — an order being paid or a registration
 * being approved builds a complete invoice. The common case is that nothing
 * needs changing, which is what the bulk approve is for; opening one is the
 * exception, not the workflow.
 */
const InvoiceDrafts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [approving, setApproving] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const navigate = useNavigate();
  const range = useDateRange();

  // A selection made under another range could hold drafts no longer on screen,
  // and bulk approve would issue them unseen.
  useEffect(() => {
    setSelected([]);
  }, [range.from, range.to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await taxFetch("/tax/drafts/pending");
      setData(res);
      setSelected([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Newest first. The API returns the queue oldest-first and caps it, so it is
  // reversed here rather than there - reversing the query would drop the
  // oldest (most overdue) drafts once the queue outgrows the cap.
  const drafts = useMemo(() => (data ? [...data.drafts].reverse() : []), [data]);
  const shown = range.filter(drafts, (d) => d.created_at);
  const allSelected = shown.length > 0 && selected.length === shown.length;

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allSelected ? [] : shown.map((d) => d.id));

  const selectedTotal = useMemo(
    () =>
      drafts
        .filter((d) => selected.includes(d.id))
        .reduce((sum, d) => sum + Number(d.total_with_vat || 0), 0),
    [drafts, selected]
  );

  const bulkApprove = async () => {
    setApproving(true);
    try {
      const res = await taxFetch("/tax/drafts/bulk-issue", {
        method: "POST",
        body: JSON.stringify({ ids: selected }),
      });
      if (res.failed && res.failed.length > 0) {
        toast.warn(res.message);
        res.failed.forEach((f) => toast.error(`#${f.id}: ${f.message}`));
      } else {
        toast.success(res.message);
      }
      setConfirmBulk(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setApproving(false);
    }
  };

  const remove = async (draft) => {
    if (!window.confirm(`حذف مسودة "${draft.buyer.name || "غير محدد"}" نهائياً؟`)) return;
    try {
      await taxFetch(`/tax/drafts/${draft.id}`, { method: "DELETE" });
      toast.success("تم حذف المسودة");
      await load();
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

  return (
    <div dir="rtl">
      <ToastContainer rtl position="top-center" />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              الفواتير بانتظار المراجعة
              {drafts.length > 0 ? (
                <span className="mr-2 px-2.5 py-1 rounded-full text-sm bg-primary text-white align-middle">
                  {drafts.length}
                </span>
              ) : null}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              تُنشأ المسودات تلقائياً عند سداد طلب أو اعتماد تسجيل، ومكتملة البيانات. السياسة
              الحالية: <strong>{POLICY_LABELS[data.policy] || data.policy}</strong>
              {data.policy === "AUTO_ISSUE_WITH_TIMEOUT"
                ? ` (${data.auto_issue_hours} ساعة)`
                : ""}
              .
            </p>
          </div>
          <button
            onClick={() => navigate("/tax/drafts/new")}
            className="flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm"
          >
            <Plus size={16} />
            فاتورة يدوية (بيع خارج المنصة)
          </button>
        </div>

        <DateRangeBar
          range={range}
          count={shown.length}
          onExport={() => exportExcel("مسودات الفواتير", EXPORT_COLUMNS, shown, { rangeLabel: range.label })}
        />

        {/* stale-draft warning — a draft sitting too long is a ZATCA reporting risk */}
        {data.overdue_draft_count > 0 ? (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6 flex items-start">
            <AlertTriangle className="text-red-600 ml-3 shrink-0" size={20} />
            <div className="text-sm text-red-800">
              <p className="font-semibold">
                {data.overdue_draft_count} مسودة تجاوزت مهلة المراجعة ({data.alert_hours} ساعة)
              </p>
              <p className="mt-1">
                أقدمها منذ {data.oldest_draft_hours} ساعة. تشترط هيئة الزكاة والضريبة والجمارك
                الإبلاغ عن الفواتير المبسطة خلال 24 ساعة من إصدارها، فلا ينبغي تراكم المسودات.
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : null}

        {/* bulk bar */}
        {selected.length > 0 ? (
          <div className="sticky top-2 z-10 bg-primary text-white rounded-md px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">
              محدد: <strong>{selected.length}</strong> فاتورة — إجمالي{" "}
              <strong>{money(selectedTotal)}</strong>
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected([])}
                className="text-sm underline opacity-90 hover:opacity-100"
              >
                إلغاء التحديد
              </button>
              <button
                onClick={() => setConfirmBulk(true)}
                className="flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-primary text-sm font-semibold hover:bg-gray-100"
              >
                <CheckCheck size={16} />
                اعتماد وإصدار المحدد
              </button>
            </div>
          </div>
        ) : null}

        {shown.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto text-gray-300" size={48} />
            <p className="text-gray-500 mt-4">
              {drafts.length === 0 ? "لا توجد فواتير بانتظار المراجعة" : "مفيش مسودات في الفترة دي"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              ستظهر هنا تلقائياً عند سداد طلب أو اعتماد تسجيل.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="تحديد الكل"
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">العميل</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">المصدر</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">البنود</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الإجمالي</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الانتظار</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => {
                  const [srcLabel, srcTone] = SOURCE_LABELS[d.source_kind] || SOURCE_LABELS.MANUAL;
                  return (
                    <tr
                      key={d.id}
                      className={`border-b transition-colors ${
                        d.is_stale ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-3 py-4 block md:table-cell">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selected.includes(d.id)}
                          onChange={() => toggle(d.id)}
                          aria-label={`تحديد فاتورة ${d.buyer.name || d.id}`}
                        />
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700 block md:table-cell">
                        <span className="font-semibold md:hidden">العميل: </span>
                        {d.buyer.name || "غير محدد"}
                        <p className="text-xs text-gray-500" dir="ltr">
                          {d.buyer.email || ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right text-sm block md:table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${srcTone}`}>
                          {srcLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700 block md:table-cell">
                        <span className="font-semibold md:hidden">البنود: </span>
                        {d.line_count}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-gray-800 block md:table-cell">
                        <span className="font-semibold md:hidden">الإجمالي: </span>
                        {money(d.total_with_vat)} {d.currency}
                      </td>
                      <td className="px-4 py-4 text-right text-sm block md:table-cell">
                        <span className="font-semibold md:hidden">الانتظار: </span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            d.is_stale ? "text-red-700 font-semibold" : "text-gray-600"
                          }`}
                        >
                          <Clock size={13} />
                          {waitedFor(d.waiting_hours)}
                        </span>
                        <p className="text-xs text-gray-400">{formatDateTime(d.created_at)}</p>
                        {d.was_edited ? (
                          <p className="text-xs text-amber-700">عُدّلت — بانتظار اعتماد يدوي</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-right block md:table-cell">
                        <div className="flex items-center gap-3 justify-end md:justify-start">
                          <button
                            onClick={() => navigate(`/tax/drafts/${d.id}`)}
                            className="flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            <Pencil size={15} />
                            مراجعة
                          </button>
                          <button
                            onClick={() => remove(d)}
                            className="flex items-center gap-1 text-red-600 hover:underline text-sm"
                          >
                            <Trash2 size={15} />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* bulk approve is irreversible too — same confirmation discipline */}
      {confirmBulk && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" dir="rtl">
            <h3 className="text-lg font-semibold text-primary mb-2">اعتماد وإصدار جماعي</h3>
            <p className="text-sm text-gray-600 mb-4">
              سيتم إصدار <strong>{selected.length}</strong> فاتورة، ومنح كل منها رقماً تسلسلياً
              ومعرّفاً فريداً ورمز QR. بعد الإصدار <strong>لا يمكن التعديل أو الحذف</strong> — أي
              تصحيح يتطلب إشعاراً دائناً أو مديناً.
            </p>
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm flex justify-between">
              <span className="text-gray-600">إجمالي المبالغ</span>
              <strong className="text-primary">{money(selectedTotal)}</strong>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmBulk(false)}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={bulkApprove}
                disabled={approving}
                className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {approving ? "جاري الإصدار..." : `اعتماد ${selected.length} فاتورة`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDrafts;
