const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
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
    console.log(text.slice(0, 5000));
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  } catch (err) {
    if (attempt < 4) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return sql(label, query, attempt + 1);
    }
    throw err;
  }
}

await sql('vendors RLS policies', `
  SELECT policyname, cmd, roles::text, qual, with_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename='vendors'
  ORDER BY cmd, policyname
`);
