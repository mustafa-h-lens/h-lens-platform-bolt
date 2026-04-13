/**
 * Arabic-aware search helpers.
 *
 * Normalizes Arabic text so searches are forgiving of:
 *   - Alef forms: ا / أ / إ / آ  → ا
 *   - Taa marbuta: ة → ه
 *   - Alef maksura: ى → ي
 *   - Hamza carriers: ؤ → و, ئ → ي, ء removed
 *   - Tatweel (ـ) removed
 *   - Arabic diacritics (harakat) removed
 *   - Whitespace collapsed
 *   - ASCII letters lowercased
 *
 * Matching is substring-based (not prefix-only), so "الغامدي" finds
 * "عبدالعزيز الغامدي" and "غامدي" also finds it.
 */
export function normalizeArabic(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toString()
    .replace(/[\u064B-\u065F\u0670]/g, '') // diacritics / harakat
    .replace(/ـ/g, '') // tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Returns true if `query` appears as a substring inside any of the `fields`
 * after Arabic normalization. Empty/whitespace query always matches.
 */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = normalizeArabic(query);
  if (!q) return true;
  return fields.some(f => normalizeArabic(f).includes(q));
}
