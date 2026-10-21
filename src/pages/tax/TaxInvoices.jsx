import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, AlertTriangle, FilePlus } from "lucide-react";
import { taxFetch, money, formatDate, datePresets } from "./taxApi";
import { exportExcel, fetchAllPages } from "../../components/DateExport";

const typeLabels = {
  SIMPLIFIED_TAX_INVOICE: "مبسطة",
  STANDARD_TAX_INVOICE: "ضريبية",
};

const docLabels = {
  INVOICE: "فاتورة",
  CREDIT_NOTE: "إشعار دائن",
  DEBIT_NOTE: "إشعار مدين",
};

const statusLabels = {
  draft: ["مسودة", "bg-gray-200 text-gray-700"],
  issued: ["صادرة", "bg-green-100 text-green-800"],
  amended: ["معدّلة", "bg-orange-100 text-orange-800"],
  cancelled: ["ملغاة", "bg-red-100 text-red-800"],
};

const paymentLabels = {
  paid: ["مسددة", "bg-green-100 text-green-800"],
  partial: ["جزئية", "bg-yellow-100 text-yellow-800"],
  unpaid: ["غير مسددة", "bg-gray-100 text-gray-600"],
};

const EXPORT_COLUMNS = [
  { header: "رقم الفاتورة", key: "invoice_number" },
  { header: "التاريخ", value: (i) => formatDate(i.issued_at) },
  { header: "النوع", value: (i) => typeLabels[i.invoice_type] || i.invoice_type },
  { header: "المستند", value: (i) => docLabels[i.document_type] || i.document_type },
  { header: "العميل", value: (i) => i.buyer?.name || "", width: 30 },
  { header: "إيميل العميل", value: (i) => i.buyer?.email || "" },
  { header: "جوال العميل", value: (i) => i.buyer?.phone || "" },
  { header: "الرقم الضريبي للعميل", value: (i) => i.buyer?.vat_number || "" },
  { header: "المبلغ بدون ضريبة", key: "price_excluding_vat" },
  { header: "الضريبة", key: "vat_amount" },
  { header: "الإجمالي", key: "total_with_vat" },
  { header: "العملة", key: "currency" },
  { header: "الحالة", value: (i) => (statusLabels[i.status] || statusLabels.issued)[0] },
  {
    header: "السداد",
    value: (i) =>
      i.document_type === "INVOICE" && i.status !== "cancelled" ? (paymentLabels[i.payment_status] || paymentLabels.unpaid)[0] : "",
  },
  { header: "الاستحقاق", value: (i) => i.due_date || "" },
  { header: "المتبقي", key: "balance_due" },
  { header: "أيام التأخير", value: (i) => i.days_overdue || 0 },
];

const TaxInvoices = () => {
  const preset = datePresets().thisQuarter;
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(preset.from);
  const [to, setTo] = useState(preset.to);
  const [type, setType] = useState("all");
  const [documentType, setDocumentType] = useState("all");
  const [taxCategory, setTaxCategory] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const invoicesPerPage = 25;
  const navigate = useNavigate();

  // The list's filters, shared by the page request and the Excel export.
  const filterParams = useCallback(() => {
    const f = { from, to, type, document_type: documentType, tax_category: taxCategory };
    if (search) f.search = search;
    // The overdue filter only makes sense over a full date range, so it
    // widens the window rather than intersecting with the quarter preset.
    if (overdueOnly) Object.assign(f, { overdue: "true", from: "1970-01-01", to: "2999-12-31" });
    return f;
  }, [from, to, type, documentType, taxCategory, overdueOnly, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        ...filterParams(),
        page: String(currentPage),
        limit: String(invoicesPerPage),
      });
      const res = await taxFetch(`/tax/invoices?${params.toString()}`);
      setInvoices(res.data || []);
      setPages(res.pages || 1);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterParams, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change resets to the first page.
  useEffect(() => {
    setCurrentPage(1);
  }, [from, to, type, documentType, taxCategory, overdueOnly, search]);

  // Every invoice matching the filters (all pages, not just the 25 on screen).
  const exportAll = async () => {
    setExporting(true);
    setExportError("");
    try {
      const rows = await fetchAllPages("/tax/invoices", filterParams(), {
        pick: (b) => ({ rows: b.data || [], total: b.total }),
      });
      await exportExcel("الفواتير الضريبية", EXPORT_COLUMNS, rows, {
        rangeLabel: overdueOnly ? "المتأخرة" : `${from || "البداية"} إلى ${to || "النهارده"}`,
      });
    } catch (e) {
      setExportError(e.message || "تعذر التصدير");
    } finally {
      setExporting(false);
    }
  };

  const pageNumbers = [];
  for (let i = 1; i <= pages; i++) pageNumbers.push(i);

  return (
    <div className="bg-white rounded-lg shadow p-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-primary">الفواتير الضريبية</h2>
        <button
          onClick={() => navigate("/tax/drafts/new")}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          <FilePlus size={16} />
          فاتورة جديدة (مسودة)
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-5 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">من تاريخ</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">نوع الفاتورة</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="all">الكل</option>
            <option value="SIMPLIFIED_TAX_INVOICE">مبسطة (أفراد)</option>
            <option value="STANDARD_TAX_INVOICE">ضريبية (منشآت)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">نوع المستند</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="all">الكل</option>
            <option value="INVOICE">فاتورة</option>
            <option value="CREDIT_NOTE">إشعار دائن</option>
            <option value="DEBIT_NOTE">إشعار مدين</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">الفئة الضريبية</label>
          <select
            value={taxCategory}
            onChange={(e) => setTaxCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="all">الكل</option>
            <option value="STANDARD">خاضعة 15%</option>
            <option value="ZERO_RATED">نسبة صفرية</option>
            <option value="EXEMPT">معفاة</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
        <div className="flex items-center gap-3">
          <label
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
              overdueOnly ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            <AlertTriangle size={16} />
            المتأخرة فقط
          </label>
          <div className="text-sm text-gray-600">عرض {total} مستند</div>
          <button
            onClick={exportAll}
            disabled={exporting || total === 0}
            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? "جاري التجهيز..." : "تحميل Excel"}
          </button>
        </div>
      </div>
      {exportError && <p className="-mt-4 mb-4 text-left text-xs text-red-600">{exportError}</p>}

      {error ? (
        <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">رقم الفاتورة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">التاريخ</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">النوع</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">العميل</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">بدون ضريبة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الضريبة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الإجمالي</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">المتبقي</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">
                    {overdueOnly ? "لا توجد فواتير متأخرة" : "لا توجد فواتير في هذه الفترة"}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-b cursor-pointer transition-colors ${
                      inv.is_overdue
                        ? "bg-red-50 border-r-4 border-r-red-500 hover:bg-red-100"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => navigate(`/tax/invoices/${inv.id}`)}
                  >
                    <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">رقم الفاتورة: </span>
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">التاريخ: </span>
                      {formatDate(inv.issued_at)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">النوع: </span>
                      {inv.document_type === "CREDIT_NOTE" ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                          إشعار دائن
                        </span>
                      ) : inv.document_type === "DEBIT_NOTE" ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                          إشعار مدين
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                          {typeLabels[inv.invoice_type] || inv.invoice_type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">العميل: </span>
                      {inv.buyer.name || "غير محدد"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">بدون ضريبة: </span>
                      {money(inv.price_excluding_vat)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">الضريبة: </span>
                      {money(inv.vat_amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-800 block md:table-cell">
                      <span className="font-semibold md:hidden">الإجمالي: </span>
                      {money(inv.total_with_vat)} {inv.currency}
                    </td>
                    <td className="px-6 py-4 text-right text-sm block md:table-cell">
                      <span className="font-semibold md:hidden">المتبقي: </span>
                      {inv.document_type === "INVOICE" ? (
                        <>
                          <span
                            className={
                              inv.balance_due > 0 ? "font-semibold text-gray-800" : "text-gray-400"
                            }
                          >
                            {money(inv.balance_due)}
                          </span>
                          {inv.is_overdue ? (
                            <span className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white">
                              <AlertTriangle size={12} />
                              متأخرة {inv.days_overdue} يوماً
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700 block md:table-cell">
                      <span className="font-semibold md:hidden">الحالة: </span>
                      <span className="inline-flex flex-wrap gap-1">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            (statusLabels[inv.status] || statusLabels.issued)[1]
                          }`}
                        >
                          {(statusLabels[inv.status] || statusLabels.issued)[0]}
                        </span>
                        {inv.document_type === "INVOICE" && inv.status !== "cancelled" ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              (paymentLabels[inv.payment_status] || paymentLabels.unpaid)[1]
                            }`}
                          >
                            {(paymentLabels[inv.payment_status] || paymentLabels.unpaid)[0]}
                          </span>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-1 md:space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 disabled:opacity-50"
            >
              السابق
            </button>
            {pageNumbers
              .filter((n) => Math.abs(n - currentPage) < 3 || n === 1 || n === pages)
              .map((n, idx, arr) => (
                <React.Fragment key={n}>
                  {idx > 0 && arr[idx - 1] !== n - 1 ? (
                    <span className="px-2 text-gray-400">...</span>
                  ) : null}
                  <button
                    onClick={() => setCurrentPage(n)}
                    className={`px-2 py-2 md:px-3 md:py-2 rounded-md text-sm ${
                      n === currentPage
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {n}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
              disabled={currentPage === pages}
              className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxInvoices;
