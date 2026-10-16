/**
 * Client-side mirror of acit-back/services/taxService.js.
 *
 * This exists so an edit in the draft editor updates net / VAT / grand total
 * the instant it is typed. It is a PREVIEW ONLY — the server recalculates from
 * the same rules on every save and again at issue time, and its numbers are the
 * ones that reach the ledger.
 *
 * The rules are duplicated deliberately rather than round-tripped to the API on
 * every keystroke. If taxService changes, change this too.
 */

/** Round to 2 decimals, half-up, immune to binary float representation. */
export function round2(value) {
  const n = Number(value);
  if (!isFinite(n) || n === 0) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  return sign * (Math.round((abs + Number.EPSILON) * 100) / 100);
}

/** ZERO_RATED and EXEMPT both charge 0% — they differ only in reporting. */
function effectiveRate(taxCategory, vatRate) {
  return taxCategory === "STANDARD" ? Number(vatRate) : 0;
}

/**
 * Spread a cart-level discount across lines in proportion to their value.
 * The last line absorbs the rounding remainder, so the parts always sum back
 * to the original discount exactly.
 */
export function allocateDiscount(amounts, totalDiscount) {
  const discount = round2(totalDiscount);
  const base = amounts.reduce((s, a) => s + a, 0);
  if (discount <= 0 || base <= 0) return amounts.map(() => 0);

  const capped = Math.min(discount, round2(base));
  const out = [];
  let allocated = 0;
  for (let i = 0; i < amounts.length; i++) {
    if (i === amounts.length - 1) {
      out.push(round2(capped - allocated));
    } else {
      const share = round2((amounts[i] / base) * capped);
      out.push(share);
      allocated = round2(allocated + share);
    }
  }
  return out;
}

/** One line. Whichever side is authoritative, the third value is derived by
 *  subtraction so net + vat === total exactly. */
export function calculateLine(line, vatRate) {
  const quantity = Number(line.quantity) > 0 ? Number(line.quantity) : 1;
  const taxCategory = ["STANDARD", "ZERO_RATED", "EXEMPT"].includes(line.tax_category)
    ? line.tax_category
    : "STANDARD";
  const priceIncludesVat = Boolean(line.price_includes_vat);
  const rate = effectiveRate(taxCategory, vatRate);
  const factor = 1 + rate / 100;

  const entered = round2(round2(Number(line.unit_price) || 0) * quantity);
  const discount = round2(Number(line.discount) || 0);
  const net = Math.max(0, round2(entered - discount));

  let priceExcludingVat;
  let vatAmount;
  let totalWithVat;

  if (priceIncludesVat) {
    totalWithVat = net;
    priceExcludingVat = round2(totalWithVat / factor);
    vatAmount = round2(totalWithVat - priceExcludingVat);
  } else {
    priceExcludingVat = net;
    vatAmount = round2(priceExcludingVat * (rate / 100));
    totalWithVat = round2(priceExcludingVat + vatAmount);
  }

  return {
    ...line,
    quantity,
    tax_category: taxCategory,
    unit_price: round2(Number(line.unit_price) || 0),
    discount,
    price_excluding_vat: priceExcludingVat,
    vat_rate: rate,
    vat_amount: vatAmount,
    total_with_vat: totalWithVat,
  };
}

/**
 * Whole invoice. Returns the recalculated lines alongside the totals, so the
 * table's computed columns and the totals block always agree.
 *
 * @param {Array}  lines
 * @param {object} opts  { vatRate, discount, discountMode, discountRate }
 */
export function calculateInvoice(lines, opts = {}) {
  const vatRate = opts.vatRate === undefined ? 15 : Number(opts.vatRate);
  const list = Array.isArray(lines) ? lines : [];

  const entered = list.map((l) =>
    round2(round2(Number(l.unit_price) || 0) * (Number(l.quantity) > 0 ? Number(l.quantity) : 1))
  );
  const gross = round2(entered.reduce((s, a) => s + a, 0));

  // A percentage discount is resolved against the pre-discount total, the same
  // way the server does it.
  const cartDiscount =
    opts.discountMode === "PERCENT"
      ? round2(gross * (Math.min(100, Math.max(0, Number(opts.discountRate) || 0)) / 100))
      : Math.max(0, Number(opts.discount) || 0);

  const allocated = allocateDiscount(entered, cartDiscount);
  const items = list.map((l, i) =>
    calculateLine({ ...l, discount: round2((Number(l.discount) || 0) + allocated[i]) }, vatRate)
  );

  const sum = (key) => round2(items.reduce((s, it) => s + it[key], 0));

  return {
    items,
    subtotal: gross,
    discount: round2(allocated.reduce((s, a) => s + a, 0)),
    net: sum("price_excluding_vat"),
    vat: sum("vat_amount"),
    total: sum("total_with_vat"),
  };
}
