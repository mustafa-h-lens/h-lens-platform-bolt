// Clears all activity-log tables.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function run(label, query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    console.log(`\n=== ${label} (HTTP ${res.status}) ===`);
    console.log(text.slice(0, 4000));
    if (!res.ok) throw new Error(`Query failed: ${label}`);
    return text;
  } catch (err) {
    if (attempt < 4) {
      console.log(`\n--- ${label} attempt ${attempt} failed (${err.message || err.code}); retrying ---`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return run(label, query, attempt + 1);
    }
    throw err;
  }
}

await run('inspect activity-log objects', `
  SELECT table_name, table_type
  FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE '%activity_log%'
  ORDER BY table_name
`);

// global_activity_log is a VIEW — skip it; truncating the underlying tables is enough.
await run('truncate activity-log tables', `
  BEGIN;
  TRUNCATE TABLE
    public.activity_logs,
    public.system_activity_log,
    public.vendor_activity_log
  RESTART IDENTITY CASCADE;
  COMMIT;
`);

await run('counts after wipe', `
  SELECT 'activity_logs' AS t, count(*)::int AS n FROM public.activity_logs UNION ALL
  SELECT 'system_activity_log', count(*)::int FROM public.system_activity_log UNION ALL
  SELECT 'vendor_activity_log', count(*)::int FROM public.vendor_activity_log UNION ALL
  SELECT 'global_activity_log (view)', count(*)::int FROM public.global_activity_log
  ORDER BY t
`);
