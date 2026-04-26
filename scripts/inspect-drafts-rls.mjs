import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const q = async (label, sql) => {
  const r = await client.query(sql);
  console.log(`\n=== ${label} ===`);
  r.rows.forEach(row => console.log(row));
};
await q('drafts RLS policies', `
  SELECT policyname, cmd, roles, qual, with_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename='vendor_registration_drafts'
`);
await q('drafts indexes', `
  SELECT indexname, indexdef FROM pg_indexes
  WHERE schemaname='public' AND tablename='vendor_registration_drafts'
`);
await client.end();
