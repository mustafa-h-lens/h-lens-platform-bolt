import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const q = async (label, sql) => {
  const r = await client.query(sql);
  console.log(`\n=== ${label} ===`);
  r.rows.forEach(row => console.log(row));
};
await q('drafts before cleanup', `SELECT count(*) FROM vendor_registration_drafts`);
await q('run cleanup', `SELECT * FROM delete_expired_vendor_drafts()`);
await q('drafts after cleanup', `SELECT count(*) FROM vendor_registration_drafts`);
await q('null-identity drafts remaining (should be recent-only)', `
  SELECT count(*) FROM vendor_registration_drafts WHERE identity_key IS NULL
`);
await q('dupes remaining (should be 0)', `
  SELECT identity_key, count(*) FROM vendor_registration_drafts
  WHERE identity_key IS NOT NULL
  GROUP BY identity_key HAVING count(*) > 1
  LIMIT 5
`);
await q('cron jobs scheduled', `SELECT jobid, jobname, schedule FROM cron.job WHERE jobname LIKE '%vendor%'`);
await q('snapshots RLS policies', `
  SELECT policyname, cmd FROM pg_policies
  WHERE schemaname='public' AND tablename='vendor_submission_snapshots'
`);
await client.end();
