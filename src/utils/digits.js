// National ID and phone inputs: digits only, as the visitor types.
// Arabic-Indic (٠-٩) and Persian (۰-۹) digits, which Arabic keyboards type,
// become 0-9 instead of being dropped; letters and symbols are dropped.
// The same file lives in acit-front/src/utils/digits.js.

const toLatinDigits = (value) =>
  String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

// Saudi ID / Iqama is 10 digits; 15 leaves room for other Gulf IDs.
export const NATIONAL_ID_MAX = 15;
// E.164 allows at most 15 digits after the "+".
export const PHONE_MAX = 15;

/** National ID: digits only. */
export const nationalIdInput = (value) =>
  toLatinDigits(value).replace(/\D/g, "").slice(0, NATIONAL_ID_MAX);

/** Phone: digits, with one optional "+" at the start (+9665...). */
export const phoneInput = (value) => {
  const text = toLatinDigits(value).trim();
  const plus = text.startsWith("+") ? "+" : "";
  return plus + text.replace(/\D/g, "").slice(0, PHONE_MAX);
};

// Spread onto the <input>: number keypad on phones, numbers read left to right.
export const nationalIdProps = { inputMode: "numeric", autoComplete: "off", dir: "ltr", maxLength: NATIONAL_ID_MAX };
export const phoneProps = { type: "tel", inputMode: "tel", autoComplete: "tel", dir: "ltr", maxLength: PHONE_MAX + 1 };
