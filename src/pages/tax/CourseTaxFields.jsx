import React, { useEffect, useState } from "react";
import { taxFetch, money } from "./taxApi";

/**
 * Tax category + pricing mode inputs with a live net / VAT / total breakdown.
 * Shared by the add-course and edit-course forms.
 *
 * Props: price, taxCategory, priceIncludesVat, onChange({taxCategory, priceIncludesVat})
 */
const CourseTaxFields = ({ price, taxCategory, priceIncludesVat, onChange }) => {
  const [vatRate, setVatRate] = useState(15);

  useEffect(() => {
    let alive = true;
    taxFetch("/settings")
      .then((s) => {
        if (alive && s.vatRate !== undefined) setVatRate(parseFloat(s.vatRate) || 0);
      })
      .catch(() => {
        /* keep the default — the breakdown is a preview, not a source of truth */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Mirrors services/taxService.calculateLine on the backend.
  const round2 = (n) => Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100 * (n < 0 ? -1 : 1);
  const entered = round2(Number(price) || 0);
  const rate = taxCategory === "STANDARD" ? vatRate : 0;

  let net;
  let vat;
  let total;
  if (priceIncludesVat) {
    total = entered;
    net = round2(total / (1 + rate / 100));
    vat = round2(total - net);
  } else {
    net = entered;
    vat = round2(net * (rate / 100));
    total = round2(net + vat);
  }

  return (
    <div className="mb-4 rounded-md border border-gray-200 p-4 bg-gray-50">
      <h4 className="text-sm font-semibold text-primary mb-3">إعدادات الضريبة</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">الفئة الضريبية</label>
          <select
            value={taxCategory}
            onChange={(e) => onChange({ taxCategory: e.target.value, priceIncludesVat })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <option value="STANDARD">خاضعة للنسبة الأساسية ({vatRate}%)</option>
            <option value="ZERO_RATED">نسبة صفرية</option>
            <option value="EXEMPT">معفاة</option>
          </select>
          {taxCategory !== "STANDARD" ? (
            <p className="text-xs text-orange-600 mt-1">
              الدورات التدريبية خاضعة للضريبة بنسبة {vatRate}% ما لم تكن الجهة معتمدة من وزارة
              التعليم أو المؤسسة العامة للتدريب التقني والمهني.
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-1">طريقة إدخال السعر</label>
          <select
            value={String(priceIncludesVat)}
            onChange={(e) => onChange({ taxCategory, priceIncludesVat: e.target.value === "true" })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <option value="false">السعر بدون ضريبة</option>
            <option value="true">السعر شامل الضريبة</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded-md p-3 border">
          <p className="text-xs text-gray-500">بدون ضريبة</p>
          <p className="text-lg font-bold text-primary">{money(net)}</p>
        </div>
        <div className="bg-white rounded-md p-3 border">
          <p className="text-xs text-gray-500">الضريبة ({rate}%)</p>
          <p className="text-lg font-bold text-primary">{money(vat)}</p>
        </div>
        <div className="bg-white rounded-md p-3 border">
          <p className="text-xs text-gray-500">الإجمالي</p>
          <p className="text-lg font-bold text-primary">{money(total)}</p>
        </div>
      </div>
    </div>
  );
};

export default CourseTaxFields;
