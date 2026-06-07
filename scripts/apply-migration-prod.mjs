// Guarded controlled-apply of a SINGLE migration file via the Supabase Management
// API. Used for the native-auth cutover (D -> B -> C), one migration at a time.
// NEVER `db push`. Double-gated: requires both an explicit file argument AND
// CONFIRM=APPLY to execute. Without CONFIRM it prints a dry preview and exits.
//
// Usage:
//   # dry preview (no write):
//   SUPABASE_ACCESS_TOKEN=sbp_... PROJECT_REF=akcpkjzfhtmurtwzyzhn \
//     node scripts/apply-migration-prod.mjs supabase/migrations/<file>.sql
//   # execute (writes to the target project):
//   CONFIRM=APPLY SUPABASE_ACCESS_TOKEN=sbp_... PROJECT_REF=akcpkjzfhtmurtwzyzhn \
//     node scripts/apply-migration-prod.mjs supabase/migrations/<file>.sql

import { readFileSync } from 'node:fs';

const file = process.argv[2];
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.PROJECT_REF;
const CONFIRM = process.env.CONFIRM;
if (!file) { console.error('Pass a migration file path as the first argument.'); process.exit(2); }
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN.'); process.exit(2); }
if (!REF) { console.error('Set PROJECT_REF (explicit — no default).'); process.exit(2); }

const sql = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const lines = sql.split('\n');

console.log(`\nController: apply migration (controlled, single file)`);
console.log(`  target project : ${REF}`);
console.log(`  migration file : ${file}`);
console.log(`  SQL size       : ${sql.length} bytes, ${lines.length} lines`);
console.log(`  first SQL line : ${lines.find((l) => l.trim() && !l.trim().startsWith('--')) || '(none)'}`);

if (CONFIRM !== 'APPLY') {
  console.log('\n  DRY PREVIEW — nothing executed. Set CONFIRM=APPLY to run against the target.');
  process.exit(0);
}

async function run() {
  let last;
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      const body = await r.text();
      return { status: r.status, body };
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 800 * i)); }
  }
  throw last;
}

console.log(`\n  EXECUTING against ${REF} ...`);
const { status, body } = await run();
console.log(`  HTTP ${status}`);
console.log(`  ${body.slice(0, 500)}`);
process.exit(status >= 200 && status < 300 ? 0 : 1);
