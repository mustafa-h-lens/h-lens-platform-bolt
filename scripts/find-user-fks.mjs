// List all FKs that reference public.users(id) or auth.users(id)
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

const rows = await sql(`
  SELECT
    n.nspname AS child_schema,
    c.relname AS child_table,
    a.attname AS child_col,
    rn.nspname AS parent_schema,
    rc.relname AS parent_table,
    ra.attname AS parent_col,
    confdeltype AS on_delete,
    a.attnotnull AS not_null
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
  JOIN pg_class rc ON rc.oid = con.confrelid
  JOIN pg_namespace rn ON rn.oid = rc.relnamespace
  JOIN pg_attribute ra ON ra.attrelid = con.confrelid AND ra.attnum = ANY(con.confkey)
  WHERE con.contype = 'f'
    AND (
      (rn.nspname = 'public' AND rc.relname = 'users')
      OR (rn.nspname = 'auth' AND rc.relname = 'users')
    )
  ORDER BY child_schema, child_table, child_col
`);
for (const r of rows) {
  const od = { 'a': 'NO ACTION', 'r': 'RESTRICT', 'c': 'CASCADE', 'n': 'SET NULL', 'd': 'SET DEFAULT' }[r.on_delete] || r.on_delete;
  console.log(`${r.child_schema}.${r.child_table}.${r.child_col} -> ${r.parent_schema}.${r.parent_table}.${r.parent_col} | ${od} | not_null=${r.not_null}`);
}
console.log(`\n${rows.length} FK(s).`);
