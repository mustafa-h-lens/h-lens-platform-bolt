import { toEnglishNumbers } from './numberUtils';

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
