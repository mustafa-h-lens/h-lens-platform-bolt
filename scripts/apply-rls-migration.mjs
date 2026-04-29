// Apply a single SQL file to Supabase via the Management API.
// Usage: MGMT_TOKEN=... node scripts/apply-rls-migration.mjs <sql-file>
import fs from 'fs';
import path from 'path';

const token = process.env.MGMT_TOKEN;
const projectRef = process.env.PROJECT_REF;
const sqlPath = process.argv[2];

if (!token || !projectRef || !sqlPath) {
  console.error('Usage: MGMT_TOKEN=... PROJECT_REF=... node apply-rls-migration.mjs <file.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(sqlPath), 'utf8');

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  },
);

const body = await res.text();
console.log('Status:', res.status);
console.log('Body:', body);
if (!res.ok) process.exit(1);
