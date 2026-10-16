import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Trash2, Plus } from "lucide-react";
import { API, money } from "./taxApi";

/**
 * The printed invoice. One component, two modes:
 *
 *   editable=false  the frozen document, on the detail page and in the PDF
 *   editable=true   the same document with its editable fields turned into
 *                   inputs, which is how a draft is reviewed
 *
 * A draft is reviewed in the finished layout rather than in a separate form, so
 * what the admin approves is exactly what the customer will receive. The fields
 * that are NOT editable — seller block, VAT rate, every computed total — render
 * identically in both modes and are visibly locked, because they come from the
 * tax settings and from taxService, never from a keystroke.
 */

const CATEGORY_LABELS = {
  STANDARD: "خاضعة للضريبة",
  ZERO_RATED: "نسبة صفرية",
  EXEMPT: "معفاة",
};

const DOC_TITLES = {
  INVOICE: { ar: "فاتورة ضريبية", en: "Tax Invoice" },
  INVOICE_SIMPLIFIED: { ar: "فاتورة ضريبية مبسطة", en: "Simplified Tax Invoice" },
  CREDIT_NOTE: { ar: "إشعار دائن", en: "Credit Note" },
  DEBIT_NOTE: { ar: "إشعار مدين", en: "Debit Note" },
};

/** Absolute URL for an uploaded asset, so html2canvas can fetch it same-origin. */
export const assetUrl = (p) => {
  if (!p) return null;
  if (/^(https?:|data:)/i.test(p)) return p;
  return `${API.trim().replace(/\/api\/?$/, "")}${p.startsWith("/") ? "" : "/"}${p}`;
};

/** "العربي / English" — every label on the document is bilingual. */
const L = ({ ar, en }) => (
  <>
    {ar} <span className="inv-en">/ {en}</span>
  </>
);

/**
 * A boxed value in the two-column info panels; an input when editable.
 *
 * `optional` fields disappear entirely on a read-only document when they have
 * no value, rather than printing a bare dash — an issued invoice should not
 * advertise the settings its owner never filled in. They still render while
 * editing, so the admin can see there is somewhere to type.
 */
const Field = ({ label, value, editable, onChange, type = "text", ltr, placeholder, optional }) => {
  const empty = value === null || value === undefined || value === "";
  if (optional && empty && !editable) return null;
  return (
    <div className="inv-field">
      <div className="inv-lbl">{label}</div>
      {editable ? (
        <input
          type={type}
          className="inv-val inv-input"
          dir={ltr ? "ltr" : undefined}
          value={empty ? "" : value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className={`inv-val${ltr ? " inv-ltr" : ""}`}>{value || "—"}</div>
      )}
    </div>
  );
};

/** A totals row. Always read-only — these come from taxService, not the admin. */
const TotalRow = ({ label, value, currency, variant }) => (
  <div className={`inv-trow${variant ? ` inv-trow-${variant}` : ""}`}>
    <div className="inv-tlbl">{label}</div>
    <div className="inv-tbox">
      <span>{money(value)}</span>
      <span className="inv-cur">{currency}</span>
    </div>
  </div>
);

const InvoiceDocument = ({
  invoice,
  settings = {},
  editable = false,
  draft,
  onDraftChange,
  onLineChange,
  onAddLine,
  onRemoveLine,
  totals,
}) => {
  if (!invoice) return null;

  const isNote = invoice.document_type !== "INVOICE";
  const titleKey = isNote
    ? invoice.document_type
    : invoice.invoice_type === "SIMPLIFIED_TAX_INVOICE"
    ? "INVOICE_SIMPLIFIED"
    : "INVOICE";
  const title = DOC_TITLES[titleKey] || DOC_TITLES.INVOICE;

  // In edit mode the draft state is the source of truth for the editable
  // fields; the totals still come from the server-shaped calculation.
  const buyer = editable ? draft.buyer : invoice.buyer;
  const lines = editable ? draft.lines : invoice.items;
  const sums = totals || {
    subtotal: invoice.price_excluding_vat + invoice.discount,
    discount: invoice.discount,
    net: invoice.price_excluding_vat,
    vat: invoice.vat_amount,
    total: invoice.total_with_vat,
  };
  const currency = invoice.currency || settings.currency || "SAR";
  const paid = invoice.amount_paid || 0;
  const balance = invoice.balance_due !== undefined ? invoice.balance_due : sums.total - paid;
  // A linked credit/debit note changes what is owed without changing this
  // document's own total, so the balance below is computed against a figure the
  // page never showed: "230 total, 230 paid, -12 balance" reads as an error.
  // Surface the adjustment and the amount it leaves payable.
  const adjustment = Number(invoice.note_adjustment || 0);
  const payable =
    invoice.payable_total !== undefined ? invoice.payable_total : sums.total + adjustment;
  const hasAdjustment = Math.abs(adjustment) > 0.005;

  const logo = assetUrl(settings.companyLogo);
  const stamp = assetUrl(settings.companyStamp);
  const termsText =
    (editable ? draft.terms_override : invoice.terms) || settings.invoiceTerms || "";
  const terms = termsText.split("\n").map((t) => t.trim()).filter(Boolean);

  const set = (key, value) => onDraftChange && onDraftChange(key, value);
  const setBuyer = (key, value) =>
    onDraftChange && onDraftChange("buyer", { ...draft.buyer, [key]: value });

  const lastPayment =
    invoice.payments && invoice.payments.length > 0
      ? invoice.payments.filter((p) => !p.reversed).slice(-1)[0]
      : null;

  return (
    <article className="inv-sheet" id="invoice-content" dir="rtl">
      {/* ---------- header ---------- */}
      <header className="inv-head">
        {/* No logo uploaded: drop the box rather than print an empty frame.
            While editing, the placeholder stays as an affordance. */}
        {logo ? (
          <div className="inv-logo">
            <img src={logo} alt={invoice.seller.name || "شعار المنشأة"} crossOrigin="anonymous" />
          </div>
        ) : editable ? (
          <div className="inv-logo">
            <span className="inv-logo-empty">شعار المنشأة</span>
          </div>
        ) : null}
        <div className="inv-org">
          <p className="inv-org-ar">{invoice.seller.name || "—"}</p>
          {invoice.seller.name_en ? <p className="inv-org-en">{invoice.seller.name_en}</p> : null}
          {invoice.seller.address ? <p className="inv-meta">{invoice.seller.address}</p> : null}
          {settings.supportPhone || settings.whatsapp ? (
            <p className="inv-meta" dir="ltr">
              {[settings.supportPhone, settings.whatsapp].filter(Boolean).join("  ·  ")}
            </p>
          ) : null}
          {invoice.seller.cr_number ? (
            <p className="inv-meta">السجل التجاري: {invoice.seller.cr_number}</p>
          ) : null}
        </div>
      </header>

      {/* repeating company-name band, as a separator */}
      <div className="inv-band" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i}>{invoice.seller.name || ""}</span>
        ))}
      </div>

      {/* ---------- title ---------- */}
      <div className="inv-title">
        <h2>{title.ar}</h2>
        <p>{title.en}</p>
      </div>

      {/* ---------- two-column info ---------- */}
      <div className="inv-cols">
        {/* RIGHT in RTL: the buyer */}
        <section className="inv-panel">
          <h3>
            <L ar="بيانات المتدرب" en="Student Details" />
          </h3>
          <Field
            label={<L ar="رقم الفاتورة" en="Invoice" />}
            value={invoice.invoice_number || "— (مسودة)"}
          />
          <Field
            label={<L ar="اسم المتدرب" en="Student Name" />}
            value={buyer.name}
            editable={editable}
            onChange={(v) => setBuyer("name", v)}
          />
          <Field
            label={<L ar="البريد الإلكتروني" en="E-mail" />}
            value={buyer.email}
            editable={editable}
            ltr
            onChange={(v) => setBuyer("email", v)}
          />
          <Field
            label={<L ar="رقم الجوال" en="Cell Phone" />}
            value={buyer.phone}
            editable={editable}
            ltr
            onChange={(v) => setBuyer("phone", v)}
          />
          <Field
            label={<L ar="تاريخ الاشتراك" en="Start Date" />}
            value={buyer.enrollment_date}
            editable={editable}
            type="date"
            onChange={(v) => setBuyer("enrollment_date", v)}
          />
          <Field
            label={<L ar="التاريخ" en="Date" />}
            value={invoice.issued_at ? String(invoice.issued_at).slice(0, 10) : "— (مسودة)"}
          />
          {editable || buyer.company_name ? (
            <Field
              label={<L ar="اسم الشركة" en="Company" />}
              value={buyer.company_name}
              editable={editable}
              onChange={(v) => setBuyer("company_name", v)}
              placeholder="للفواتير الضريبية (B2B)"
            />
          ) : null}
          {editable || buyer.vat_number ? (
            <Field
              label={<L ar="الرقم الضريبي" en="VAT Number" />}
              value={buyer.vat_number}
              editable={editable}
              ltr
              onChange={(v) => setBuyer("vat_number", v)}
              placeholder="15 رقماً يبدأ وينتهي بـ 3"
            />
          ) : null}
        </section>

        {/* LEFT: the seller — never editable, it comes from the tax settings */}
        <section className="inv-panel inv-locked">
          <h3>
            <L ar="بيانات البائع" en="Seller Details" />
            {editable ? <span className="inv-lock">من الإعدادات</span> : null}
          </h3>
          <Field label={<L ar="اسم المنشأة" en="Seller" />} value={invoice.seller.name} />
          <Field
            label={<L ar="الرقم الضريبي" en="VAT Number" />}
            value={invoice.seller.vat_number}
            ltr
          />
          <Field
            label={<L ar="السجل التجاري" en="CR Number" />}
            value={invoice.seller.cr_number}
            ltr
            optional
          />
          <Field label={<L ar="العنوان" en="Address" />} value={invoice.seller.address} optional />
          <Field
            label={<L ar="المعرّف الفريد" en="UUID" />}
            value={invoice.uuid || "— (يُنشأ عند الإصدار)"}
            ltr
          />
          <Field
            label={<L ar="الطابع الزمني" en="Timestamp" />}
            value={invoice.timestamp || "— (يُنشأ عند الإصدار)"}
            ltr
          />
        </section>
      </div>

      {/* ---------- line items ---------- */}
      <table className="inv-items">
        <thead>
          <tr>
            <th className="inv-idx">#</th>
            <th>
              <L ar="اسم الدورة" en="Course" />
            </th>
            <th className="inv-w-qty">
              <L ar="الكمية" en="Qty" />
            </th>
            <th className="inv-w-cat">
              <L ar="الفئة" en="Category" />
            </th>
            <th className="inv-w-num">
              <L ar="سعر الوحدة" en="Unit Price" />
            </th>
            <th className="inv-w-num">
              <L ar="بدون ضريبة" en="Net" />
            </th>
            <th className="inv-w-rate">
              <L ar="النسبة" en="Rate" />
            </th>
            <th className="inv-w-num">
              <L ar="الضريبة" en="VAT" />
            </th>
            <th className="inv-w-num">
              <L ar="الإجمالي" en="Total" />
            </th>
            {editable ? <th className="inv-w-act no-print"></th> : null}
          </tr>
        </thead>
        <tbody>
          {lines.map((it, i) => (
            <tr key={it.id || i}>
              <td className="inv-idx">{i + 1}</td>
              <td>
                {editable ? (
                  <input
                    className="inv-input"
                    value={it.description || ""}
                    placeholder="اسم الدورة أو الخدمة"
                    onChange={(e) => onLineChange(i, "description", e.target.value)}
                  />
                ) : (
                  it.title || it.description
                )}
              </td>
              <td className="inv-num">
                {editable ? (
                  <input
                    className="inv-input"
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => onLineChange(i, "quantity", e.target.value)}
                  />
                ) : (
                  it.quantity
                )}
              </td>
              <td>
                {editable ? (
                  <select
                    className="inv-input"
                    value={it.tax_category}
                    onChange={(e) => onLineChange(i, "tax_category", e.target.value)}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                ) : (
                  CATEGORY_LABELS[it.tax_category] || it.tax_category
                )}
              </td>
              <td className="inv-num">
                {editable ? (
                  <input
                    className="inv-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={it.unit_price}
                    onChange={(e) => onLineChange(i, "unit_price", e.target.value)}
                  />
                ) : (
                  <>
                    {money(it.unit_price)} <span className="inv-cur">{currency}</span>
                  </>
                )}
              </td>
              {/* computed — read-only in both modes */}
              <td className="inv-num inv-computed">
                {money(it.price_excluding_vat)} <span className="inv-cur">{currency}</span>
              </td>
              <td className="inv-num inv-computed">{it.vat_rate}%</td>
              <td className="inv-num inv-computed">
                {money(it.vat_amount)} <span className="inv-cur">{currency}</span>
              </td>
              <td className="inv-num inv-computed">
                <strong>{money(it.total_with_vat)}</strong>{" "}
                <span className="inv-cur">{currency}</span>
              </td>
              {editable ? (
                <td className="no-print inv-w-act">
                  <button
                    type="button"
                    className="inv-iconbtn"
                    title="حذف البند"
                    onClick={() => onRemoveLine(i)}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {editable ? (
        <button type="button" className="inv-addline no-print" onClick={onAddLine}>
          <Plus size={14} />
          إضافة بند
        </button>
      ) : null}

      {/* ---------- totals ---------- */}
      <div className="inv-totals">
        {editable ? (
          <div className="inv-discount-editor no-print">
            <span className="inv-lbl">
              <L ar="الخصم" en="Discount" />
            </span>
            <select
              className="inv-input"
              value={draft.discount_mode}
              onChange={(e) => set("discount_mode", e.target.value)}
            >
              <option value="FIXED">مبلغ ثابت</option>
              <option value="PERCENT">نسبة %</option>
            </select>
            <input
              className="inv-input"
              type="number"
              step="0.01"
              min="0"
              max={draft.discount_mode === "PERCENT" ? 100 : undefined}
              value={draft.discount_mode === "PERCENT" ? draft.discount_rate : draft.discount}
              onChange={(e) =>
                set(draft.discount_mode === "PERCENT" ? "discount_rate" : "discount", e.target.value)
              }
            />
          </div>
        ) : null}

        <TotalRow
          label={<L ar="المجموع قبل الخصم" en="Subtotal" />}
          value={sums.subtotal}
          currency={currency}
        />
        <TotalRow
          label={<L ar="الخصم" en="Discount" />}
          value={sums.discount}
          currency={currency}
        />
        <TotalRow
          label={<L ar="الصافي بعد الخصم" en="Net" />}
          value={sums.net}
          currency={currency}
        />
        <TotalRow
          label={<L ar={`ضريبة القيمة المضافة ${invoice.vat_rate}%`} en="VAT" />}
          value={sums.vat}
          currency={currency}
        />
        <TotalRow
          label={<L ar="الإجمالي شامل الضريبة" en="Total" />}
          value={sums.total}
          currency={currency}
          variant="grand"
        />
        {!isNote ? (
          <>
            {hasAdjustment ? (
              <>
                <TotalRow
                  label={
                    <L
                      ar={adjustment < 0 ? "خصم بإشعار دائن" : "إضافة بإشعار مدين"}
                      en={adjustment < 0 ? "Credit note" : "Debit note"}
                    />
                  }
                  value={adjustment}
                  currency={currency}
                />
                <TotalRow
                  label={<L ar="المستحق بعد الإشعارات" en="Payable" />}
                  value={payable}
                  currency={currency}
                />
              </>
            ) : null}
            <TotalRow label={<L ar="المسدد" en="Paid" />} value={paid} currency={currency} />
            <TotalRow
              // A negative balance is money owed back to the customer, not money
              // they still owe — labelling it "المتبقي" reads as a debt.
              label={
                balance < -0.005 ? (
                  <L ar="مستحق للعميل" en="Refund due" />
                ) : (
                  <L ar="المتبقي" en="Balance" />
                )
              }
              value={balance < -0.005 ? -balance : balance}
              currency={currency}
              variant="balance"
            />
          </>
        ) : null}
      </div>

      {/* ---------- payment / QR / stamp ---------- */}
      <section className="inv-settle">
        <div className="inv-settle-grid">
          {/* RIGHT in RTL: the stamp */}
          <div className="inv-settle-cell inv-centered">
            {stamp ? (
              <img className="inv-stamp" src={stamp} alt="الختم الرسمي" crossOrigin="anonymous" />
            ) : (
              <div className="inv-stamp-empty">الختم</div>
            )}
            <p className="inv-cap">
              <L ar="الختم الرسمي" en="Official Stamp" />
            </p>
          </div>

          {/* CENTRE: the ZATCA QR.
              Rendered at 85px natively rather than scaled down in CSS, so the
              modules stay on whole pixels. The ZATCA payload is ~60-80 bytes
              (version 5-6, ~41 modules), which puts this near the floor for a
              reliable scan — do not shrink it further. */}
          <div className="inv-settle-cell inv-centered">
            {invoice.qr_code ? (
              <QRCodeCanvas value={invoice.qr_code} size={85} includeMargin />
            ) : (
              <div className="inv-qr-empty">يُنشأ رمز QR عند الإصدار</div>
            )}
            <p className="inv-cap">
              <L ar="رمز الاستجابة السريعة" en="ZATCA QR" />
            </p>
          </div>

          {/* LEFT: payment detail */}
          <div className="inv-settle-cell">
            <h4>
              <L ar="بيانات السداد" en="Payment" />
            </h4>
            <div className="inv-kv">
              <span>
                <L ar="التاريخ" en="Date" />
              </span>
              <span>{invoice.issued_at ? String(invoice.issued_at).slice(0, 10) : "—"}</span>
            </div>
            {/* Unpaid invoices have no method or reference yet. Drop the rows
                rather than print a dash against each — same rule as the
                optional seller fields. */}
            {lastPayment && lastPayment.method ? (
              <div className="inv-kv">
                <span>
                  <L ar="طريقة الدفع" en="Payment Type" />
                </span>
                <span>{lastPayment.method}</span>
              </div>
            ) : null}
            {lastPayment && lastPayment.reference ? (
              <div className="inv-kv">
                <span>
                  <L ar="المرجع" en="Reference" />
                </span>
                <span dir="ltr">{lastPayment.reference}</span>
              </div>
            ) : null}
            {invoice.payments && invoice.payments.length > 0 ? (
              <table className="inv-paytable">
                <thead>
                  <tr>
                    <th>طريقة الدفع</th>
                    <th>المبلغ</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments
                    .filter((p) => !p.reversed)
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.method}</td>
                        <td>{money(p.amount)}</td>
                        <td>{String(p.paid_at).slice(0, 10)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
        <div className="inv-vatstrip">
          <L ar="الرقم الضريبي" en="VAT Number" />: <span dir="ltr">{invoice.seller.vat_number}</span>
        </div>
      </section>

      {/* ---------- notes + terms ---------- */}
      {editable || invoice.notes ? (
        <section className="inv-terms">
          <h4>
            <L ar="ملاحظات" en="Notes" />
          </h4>
          {editable ? (
            <textarea
              className="inv-input inv-textarea"
              rows={2}
              placeholder="ملاحظة تظهر على الفاتورة (اختياري)"
              value={draft.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          ) : (
            <p className="inv-note">{invoice.notes}</p>
          )}
        </section>
      ) : null}

      <section className="inv-terms">
        <h4>
          <L ar="الشروط والأحكام" en="Terms & Conditions" />
          {editable ? <span className="inv-lock">افتراضي من الإعدادات</span> : null}
        </h4>
        {editable ? (
          <textarea
            className="inv-input inv-textarea"
            rows={4}
            placeholder={settings.invoiceTerms || "سطر لكل شرط"}
            value={draft.terms_override || ""}
            onChange={(e) => set("terms_override", e.target.value)}
          />
        ) : (
          <ol>
            {terms.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
};

export default InvoiceDocument;
