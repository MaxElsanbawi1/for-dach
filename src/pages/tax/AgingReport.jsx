import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, BellRing, AlertTriangle, Clock, Wallet } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { taxFetch, money, formatDate, downloadCsv, todayInput } from "./taxApi";

// Same keys and order as taxController.AGING_BUCKETS.
const BUCKET_TONES = {
  current: "bg-green-50 border-green-500 text-green-800",
  d1_30: "bg-yellow-50 border-yellow-500 text-yellow-800",
  d31_60: "bg-orange-50 border-orange-500 text-orange-800",
  d61_90: "bg-red-50 border-red-500 text-red-800",
  d90_plus: "bg-red-100 border-red-700 text-red-900",
};

/** One clickable aging bucket. Shared by the not-yet-due and overdue groups. */
const BucketButton = ({ bucket: b, active, currency, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full h-full text-right border-r-4 rounded-lg p-4 transition-all ${
      BUCKET_TONES[b.key]
    } ${active ? "ring-2 ring-primary" : "hover:opacity-90"}`}
  >
    <p className="text-xs font-semibold">{b.label}</p>
    <p className="text-xl font-bold mt-2">{money(b.amount)}</p>
    <p className="text-xs mt-1">
      {b.invoice_count} فاتورة — {currency}
    </p>
  </button>
);

const Card = ({ icon: Icon, title, value, hint, tone = "bg-primary" }) => (
  <div className="bg-white rounded-lg shadow p-6 flex items-center">
    <div className={`${tone} p-3 rounded-full text-white`}>
      <Icon size={24} />
    </div>
    <div className="mr-4">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      <p className="text-2xl font-bold">{value}</p>
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  </div>
);

/**
 * Aging report: everything still owed, bucketed by how far past due it is.
 * Clicking a bucket filters the list below it; "إرسال تذكير" chases one invoice.
 */
const AgingReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [asOf, setAsOf] = useState(todayInput());
  const [bucket, setBucket] = useState("all");
  const [sending, setSending] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ as_of: asOf, bucket });
      setData(await taxFetch(`/tax/aging?${params.toString()}`));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [asOf, bucket]);

  useEffect(() => {
    load();
  }, [load]);

  const remind = async (invoice) => {
    setSending(invoice.id);
    try {
      const res = await taxFetch(`/tax/invoices/${invoice.id}/reminder`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(res.message);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["رقم الفاتورة", "التاريخ", "الاستحقاق", "العميل", "البريد", "الإجمالي", "المسدد", "المتبقي", "أيام التأخير", "الفئة"],
      ...(data.invoices || []).map((i) => [
        i.invoice_number,
        formatDate(i.issued_at),
        i.due_date || "",
        i.buyer.name || "",
        i.buyer.email || "",
        i.payable_total,
        i.amount_paid,
        i.balance_due,
        i.days_overdue,
        i.aging_bucket,
      ]),
    ];
    downloadCsv(`aging-${asOf}.csv`, rows);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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

  const currency = data.currency || "SAR";

  return (
    <div dir="rtl">
      <ToastContainer rtl position="top-center" />
      <h2 className="text-2xl font-bold mb-2 text-primary">تقرير أعمار الديون</h2>
      <p className="text-sm text-gray-600 mb-6">
        الفواتير الصادرة غير المسددة، مصنّفة حسب عدد أيام التأخير عن تاريخ الاستحقاق. المهلة
        الافتراضية {data.due_days} يوماً من تاريخ الإصدار.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card
          icon={Wallet}
          title="مستحق غير مسدد"
          value={`${money(data.summary.not_yet_due_total)} ${currency}`}
          hint={`${data.summary.not_yet_due_count} فاتورة — لم يحن موعد سدادها بعد`}
          tone="bg-primary"
        />
        <Card
          icon={AlertTriangle}
          title="متأخر عن السداد"
          value={`${money(data.summary.overdue_total)} ${currency}`}
          hint={`${data.summary.overdue_count} فاتورة تجاوزت تاريخ الاستحقاق`}
          tone="bg-red-600"
        />
        <Card
          icon={Clock}
          title="عمر أقدم فاتورة غير مسددة"
          value={`${data.summary.oldest_unpaid_age_days} يوماً`}
          hint="منذ تاريخ الإصدار"
          tone="bg-secondary"
        />
      </div>

      <p className="text-sm text-gray-600 mb-6">
        إجمالي المستحق على العملاء{" "}
        <strong>
          {money(data.summary.outstanding_total)} {currency}
        </strong>{" "}
        = {money(data.summary.not_yet_due_total)} لم يحن موعده +{" "}
        {money(data.summary.overdue_total)} متأخر. المتأخر وحده هو ما يحتاج متابعة تحصيل.
      </p>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">حتى تاريخ</label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <button
              onClick={exportCsv}
              disabled={!data.invoices || data.invoices.length === 0}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <Download size={16} />
              تصدير CSV
            </button>
          </div>
        </div>

        {/* The not-yet-due bucket is money owed on time. Grouping it with the
            overdue buckets makes a healthy book look like a collection crisis,
            so it gets its own labelled column, separated by a divider. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,4fr)] gap-4 items-stretch">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">غير مستحق بعد</p>
            {data.buckets
              .filter((b) => b.key === "current")
              .map((b) => (
                <BucketButton
                  key={b.key}
                  bucket={b}
                  active={bucket === b.key}
                  currency={currency}
                  onClick={() => setBucket(bucket === b.key ? "all" : b.key)}
                />
              ))}
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <div className="h-full w-px bg-gray-300" />
          </div>

          <div>
            <p className="text-xs font-semibold text-red-700 mb-2">
              متأخر عن السداد — يحتاج متابعة
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {data.buckets
                .filter((b) => b.key !== "current")
                .map((b) => (
                  <BucketButton
                    key={b.key}
                    bucket={b}
                    active={bucket === b.key}
                    currency={currency}
                    onClick={() => setBucket(bucket === b.key ? "all" : b.key)}
                  />
                ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            الإجمالي: <strong>{money(data.totals.amount)} {currency}</strong> عبر{" "}
            {data.totals.invoice_count} فاتورة
          </span>
          {bucket !== "all" ? (
            <button onClick={() => setBucket("all")} className="text-primary underline">
              عرض كل الفئات
            </button>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          الفواتير غير المسددة
          {bucket !== "all"
            ? ` — ${(data.buckets.find((b) => b.key === bucket) || {}).label || ""}`
            : ""}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الاستحقاق</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">التأخير</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">الإجمالي</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">المسدد</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">المتبقي</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-primary">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {(data.invoices || []).length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                    لا توجد فواتير غير مسددة في هذه الفئة
                  </td>
                </tr>
              ) : (
                data.invoices.map((i) => (
                  <tr
                    key={i.id}
                    className={`border-b hover:bg-gray-50 ${
                      i.aging_bucket === "d90_plus" ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-right text-sm block md:table-cell">
                      <button
                        onClick={() => navigate(`/tax/invoices/${i.id}`)}
                        className="text-primary hover:underline"
                      >
                        {i.invoice_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">العميل: </span>
                      {i.buyer.name || "غير محدد"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">الاستحقاق: </span>
                      {i.due_date || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm block md:table-cell">
                      <span className="font-semibold md:hidden">التأخير: </span>
                      {i.aging_bucket === "current" ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          في الموعد
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          {i.days_overdue} يوماً
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">الإجمالي: </span>
                      {money(i.payable_total)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">المسدد: </span>
                      {money(i.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 block md:table-cell">
                      <span className="font-semibold md:hidden">المتبقي: </span>
                      {money(i.balance_due)} {i.currency}
                    </td>
                    <td className="px-4 py-3 text-right text-sm block md:table-cell">
                      <button
                        onClick={() => remind(i)}
                        disabled={sending === i.id || !i.buyer.email}
                        title={i.buyer.email ? "" : "لا يوجد بريد إلكتروني للعميل"}
                        className="flex items-center gap-1 text-secondary hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        <BellRing size={14} />
                        {sending === i.id ? "جاري الإرسال..." : "تذكير"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgingReport;
