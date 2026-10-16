import React, { useEffect, useState } from "react";
import { Download, Info } from "lucide-react";
import { taxFetch, money, datePresets, downloadCsv } from "./taxApi";

/**
 * The rows map 1:1 onto the ZATCA VAT return form so the numbers can be typed
 * straight into the portal.
 */
const Row = ({ label, note, amount, vat, currency, strong }) => (
  <tr className={`border-b ${strong ? "font-bold text-primary" : ""}`}>
    <td className="px-4 py-3 text-right text-sm">
      {label}
      {note ? <div className="text-xs text-gray-500 font-normal">{note}</div> : null}
    </td>
    <td className="px-4 py-3 text-right text-sm">
      {amount === null ? "-" : `${money(amount)} ${currency}`}
    </td>
    <td className="px-4 py-3 text-right text-sm">
      {vat === null ? "-" : `${money(vat)} ${currency}`}
    </td>
  </tr>
);

const VatReturn = () => {
  const presets = datePresets();
  const [from, setFrom] = useState(presets.thisQuarter.from);
  const [to, setTo] = useState(presets.thisQuarter.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        setData(await taxFetch(`/tax/vat-return?from=${from}&to=${to}`));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [from, to]);

  const applyPreset = (p) => {
    setFrom(p.from);
    setTo(p.to);
  };

  const exportCsv = () => {
    const c = data.currency;
    downloadCsv(`vat-return-${from}_${to}.csv`, [
      ["الإقرار الضريبي", `${from} إلى ${to}`],
      ["العملة", c],
      ["الرقم الضريبي", data.seller.vat_number || ""],
      [],
      ["البند", "المبلغ (بدون ضريبة)", "الضريبة"],
      ["المبيعات الخاضعة للنسبة الأساسية", data.standard_rated_sales, data.standard_rated_vat],
      ["المبيعات الخاضعة لنسبة صفرية", data.zero_rated_sales, 0],
      ["المبيعات المعفاة", data.exempt_sales, 0],
      ["إجمالي المبيعات", data.total_sales_excluding_vat, data.total_vat_due],
      [],
      ["إجمالي الضريبة المستحقة", data.total_vat_due],
      ["عدد الفواتير", data.invoice_count],
      ["عدد الإشعارات الدائنة", data.credit_note_count],
    ]);
  };

  const presetBtn = "px-3 py-2 rounded-md text-sm bg-gray-200 text-gray-700 hover:bg-gray-300";

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <h2 className="text-2xl font-bold mb-2 text-primary">الإقرار الضريبي</h2>

      {/* The single most misread thing about a VAT return: it is not a
          statement of money collected. Say so before the numbers. */}
      <div className="bg-blue-50 border-r-4 border-blue-500 p-4 mb-6 flex items-start">
        <Info className="text-blue-600 ml-3 shrink-0" size={20} />
        <div className="text-sm text-blue-800">
          {data && data.basis === "CASH" ? (
            <>
              <p className="font-semibold">الأساس النقدي — على الدفعات المحصّلة</p>
              <p className="mt-1">
                يشمل هذا الإقرار الدفعات المستلمة فعلياً خلال الفترة فقط، منسوبة بالتناسب إلى
                الفاتورة التي تسددها. الفواتير غير المسددة لا تدخل حتى يتم تحصيلها.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">الأساس المستحق — على الفواتير الصادرة</p>
              <p className="mt-1">
                يُبنى هذا الإقرار على <strong>الفواتير الصادرة خلال الفترة</strong> بغض النظر عن حالة
                السداد. <strong>الفواتير غير المسددة مُدرجة بالكامل</strong>: تُستحق ضريبة القيمة
                المضافة عند إصدار الفاتورة، لا عند تحصيلها، لذا قد يلزم سداد الضريبة للهيئة قبل أن
                يدفع العميل.
              </p>
              <p className="mt-1">المسودات غير مُدرجة — فهي ليست مستندات قانونية.</p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={presetBtn} onClick={() => applyPreset(presets.thisMonth)}>
          هذا الشهر
        </button>
        <button className={presetBtn} onClick={() => applyPreset(presets.lastMonth)}>
          الشهر الماضي
        </button>
        <button className={presetBtn} onClick={() => applyPreset(presets.thisQuarter)}>
          هذا الربع
        </button>
        <button className={presetBtn} onClick={() => applyPreset(presets.lastQuarter)}>
          الربع الماضي
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">من تاريخ</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={exportCsv}
            disabled={!data}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Download size={16} />
            تصدير CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : data ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">البند</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">
                    المبلغ (بدون ضريبة)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-primary">
                    ضريبة القيمة المضافة
                  </th>
                </tr>
              </thead>
              <tbody>
                <Row
                  label="المبيعات الخاضعة للنسبة الأساسية"
                  note={`Standard rated sales — ${data.vat_rate}%`}
                  amount={data.standard_rated_sales}
                  vat={data.standard_rated_vat}
                  currency={data.currency}
                />
                <Row
                  label="المبيعات الخاضعة لنسبة صفرية"
                  note="Zero rated sales"
                  amount={data.zero_rated_sales}
                  vat={0}
                  currency={data.currency}
                />
                <Row
                  label="المبيعات المعفاة"
                  note="Exempt sales"
                  amount={data.exempt_sales}
                  vat={null}
                  currency={data.currency}
                />
                <Row
                  label="إجمالي المبيعات"
                  note="Total sales"
                  amount={data.total_sales_excluding_vat}
                  vat={data.total_vat_due}
                  currency={data.currency}
                  strong
                />
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary text-white rounded-lg p-6">
              <p className="text-sm opacity-90">إجمالي الضريبة المستحقة للهيئة</p>
              <p className="text-3xl font-bold mt-2">
                {money(data.total_vat_due)} {data.currency}
              </p>
            </div>
            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600">عدد الفواتير</p>
              <p className="text-3xl font-bold mt-2 text-primary">{data.invoice_count}</p>
            </div>
            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600">عدد الإشعارات الدائنة</p>
              <p className="text-3xl font-bold mt-2 text-primary">{data.credit_note_count}</p>
              <p className="text-xs text-gray-500 mt-1">مخصومة من الإجمالي أعلاه</p>
            </div>
          </div>

          {/* How much of the liability above has not been collected. */}
          {data.basis !== "CASH" && data.unpaid ? (
            <div
              className={`mt-6 rounded-lg border-r-4 p-5 ${
                data.unpaid.unpaid_vat > 0
                  ? "bg-amber-50 border-amber-500"
                  : "bg-green-50 border-green-500"
              }`}
            >
              {data.unpaid.unpaid_vat > 0 ? (
                <>
                  <p className="text-sm font-semibold text-amber-900">
                    منها على فواتير غير مسددة: {money(data.unpaid.unpaid_vat)} {data.currency}
                  </p>
                  <p className="text-sm text-amber-800 mt-1">
                    هذا الجزء من الضريبة مستحق على {data.unpaid.unpaid_invoice_count} فاتورة لم
                    يسددها العملاء بعد (رصيد {money(data.unpaid.unpaid_total)} {data.currency}).
                    ستدفعه للهيئة في موعد الإقرار سواء حصّلته أم لا — احسب أثره على السيولة.
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-green-900">
                  جميع فواتير هذه الفترة مسددة — لا توجد ضريبة مستحقة على مبالغ لم تُحصّل.
                </p>
              )}
            </div>
          ) : null}

          <p className="text-xs text-gray-500 mt-6">
            الرقم الضريبي: {data.seller.vat_number || "غير محدد"} — الفترة من {from} إلى {to}. تشمل
            المبالغ أعلاه الإشعارات الدائنة بقيم سالبة. الأساس المحاسبي:{" "}
            {data.basis === "CASH" ? "نقدي (على المحصّل)" : "مستحق (على الفواتير الصادرة)"}.
          </p>
        </>
      ) : null}
    </div>
  );
};

export default VatReturn;
