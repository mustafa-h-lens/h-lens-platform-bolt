// One-shot updater for the contact section of legal_pages.terms.
// Replaces the body with the new email/phone/address.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env var.');
  process.exit(2);
}
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

const newBody =
  'إذا كان لديك أي استفسارات أو أسئلة حول هذه الشروط والأحكام، يُرجى التواصل معنا عبر:\n\n' +
  'البريد الإلكتروني: support@h-lens.co\n' +
  'الهاتف: +966 59 832 7531\n' +
  'العنوان: الرياض - المملكة العربية السعودية\n\n' +
  'نحن هنا لمساعدتك والإجابة على جميع استفساراتك.';

// JSON-encode the new body, then wrap in PostgreSQL single quotes (escaping any inner single quote)
const bodyJson = JSON.stringify(newBody).replace(/'/g, "''");

const sql =
  `UPDATE legal_pages SET content = jsonb_set(content, '{sections,8,body}', '${bodyJson}'::jsonb) ` +
  `WHERE type = 'terms' AND is_active = true RETURNING id, type;`;

const res = await fetch(URL, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
console.log('HTTP', res.status);
console.log(text);
