import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  Percent,
  Landmark,
  FileText,
  AlertTriangle,
  Wallet,
  Clock,
  FilePlus,
  HelpCircle,
  HandCoins,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { taxFetch, money } from "./taxApi";

/**
 * A card with an optional hover definition.
 *
 * Definitions live next to the number rather than in documentation, because
 * every one of these cards is a number someone could act on incorrectly.
 *
 * The tooltip is anchored to the CARD, not to the "?" glyph, and spans the
 * card's own inline box (`inset-x-3`). Anchoring it to the glyph with a fixed
 * `w-64` let it hang outside the card — and therefore outside the page — which
 * is what produced the horizontal scrollbar. Bounded by the card, it cannot
 * exceed the grid at any viewport width.
 */
const Card = ({ icon: Icon, title, value, hint, period, info, tone = "bg-primary" }) => (
  <div className="relative group bg-white rounded-lg shadow p-6 flex items-start min-w-0">
    <div className={`${tone} p-3 rounded-full text-white shrink-0`}>
      <Icon size={24} />
    </div>
    <div className="mr-4 min-w-0">
      <h2 className="text-base font-semibold text-primary leading-snug">
        {title}
        {info ? (
          <HelpCircle
            size={14}
            className="inline-block align-middle mr-1 text-gray-400 cursor-help shrink-0"
            aria-hidden="true"
          />
        ) : null}
      </h2>
      <p className="text-2xl font-bold mt-1 break-words">{value}</p>
      {/* The exact range, on every card that covers one — "الشهر" and "الربع"
          coincide in the first month of a quarter and are otherwise different
          periods entirely. */}
      {period ? (
        <p className="text-xs text-gray-500 mt-1 tabular-nums" dir="ltr">
          {period}
        </p>
      ) : null}
      {hint ? <p className="text-xs text-gray-500 mt-1 break-words">{hint}</p> : null}
    </div>

    {info ? (
      <span
        role="tooltip"
        className="pointer-events-none absolute z-30 inset-x-3 top-full -mt-1 rounded-md bg-gray-900 p-2.5 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        {info}
      </span>
    ) : null}
  </div>
);

/** Heading above a group of cards, naming what period they all cover. */
const GroupHeading = ({ title, subtitle }) => (
  <div className="mb-3 mt-2">
    <h3 className="text-lg font-bold text-primary">{title}</h3>
    {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
  </div>
);

const TaxOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setData(await taxFetch("/tax/overview"));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const currency = data.currency || "SAR";
  const collection = data.collection || {
    overdue_total: 0,
    overdue_count: 0,
    outstanding_total: 0,
    outstanding_count: 0,
    oldest_unpaid_age_days: 0,
  };
  const review = data.review || { overdue_draft_count: 0, alert_hours: 12, oldest_draft_hours: 0 };
  const isCash = data.basis === "CASH";
  const zeroUnpaid = { unpaid_vat: 0, unpaid_total: 0, unpaid_invoice_count: 0 };
  const monthUnpaid = data.month.unpaid || zeroUnpaid;
  const quarterUnpaid = data.quarter.unpaid || zeroUnpaid;

  return (
    <div dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-primary">نظرة عامة على الضرائب</h2>

      {/* A draft that has waited too long is a ZATCA reporting risk, so this
          warning shows under every policy, not just the timed one. */}
      {review.overdue_draft_count > 0 && (
        <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6 flex items-start">
          <AlertTriangle className="text-red-600 ml-3 shrink-0" size={20} />
          <div>
            <p className="text-sm text-red-800 font-semibold">
              {review.overdue_draft_count} فاتورة بانتظار المراجعة منذ أكثر من {review.alert_hours}{" "}
              ساعة
            </p>
            <p className="text-sm text-red-700">
              أقدمها منذ {review.oldest_draft_hours} ساعة.{" "}
              <button onClick={() => navigate("/tax/drafts")} className="underline font-semibold">
                مراجعتها الآن
              </button>
            </p>
          </div>
        </div>
      )}

      {!data.seller_configured && (
        <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 mb-6 flex items-start">
          <AlertTriangle className="text-yellow-600 ml-3 shrink-0" size={20} />
          <div>
            <p className="text-sm text-yellow-800 font-semibold">
              بيانات المنشأة الضريبية غير مكتملة
            </p>
            <p className="text-sm text-yellow-700">
              يجب إدخال اسم المنشأة والرقم الضريبي قبل إصدار فواتير ضريبية معتمدة.{" "}
              <button
                onClick={() => navigate("/tax/settings")}
                className="underline font-semibold"
              >
                إدخال البيانات الآن
              </button>
            </p>
          </div>
        </div>
      )}

      {/* The accrual principle, stated once, up front. */}
      <div className="bg-blue-50 border-r-4 border-blue-500 p-4 mb-6 flex items-start">
        <Info className="text-blue-600 ml-3 shrink-0" size={20} />
        <p className="text-sm text-blue-800">
          {isCash ? (
            <>
              <strong>الأساس النقدي:</strong> تُحتسب الضريبة على الدفعات المحصّلة خلال الفترة. لا
              تدخل الفواتير غير المسددة في الإقرار حتى يتم تحصيلها.
            </>
          ) : (
            <>
              <strong>الأساس المستحق (الافتراضي):</strong> تُستحق ضريبة القيمة المضافة عند{" "}
              <strong>إصدار الفاتورة</strong> وليس عند تحصيلها. الأرقام أدناه تشمل الفواتير غير
              المسددة.
            </>
          )}
        </p>
      </div>

      {/* ================= الشهر الحالي ================= */}
      <GroupHeading
        title="الشهر الحالي"
        subtitle={`من ${data.month.from} إلى ${data.month.to} — للمتابعة الشهرية فقط، وليست فترة الإقرار`}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card
          icon={Receipt}
          title="مبيعات الشهر (بدون ضريبة)"
          value={`${money(data.month.total_sales_excluding_vat)} ${currency}`}
          period={`${data.month.from} → ${data.month.to}`}
          info="إجمالي قيمة المبيعات في هذا الشهر قبل إضافة ضريبة القيمة المضافة."
        />
        <Card
          icon={Percent}
          // Was "المحصّلة" (collected) — factually wrong. VAT is charged on the
          // sale; whether the customer has paid is a separate question.
          title="ضريبة الشهر (على المبيعات)"
          value={`${money(data.month.total_vat_due)} ${currency}`}
          period={`${data.month.from} → ${data.month.to}`}
          hint={
            isCash
              ? `النسبة ${data.vat_rate}% — محسوبة على الدفعات المحصّلة`
              : `النسبة ${data.vat_rate}% — تُستحق عند إصدار الفاتورة وليس عند التحصيل`
          }
          info="VAT on this month's sales. تُستحق على الهيئة بمجرد إصدار الفاتورة، بغض النظر عن سداد العميل."
          tone="bg-secondary"
        />
        <Card
          icon={HandCoins}
          title="منها على فواتير غير مسددة"
          value={`${money(monthUnpaid.unpaid_vat)} ${currency}`}
          period={`${data.month.from} → ${data.month.to}`}
          hint={
            isCash
              ? "لا ينطبق على الأساس النقدي"
              : `على ${monthUnpaid.unpaid_invoice_count} فاتورة بقيمة ${money(
                  monthUnpaid.unpaid_total
                )} ${currency}`
          }
          info="الجزء من ضريبة هذا الشهر المستحق على فواتير لم يسددها العملاء بعد — ضريبة ستدفعها للهيئة قبل أن تحصّل قيمتها. محسوبة بالتناسب: فاتورة مسددة نصفها تساهم بنصف ضريبتها."
          tone="bg-amber-600"
        />
      </div>

      {/* ================= فترة الإقرار ================= */}
      <GroupHeading
        title="فترة الإقرار (الربع)"
        subtitle={`من ${data.quarter.from} إلى ${data.quarter.to} — هذه هي الفترة التي تُقدَّم عنها الإقرار لهيئة الزكاة والضريبة والجمارك`}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card
          icon={Landmark}
          title="الضريبة المستحقة للهيئة"
          value={`${money(data.quarter.total_vat_due)} ${currency}`}
          period={`${data.quarter.from} → ${data.quarter.to}`}
          info="صافي ضريبة فترة الإقرار بعد خصم الإشعارات الدائنة وإضافة المدينة. هذا هو المبلغ الذي يُدخل في إقرار زاتكا."
        />
        <Card
          icon={HandCoins}
          title="منها على فواتير غير مسددة"
          value={`${money(quarterUnpaid.unpaid_vat)} ${currency}`}
          period={`${data.quarter.from} → ${data.quarter.to}`}
          hint={
            isCash
              ? "لا ينطبق على الأساس النقدي"
              : `على ${quarterUnpaid.unpaid_invoice_count} فاتورة بقيمة ${money(
                  quarterUnpaid.unpaid_total
                )} ${currency}`
          }
          info="الجزء من ضريبة فترة الإقرار الذي لم تُحصَّل قيمته بعد. تحتاج إلى سداده للهيئة في موعده حتى لو لم يدفع العميل."
          tone="bg-amber-600"
        />
        <Card
          icon={FileText}
          title="عدد الفواتير في فترة الإقرار"
          value={data.quarter.invoice_count}
          period={`${data.quarter.from} → ${data.quarter.to}`}
          hint={
            data.quarter.credit_note_count
              ? `و ${data.quarter.credit_note_count} إشعار دائن`
              : "لا توجد إشعارات دائنة"
          }
          tone="bg-secondary"
        />
      </div>

      {/* ================= التحصيل ================= */}
      <GroupHeading
        title="التحصيل"
        subtitle="حالة المبالغ المستحقة على العملاء — مستقلة تماماً عن الالتزام الضريبي أعلاه"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          icon={Wallet}
          title="مستحق غير مسدد"
          value={`${money(collection.not_yet_due_total)} ${currency}`}
          hint={`${collection.not_yet_due_count} فاتورة — لم يحن موعد سدادها`}
          info="مبالغ على العملاء لم يحن تاريخ استحقاقها بعد. هذه ذمم طبيعية وليست مشكلة تحصيل."
          tone="bg-primary"
        />
        <Card
          icon={AlertTriangle}
          title="متأخر عن السداد"
          value={`${money(collection.overdue_total)} ${currency}`}
          hint={`${collection.overdue_count} فاتورة تجاوزت تاريخ الاستحقاق`}
          info="مبالغ تجاوزت تاريخ الاستحقاق المحدد على الفاتورة. هذه هي أرقام التحصيل التي تحتاج متابعة."
          tone="bg-red-600"
        />
        <Card
          icon={Clock}
          title="عمر أقدم فاتورة غير مسددة"
          value={`${collection.oldest_unpaid_age_days} يوماً`}
          hint={`مهلة السداد الافتراضية ${data.due_days} يوماً`}
          info="عدد الأيام منذ إصدار أقدم فاتورة ما زال عليها رصيد."
          tone="bg-secondary"
        />
        <Card
          icon={FilePlus}
          title="مسودات بانتظار الإصدار"
          value={data.draft_count || 0}
          hint="غير مُدرجة في الإقرار الضريبي"
          info="المسودات ليست مستندات قانونية ولا تدخل في الإقرار الضريبي ولا في أي تقرير مالي."
          tone="bg-gray-500"
        />
      </div>
      <p className="text-xs text-gray-500 -mt-4 mb-8">
        إجمالي المستحق على العملاء: {money(collection.outstanding_total)} {currency} ={" "}
        {money(collection.not_yet_due_total)} غير مستحق بعد + {money(collection.overdue_total)}{" "}
        متأخر.
      </p>

      {/* min-w-0 so recharts' ResponsiveContainer measures the shrunk width
          rather than holding the card open at its last-measured size, which is
          a known cause of overflow when the viewport narrows. */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 min-w-0 overflow-hidden">
        <h3 className="text-lg font-semibold text-primary mb-4">
          المبيعات والضريبة خلال آخر 12 شهراً
        </h3>
        {data.by_month && data.by_month.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.by_month} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `${money(v)} ${currency}`} />
              <Legend />
              <Bar dataKey="sales" name="المبيعات بدون ضريبة" fill="#074d84" />
              {/* "على المبيعات", not "المحصّلة" — the chart plots VAT charged
                  on invoices issued that month, not cash received. */}
              <Bar dataKey="vat" name="الضريبة على المبيعات" fill="#D8A84A" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 bg-gray-50 rounded flex items-center justify-center text-gray-500">
            لا توجد بيانات بعد
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => navigate("/tax/invoices")}
          className="bg-white rounded-lg shadow p-6 text-right hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-primary">الفواتير الضريبية</h3>
          <p className="text-sm text-gray-600 mt-1">عرض وتصفية الفواتير والإشعارات الدائنة والمدينة</p>
        </button>
        <button
          onClick={() => navigate("/tax/drafts")}
          className="bg-white rounded-lg shadow p-6 text-right hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-primary">المسودات</h3>
          <p className="text-sm text-gray-600 mt-1">تحضير فاتورة وتعديلها قبل إصدارها نهائياً</p>
        </button>
        <button
          onClick={() => navigate("/tax/aging")}
          className="bg-white rounded-lg shadow p-6 text-right hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-primary">أعمار الديون</h3>
          <p className="text-sm text-gray-600 mt-1">المتأخرات حسب فترة التأخير ومتابعة التحصيل</p>
        </button>
        <button
          onClick={() => navigate("/tax/vat-return")}
          className="bg-white rounded-lg shadow p-6 text-right hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-primary">الإقرار الضريبي</h3>
          <p className="text-sm text-gray-600 mt-1">ملخص جاهز لتعبئة الإقرار في بوابة زاتكا</p>
        </button>
      </div>
    </div>
  );
};

export default TaxOverview;
