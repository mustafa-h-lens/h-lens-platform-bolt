// HTML escaping + small RTL helpers shared across all email templates.
// Centralised here so we don't duplicate across each edge function.

export function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Build the hidden inbox-preview snippet. Long emails get a snippet padded with
// zero-width joiners so the preview line shows OUR text instead of leaking the
// next bit of HTML body.
export function preheaderHtml(text: string): string {
  const safe = escapeHtml(text);
  const pad = " &zwnj; &nbsp;".repeat(40);
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:#f4f6fb;">${safe}${pad}</div>`;
}

// Wrap an arbitrary string in <p dir="ltr"> when it looks like a phone number,
// IBAN, ID number, etc. Used by the diff/info components to keep numerals LTR
// even in an RTL document.
export function ltrSpan(s: string): string {
  return `<span dir="ltr" style="unicode-bidi:isolate;">${escapeHtml(s)}</span>`;
}
