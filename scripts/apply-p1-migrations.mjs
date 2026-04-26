// One-off migration runner for the two P1 foundation migrations.
// Reads each .sql file and executes it as a single query.
// Usage:  node scripts/apply-p1-migrations.mjs

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Client } = pg;

const CONN = process.env.DATABASE_URL;
if (!CONN) {
  console.error('DATABASE_URL env var required');
  process.exit(1);
}

const files = [
  'supabase/migrations/20260422190000_add_approval_log_flags_and_snapshots.sql',
  'supabase/migrations/20260422190500_drafts_health_hardening.sql',
];

const client = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('connected');

for (const rel of files) {
  const abs = path.resolve(rel);
  const sql = fs.readFileSync(abs, 'utf8');
  process.stdout.write(`applying ${rel} … `);
  try {
    await client.query(sql);
    console.log('ok');
  } catch (e) {
    console.log('FAIL');
    console.error(e);
    process.exitCode = 1;
  }
}

await client.end();
console.log('done');
