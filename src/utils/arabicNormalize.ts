// Arabic-aware string normalization for fuzzy equipment / catalog matching.
// Strips diacritics, unifies alef variants, ya/alef-maksura, ta marbuta, etc.,
// and collapses whitespace/separators to a single space.
//
// Used by:
//  - admin SmartEquipmentPaste (free-text → catalog match)
//  - vendor registration Step 7 equipment picker (search + de-dup of free-text
//    against catalog selections)
export function normalizeArabic(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\s\-_/]+/g, ' ');
}
