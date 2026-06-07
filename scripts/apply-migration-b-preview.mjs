// Re-apply the (revised, app_metadata-claim) Migration B to the PREVIEW DB only.
// Uses the Supabase Management API with a personal access token (sbp_...), NOT
// service_role, NOT production. The migration is idempotent (DROP POLICY IF
// EXISTS / CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS), so re-running it simply
// replaces the portal RLS policies with the corrected claim path.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... PROJECT_REF=ikzccfjgrupjmuzdkzzg \
//        node scripts/apply-migration-b-preview.mjs

import { readFileSync } from 'node:fs';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.PROJECT_REF || 'ikzccfjgrupjmuzdkzzg';
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN'); process.exit(1); }

const sql = readFileSync(
  new URL('../supabase/migrations/20260601000100_security_lockdown_b_portal_jwt_rls.sql', import.meta.url),
  'utf8'
);

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const body = await res.text();
console.log(`HTTP ${res.status}`);
console.log(body.slice(0, 1000));
if (!res.ok) process.exit(1);
console.log('\nMigration B (app_metadata claim path) applied to preview', REF);
