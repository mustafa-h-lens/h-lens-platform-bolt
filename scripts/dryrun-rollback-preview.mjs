// PREVIEW-ONLY dry-run of the Migration C and D fail-closed rollback scripts.
//
// For each of C and D it: (1) confirms the migration is applied, (2) applies the
// committed DOWN script and verifies the fail-closed effect (object removed, no
// leak reopened), (3) RE-APPLIES the committed migration to restore the preview
// to its validated state, and verifies restoration.
//
// Uses the Management API against the PREVIEW project only. Never production.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_<preview> PROJECT_REF=ikzccfjgrupjmuzdkzzg \
//   node scripts/dryrun-rollback-preview.mjs

import { readFileSync } from 'node:fs';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.PROJECT_REF || 'ikzccfjgrupjmuzdkzzg';
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN (preview)'); process.exit(1); }
if (REF === 'akcpkjzfhtmurtwzyzhn') { console.error('REFUSING: this is the PRODUCTION ref. Preview only.'); process.exit(2); }

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const file = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

async function q(query) {
  let last;
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
        method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
      return j;
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 700 * i)); }
  }
  throw last;
}
const n = (rows) => (rows?.[0] ? Object.values(rows[0])[0] : null);

const C_MIG = 'supabase/migrations/20260601000200_security_lockdown_c_private_buckets.sql';
const C_DOWN = 'supabase/rollback/20260601000200_security_lockdown_c_DOWN.sql';
const D_MIG = 'supabase/migrations/20260601000300_security_lockdown_d_drafts_and_otp.sql';
const D_DOWN = 'supabase/rollback/20260601000300_security_lockdown_d_DOWN.sql';

const cPolicy = async () => n(await q(`select count(*)::int from pg_policies where schemaname='storage' and tablename='objects' and policyname='private_buckets_authenticated_read';`));
const cPublic = async () => (await q(`select count(*)::int n from storage.buckets where id in ('vendor-images','project-files','client-documents') and public=true;`))[0].n;
const dFuncs = async () => n(await q(`select count(*)::int from pg_proc where proname in ('get_vendor_draft','save_vendor_draft','delete_vendor_draft','increment_otp_failed_attempts');`));
const dDraftPol = async () => n(await q(`select count(*)::int from pg_policies where schemaname='public' and tablename='vendor_registration_drafts';`));

async function main() {
  console.log(`\n=== Rollback DRY-RUN on PREVIEW ${REF} ===\n`);

  // ── Migration C ──
  console.log('— Migration C rollback —');
  check('pre: C applied (policy present)', (await cPolicy()) === 1);
  check('pre: buckets private (0 public)', (await cPublic()) === 0);

  await q(file(C_DOWN));
  check('after DOWN: private_buckets_authenticated_read removed', (await cPolicy()) === 0);
  check('after DOWN: buckets STILL private (fail-closed, no reopen)', (await cPublic()) === 0);

  await q(file(C_MIG)); // restore
  check('after re-apply C: policy restored', (await cPolicy()) === 1);
  check('after re-apply C: buckets private', (await cPublic()) === 0);

  // ── Migration D ──
  console.log('\n— Migration D rollback —');
  check('pre: D applied (4 functions present)', (await dFuncs()) === 4);
  check('pre: drafts locked (0 policies)', (await dDraftPol()) === 0);

  await q(file(D_DOWN));
  check('after DOWN: 4 D functions removed', (await dFuncs()) === 0);
  check('after DOWN: drafts STILL locked (fail-closed, no reopen)', (await dDraftPol()) === 0);

  await q(file(D_MIG)); // restore
  check('after re-apply D: 4 functions restored', (await dFuncs()) === 4);
  check('after re-apply D: drafts locked', (await dDraftPol()) === 0);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n=== SUMMARY ===`);
  console.log(`PASS ${pass} / ${results.length}${fail ? `   ❌ FAIL ${fail}` : '   ✅ all green — preview restored to validated state'}`);
  if (fail) { console.log('Failed:'); results.filter((r) => !r.ok).forEach((r) => console.log('  - ' + r.name)); }
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('\nFATAL:', e.message, '\n⚠️ preview may be mid-rollback — re-apply C/D migrations to restore.'); process.exit(1); });
