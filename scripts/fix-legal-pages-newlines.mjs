// One-shot: replace literal "\n" (backslash + n, two chars) with real newlines
// in every string value inside public.legal_pages.content. The seed/migration
// stored escape sequences as text instead of LF chars, so the public legal
// page rendered "\n\n" inline instead of breaking lines.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || 'akcpkjzfhtmurtwzyzhn';
if (!TOKEN) {
  console.error('Set SUPABASE_ACCESS_TOKEN before running this script.');
  process.exit(1);
}
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(label, query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    console.log(`\n=== ${label} (HTTP ${res.status}) ===`);
    console.log(text.slice(0, 1200));
    if (!res.ok) throw new Error(text);
    return text;
  } catch (err) {
    if (attempt < 6) {
      await new Promise(r => setTimeout(r, 3000 * attempt));
      return sql(label, query, attempt + 1);
    }
    throw err;
  }
}

const NEEDLE = '\\n'; // two chars: backslash + n
const RE = new RegExp(NEEDLE.replace(/[\\]/g, '\\\\'), 'g'); // matches the literal two-char sequence

function fix(node) {
  if (typeof node === 'string') return node.replace(RE, '\n');
  if (Array.isArray(node)) return node.map(fix);
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = fix(node[k]);
    return out;
  }
  return node;
}

const txt = await sql('read', `SELECT id, type, content FROM public.legal_pages`);
const rows = JSON.parse(txt);

let touched = 0;
for (const row of rows) {
  const before = JSON.stringify(row.content);
  const fixedContent = fix(row.content);
  const after = JSON.stringify(fixedContent);
  if (before === after) {
    console.log(`skip ${row.type} ${row.id} — no change`);
    continue;
  }
  touched++;
  const escaped = after.replace(/'/g, "''");
  await sql(`update ${row.type}`,
    `UPDATE public.legal_pages SET content='${escaped}'::jsonb WHERE id='${row.id}' RETURNING id, type`);
}
console.log(`\nTouched ${touched} row(s).`);
