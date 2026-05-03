const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || 'akcpkjzfhtmurtwzyzhn';
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN.'); process.exit(1); }
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(q) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  return JSON.parse(await res.text());
}

// pg_trigger view (more reliable than information_schema)
const rows = await sql(`
  SELECT
    c.relname AS tbl,
    t.tgname  AS trigger_name,
    p.proname AS func,
    pg_get_triggerdef(t.oid) AS definition
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_proc  p ON p.oid = t.tgfoid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND pg_get_functiondef(p.oid) ILIKE '%vendor_activity_log%'
  ORDER BY c.relname, t.tgname
`);
for (const r of rows) console.log(`${r.tbl} :: ${r.trigger_name} :: ${r.func}`);
console.log(`\n${rows.length} trigger(s) found.`);
