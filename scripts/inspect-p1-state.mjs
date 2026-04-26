import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const q = async (label, sql) => {
  const r = await client.query(sql);
  console.log(`\n=== ${label} ===`);
  r.rows.forEach(row => console.log(row));
};
await q('approval_log.flags exists?', `
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='vendor_approval_log' AND column_name='flags'
`);
await q('snapshots table exists?', `
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name='vendor_submission_snapshots'
`);
await q('drafts.identity_key exists?', `
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='vendor_registration_drafts' AND column_name='identity_key'
`);
await q('current delete fn signature', `
  SELECT proname, pg_get_function_result(oid) as returns
  FROM pg_proc WHERE proname='delete_expired_vendor_drafts'
`);
await q('cron extension available?', `
  SELECT extname FROM pg_extension WHERE extname='pg_cron'
`);
await client.end();
