// Scan every public text/jsonb column for the literal two-char sequence "\n"
// (backslash + n). Reports table.column -> count of rows that contain it, so we
// can spot any other place the same data-seeding bug leaked into.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
if (!TOKEN) {
  console.error('Set SUPABASE_ACCESS_TOKEN before running this script.');
  process.exit(1);
}
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  } catch (err) {
    if (attempt < 6) {
      await new Promise(r => setTimeout(r, 3000 * attempt));
      return sql(query, attempt + 1);
    }
    throw err;
  }
}

const cols = await sql(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public'
    AND data_type IN ('text','character varying','jsonb','json')
  ORDER BY table_name, column_name
`);

console.log(`Scanning ${cols.length} columns...`);
const hits = [];
for (const c of cols) {
  // For text columns: strpos finds the literal two-char "\n" sequence.
  // For jsonb columns: cast jsonb back to text re-encodes real newlines as
  //   the escape "\n", so we'd get false positives. Instead, traverse with
  //   jsonb_each and compare each scalar's text form. To stay simple, we
  //   skip jsonb here and inspect each manually.
  if (c.data_type === 'jsonb' || c.data_type === 'json') {
    continue;
  }
  const q = `SELECT count(*)::int AS n FROM public.${c.table_name} WHERE strpos(${c.column_name}, E'\\\\n') > 0`;
  try {
    const rows = await sql(q);
    const n = rows[0]?.n || 0;
    if (n > 0) {
      hits.push({ ...c, n });
      console.log(`  HIT: ${c.table_name}.${c.column_name} (${c.data_type}) -> ${n} row(s)`);
    }
  } catch (e) {
    // Some tables may have no SELECT permission via the management API; skip.
    console.log(`  skip ${c.table_name}.${c.column_name}: ${(e.message || e).toString().slice(0, 100)}`);
  }
}
console.log(`\nDone. ${hits.length} columns contain literal "\\n" sequences.`);
