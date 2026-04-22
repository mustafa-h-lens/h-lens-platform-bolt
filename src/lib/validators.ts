// RFC-pragmatic email check:
// - requires a non-empty local-part that doesn't start or end with "."
// - rejects empty plus-tags ("name+@host") and double "+"
// - requires a domain with at least one dot and a 2+ char TLD
const EMAIL_REGEX = /^(?!\.)(?!.*\.\.)(?!.*\+\+)[A-Za-z0-9_'%=?^{|}~.\-]+(?:\+[A-Za-z0-9_'%=?^{|}~.\-]+)?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v.length === 0 || v.length > 254) return false;
  if (v.endsWith('.')) return false;
  const [local] = v.split('@');
  if (!local || local.length > 64) return false;
  if (local.endsWith('+') || local.endsWith('.')) return false;
  return EMAIL_REGEX.test(v);
}
