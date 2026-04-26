import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const q = async (label, sql, params = []) => {
  const r = await client.query(sql, params);
  console.log(`\n=== ${label} ===`);
  r.rows.forEach(row => console.log(row));
};

await q('vendors columns', `
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='vendors'
  ORDER BY ordinal_position
`);

await q('duplicate draft identities', `
  SELECT
    COALESCE(NULLIF(lower(btrim(email)),''), NULLIF(btrim(phone),'')) AS identity_key,
    count(*) AS n
  FROM vendor_registration_drafts
  GROUP BY 1
  HAVING count(*) > 1
  ORDER BY n DESC
  LIMIT 20
`);

await q('existing approval_log columns', `
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='vendor_approval_log'
  ORDER BY ordinal_position
`);

await client.end();
