import { toEnglishNumbers } from './numberUtils';
import { COUNTRY_CODES } from './shared-data';

// Saudi mobile numbers are 9 digits starting with 5, dialed locally as
// 05XXXXXXXX and internationally as +9665XXXXXXXX. The vendors table
// stores the 9-digit form; for SMS sending we need the E.164 form.

const SAUDI_9_DIGIT = /^5\d{8}$/;

const stripFormatting = (input: string): string =>
  toEnglishNumbers(input || '').replace(/[\s\-()]/g, '');

// Returns the 9-digit local form ("5XXXXXXXX") or null if the input
// isn't a recognizable Saudi mobile number.
export const saudiPhoneDigitsOnly = (input: string): string | null => {
  if (!input) return null;
  let digits = stripFormatting(input);
  if (digits.startsWith('+966')) digits = digits.slice(4);
  else if (digits.startsWith('00966')) digits = digits.slice(5);
  else if (digits.startsWith('966')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return SAUDI_9_DIGIT.test(digits) ? digits : null;
};

// Returns the E.164 international form ("+9665XXXXXXXX") or null.
export const normalizeSaudiPhone = (input: string): string | null => {
  const nine = saudiPhoneDigitsOnly(input);
  return nine ? `+966${nine}` : null;
};

export const isValidSaudiPhone = (input: string): boolean =>
  saudiPhoneDigitsOnly(input) !== null;

// Display helper: "5XX XXX XXXX" with the leading 0 for local UX.
export const formatSaudiPhoneDisplay = (input: string): string => {
  const nine = saudiPhoneDigitsOnly(input);
  if (!nine) return input;
  return `0${nine.slice(0, 2)} ${nine.slice(2, 5)} ${nine.slice(5)}`;
};

// ── Multi-country shared helpers (used by registration, login, admin) ──

// Smart-strip a phone input value against the selected country code.
// Removes whitespace, non-digits, the country code prefix (with or without
// leading 00), and any national-trunk leading 0. Caps at 15 digits (E.164 max).
export const stripLocalPhone = (input: string, countryCode: string = '+966'): string => {
  let v = toEnglishNumbers(input || '').replace(/\s+/g, '').replace(/\D/g, '');
  const ccDigits = (countryCode || '+966').replace(/^\+/, '');
  if (v.startsWith('00' + ccDigits)) v = v.slice(('00' + ccDigits).length);
  else if (v.startsWith(ccDigits)) v = v.slice(ccDigits.length);
  if (v.startsWith('0')) v = v.slice(1);
  return v.slice(0, 15);
};

// Reverse of stripLocalPhone: take a stored phone value (any format) and
// return { countryCode, local } for display in admin edit forms. Uses
// longest-prefix match against COUNTRY_CODES; defaults to Saudi (+966) when
// no prefix matches (matches the historical assumption of legacy rows).
export const splitStoredPhone = (stored: string | null | undefined): { countryCode: string; local: string } => {
  if (!stored) return { countryCode: '+966', local: '' };
  let v = toEnglishNumbers(String(stored)).replace(/\s+/g, '').replace(/\D/g, '');
  // Pure local-format (starts with 0, total length ≤ 11) → Saudi by convention
  if (v.startsWith('0') && v.length <= 11) return { countryCode: '+966', local: v.slice(1) };
  // Longest prefix first so +966 wins over +9, +9665 wins over +966, etc.
  const codes = COUNTRY_CODES.map(c => c.code.replace(/^\+/, '')).sort((a, b) => b.length - a.length);
  for (const cc of codes) {
    if (v.startsWith('00' + cc)) return { countryCode: '+' + cc, local: v.slice(('00' + cc).length) };
    if (v.startsWith(cc)) return { countryCode: '+' + cc, local: v.slice(cc.length) };
  }
  return { countryCode: '+966', local: v };
};
