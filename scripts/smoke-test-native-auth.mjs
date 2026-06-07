// ============================================================================
// Native-auth smoke test — runnable PASS/FAIL harness for vendor + client portals
// ============================================================================
// Works against PREVIEW or PRODUCTION via env vars. Two layers:
//
//   PHASE A (always, READ-ONLY + zero writes — safe on production):
//     - anon cannot read sensitive tables (Migration A/B lockdown active)
//     - verify-otp / create-post-registration-session are DEPLOYED + reachable
//       (probed with random, non-matching identifiers so NOTHING is written:
//        no otp row matches -> no failed_attempts increment -> no mutation)
//     - input validation (400s) behaves
//
//   PHASE B (only when SMOKE_TEST_MODE=1 — seeds + cleans throwaway test data):
//     - vendor registration auto-login + OTP login -> native session -> RLS -> isolation
//     - client OTP login -> native session -> RLS -> isolation -> project scoping
//     Requires SMOKE_ACCESS_TOKEN (sbp_) + SMOKE_PROJECT_REF for Management-API
//     seeding/cleanup. Every row it touches is one it created (tagged by random
//     UUID); it never reads, mutates, or deletes pre-existing rows.
//
// SAFETY: without SMOKE_TEST_MODE=1 the script performs NO writes of any kind,
// so it is safe to run against production. Phase B refuses to run unless test
// mode is explicitly enabled AND a token + ref are supplied.
//
// Usage (preview, full):
//   SMOKE_URL=https://ikzccfjgrupjmuzdkzzg.supabase.co SMOKE_ANON_KEY=<anon> \
//   SMOKE_TEST_MODE=1 SMOKE_ACCESS_TOKEN=sbp_... SMOKE_PROJECT_REF=ikzccfjgrupjmuzdkzzg \
//   node scripts/smoke-test-native-auth.mjs
//
// Usage (production, safe read-only — DEFAULT, no test mode):
//   SMOKE_URL=https://akcpkjzfhtmurtwzyzhn.supabase.co SMOKE_ANON_KEY=<prod anon> \
//   node scripts/smoke-test-native-auth.mjs
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL  = process.env.SMOKE_URL;
const ANON = process.env.SMOKE_ANON_KEY;
const TEST_MODE = process.env.SMOKE_TEST_MODE === '1';
const TOKEN = process.env.SMOKE_ACCESS_TOKEN;
const REF   = process.env.SMOKE_PROJECT_REF;
if (!URL || !ANON) { console.error('Required: SMOKE_URL and SMOKE_ANON_KEY'); process.exit(2); }
if (TEST_MODE && (!TOKEN || !REF)) { console.error('SMOKE_TEST_MODE=1 also requires SMOKE_ACCESS_TOKEN and SMOKE_PROJECT_REF'); process.exit(2); }

// ── result tracking ────────────────────────────────────────────────────────
const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed: !!passed });
  console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
function info(m) { console.log('  · ' + m); }

// ── Management API (Phase B only) ───────────────────────────────────────────
const sqlLit = (s) => `'${String(s).replace(/'/g, "''")}'`;
async function runSql(query) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Mgmt SQL ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
      return body;
    } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 500 * attempt)); }
  }
  throw lastErr;
}
async function fn(path, payload) {
  const res = await fetch(`${URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const anon = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

// ── PHASE A — safe, no writes ───────────────────────────────────────────────
async function phaseA() {
  console.log('\n── PHASE A · safe checks (read-only, no writes) ──');

  // A1: anon cannot read sensitive tables
  const a = anon();
  for (const t of ['vendors', 'clients', 'otp_codes', 'vendor_sessions', 'client_sessions']) {
    const { data, error } = await a.from(t).select('*').limit(1);
    // Locked = RLS returns [] (PostgREST) OR an explicit error. A non-empty read is a leak.
    check(`anon cannot read ${t}`, error ? true : (data?.length ?? 0) === 0,
      error ? `error: ${error.message.slice(0, 60)}` : `rows: ${data?.length ?? 0}`);
  }

  // A2: edge functions deployed + reachable. Random synthetic email that cannot
  // match any real OTP -> verify-otp finds no row -> returns 401, writes nothing.
  const probeEmail = `smoke-${randomUUID()}@smoke.invalid`;
  for (const portal of ['vendor', 'client']) {
    const r = await fn('verify-otp', { email: probeEmail, code: '000000', portal_type: portal });
    // 401 = deployed & reached the OTP lookup (no match). 404 = NOT deployed. 500 = broken.
    check(`verify-otp deployed/reachable (${portal})`, r.status === 401,
      `HTTP ${r.status}${r.status === 404 ? ' (NOT DEPLOYED)' : ''}`);
  }

  // A3: input validation — missing/short code -> 400 (no DB work)
  {
    const r = await fn('verify-otp', { email: probeEmail, portal_type: 'vendor' }); // no code
    check('verify-otp rejects missing code (400)', r.status === 400, `HTTP ${r.status}`);
  }

  // A4: create-post-registration-session deployed — bad body -> 400, writes nothing
  {
    const r = await fn('create-post-registration-session', { vendor_id: 'not-a-uuid', nonce: 'x' });
    check('create-post-registration-session deployed/reachable', r.status === 400,
      `HTTP ${r.status}${r.status === 404 ? ' (NOT DEPLOYED)' : ''}`);
  }
}

// ── PHASE B — full flows (test mode only; self-seeding + self-cleaning) ──────
const stamp = Date.now();
const ids = {
  vendorA: randomUUID(), vendorB: randomUUID(),
  clientA: randomUUID(), clientB: randomUUID(),
  staff: randomUUID(), project: randomUUID(),
};
// Both must be valid Saudi mobiles (verify-otp requires /^5\d{8}$/), and distinct.
const phones = { vendorA: `50${String(stamp).slice(-7)}`, clientA: `55${String(stamp).slice(-7)}` };
const code = '654321';
const expISO = new Date(stamp + 10 * 60 * 1000).toISOString();
const synth = {
  vendorA: `v-${ids.vendorA}@portal.h-lens.co`,
  clientA: `c-${ids.clientA}@portal.h-lens.co`,
  staff: `smoke-staff-${stamp}@portal.h-lens.co`,
};

async function seedVendors() {
  const body = (id, name, phone) => ({
    id, full_name: name, phone, email: null, nationality: 'سعودي', primary_field: 'smoke',
    vendor_type: 'individual', primary_city: 'الرياض', id_number: String(stamp).slice(-10),
    status: 'pending_approval', registration_nonce: randomUUID(),
  });
  const a = anon();
  const nonceA = randomUUID();
  const va = { ...body(ids.vendorA, `Smoke Vendor A ${stamp}`, phones.vendorA), registration_nonce: nonceA };
  const { error: eA } = await a.from('vendors').insert(va);
  if (eA) throw new Error(`vendor A insert: ${eA.message}`);
  const { error: eB } = await a.from('vendors').insert(body(ids.vendorB, `Smoke Vendor B ${stamp}`, `3${String(stamp).slice(-8)}`));
  if (eB) throw new Error(`vendor B insert: ${eB.message}`);
  // OTP for vendor A login
  await runSql(`insert into public.otp_codes (phone, code, expires_at, used, failed_attempts)
                values (${sqlLit(phones.vendorA)}, ${sqlLit(code)}, ${sqlLit(expISO)}, false, 0);`);
  return nonceA;
}

async function seedClient() {
  await runSql(`insert into auth.users (id, email) values (${sqlLit(ids.staff)}, ${sqlLit(synth.staff)});`);
  await runSql(`insert into public.users (id, email, full_name, role)
                values (${sqlLit(ids.staff)}, ${sqlLit(synth.staff)}, 'Smoke Staff', 'super_admin');`);
  await runSql(`insert into public.clients (id, name, phone, invitation_status, created_by)
                values (${sqlLit(ids.clientA)}, ${sqlLit('Smoke Client A ' + stamp)}, ${sqlLit(phones.clientA)}, 'pending', ${sqlLit(ids.staff)}),
                       (${sqlLit(ids.clientB)}, ${sqlLit('Smoke Client B ' + stamp)}, ${sqlLit('2' + String(stamp).slice(-8))}, 'pending', ${sqlLit(ids.staff)});`);
  try {
    await runSql(`insert into public.projects (id, client_id, name, created_by)
                  values (${sqlLit(ids.project)}, ${sqlLit(ids.clientA)}, ${sqlLit('Smoke Project ' + stamp)}, ${sqlLit(ids.staff)});`);
  } catch (e) { info(`project seed skipped: ${e.message.slice(0, 80)}`); ids.project = null; }
  await runSql(`insert into public.otp_codes (phone, code, expires_at, used, failed_attempts)
                values (${sqlLit(phones.clientA)}, ${sqlLit(code)}, ${sqlLit(expISO)}, false, 0);`);
}

async function exchange(tokenHash) {
  const c = anon();
  const { data, error } = await c.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  return { c, session: data?.session, error };
}

async function phaseBVendor() {
  console.log('\n── PHASE B · vendor login / session / RLS ──');
  const nonceA = await seedVendors();
  info('seeded throwaway vendors A + B (+ OTP for A)');

  // Registration auto-login (create-post-registration-session)
  const reg = await fn('create-post-registration-session', { vendor_id: ids.vendorA, nonce: nonceA });
  check('vendor registration auto-login returns token_hash', reg.status === 200 && !!reg.body?.auth?.token_hash, `HTTP ${reg.status}`);
  if (reg.body?.auth?.token_hash) {
    const { c, session, error } = await exchange(reg.body.auth.token_hash);
    check('vendor reg-session exchanges to native session', !error && !!session, error?.message || '');
    if (session) {
      const md = session.user?.app_metadata || {};
      check('vendor session app_metadata.portal=vendor', md.portal === 'vendor', `portal=${md.portal}`);
      check('vendor session app_metadata.vendor_id=A', md.vendor_id === ids.vendorA);
      const own = await c.from('vendors').select('id');
      check('vendor RLS: sees only own row', !own.error && own.data?.length === 1 && own.data[0].id === ids.vendorA, `rows=${own.data?.length}`);
      const iso = await c.from('vendors').select('id').eq('id', ids.vendorB);
      check('vendor isolation: A cannot read B', !iso.error && (iso.data?.length ?? 0) === 0);
    }
  }

  // OTP login (verify-otp portal_type=vendor)
  const login = await fn('verify-otp', { phone: phones.vendorA, code, portal_type: 'vendor' });
  check('vendor OTP login returns token_hash', login.status === 200 && !!login.body?.auth?.token_hash, `HTTP ${login.status}`);
  if (login.body?.auth?.token_hash) {
    const { session, error } = await exchange(login.body.auth.token_hash);
    check('vendor OTP login -> native session (app_metadata.vendor_id)',
      !error && session?.user?.app_metadata?.vendor_id === ids.vendorA, error?.message || '');
  }
}

async function phaseBClient() {
  console.log('\n── PHASE B · client login / session / RLS ──');
  await seedClient();
  info('seeded throwaway clients A + B (+ project, + OTP for A)');

  const login = await fn('verify-otp', { phone: phones.clientA, code, portal_type: 'client' });
  check('client OTP login returns token_hash', login.status === 200 && !!login.body?.auth?.token_hash, `HTTP ${login.status}`);
  check('client login resolves correct client', login.body?.client?.id === ids.clientA);
  if (login.body?.auth?.token_hash) {
    const { c, session, error } = await exchange(login.body.auth.token_hash);
    check('client login -> native session', !error && !!session, error?.message || '');
    if (session) {
      const md = session.user?.app_metadata || {};
      check('client session app_metadata.portal=client', md.portal === 'client', `portal=${md.portal}`);
      check('client session app_metadata.client_id=A', md.client_id === ids.clientA);
      const own = await c.from('clients').select('id');
      check('client RLS: sees only own row', !own.error && own.data?.length === 1 && own.data[0].id === ids.clientA, `rows=${own.data?.length}`);
      const iso = await c.from('clients').select('id').eq('id', ids.clientB);
      check('client isolation: A cannot read B', !iso.error && (iso.data?.length ?? 0) === 0);
      if (ids.project) {
        const proj = await c.from('projects').select('id, client_id');
        check('client RLS: projects scoped to A', !proj.error && (proj.data?.length ?? 0) >= 1 && proj.data.every((p) => p.client_id === ids.clientA), `rows=${proj.data?.length}`);
      }
    }
  }
}

async function cleanup() {
  console.log('\n── cleanup (test data only) ──');
  try {
    if (ids.project) await runSql(`delete from public.projects where id = ${sqlLit(ids.project)};`);
    await runSql(`delete from public.otp_codes where phone in (${sqlLit(phones.vendorA)}, ${sqlLit(phones.clientA)});`);
    await runSql(`delete from public.vendor_sessions where vendor_id in (${sqlLit(ids.vendorA)}, ${sqlLit(ids.vendorB)});`);
    await runSql(`delete from public.client_sessions where client_id in (${sqlLit(ids.clientA)}, ${sqlLit(ids.clientB)});`);
    await runSql(`delete from public.vendors where id in (${sqlLit(ids.vendorA)}, ${sqlLit(ids.vendorB)});`);
    await runSql(`delete from public.clients where id in (${sqlLit(ids.clientA)}, ${sqlLit(ids.clientB)});`);
    await runSql(`delete from auth.users where email in (${sqlLit(synth.vendorA)}, ${sqlLit(synth.clientA)});`);
    await runSql(`delete from auth.users where id = ${sqlLit(ids.staff)};`); // cascades public.users
    console.log('  ✅ throwaway rows removed');
  } catch (e) { console.log(`  ⚠️ cleanup issue (remove manually by stamp ${stamp}): ${e.message.slice(0, 160)}`); }
}

// ── main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n=== Native-auth smoke test ===`);
  console.log(`Target : ${URL}`);
  console.log(`Mode   : ${TEST_MODE ? 'TEST MODE (Phase A + B; seeds + cleans throwaway data)' : 'SAFE read-only (Phase A only; no writes)'}`);
  if (!TEST_MODE) console.log('         (set SMOKE_TEST_MODE=1 + SMOKE_ACCESS_TOKEN + SMOKE_PROJECT_REF for full login/RLS coverage)');

  await phaseA();
  if (TEST_MODE) {
    try { await phaseBVendor(); } catch (e) { check('PHASE B vendor (setup)', false, e.message.slice(0, 160)); }
    try { await phaseBClient(); } catch (e) { check('PHASE B client (setup)', false, e.message.slice(0, 160)); }
    await cleanup();
  }

  const pass = results.filter((r) => r.passed).length;
  const fail = results.length - pass;
  console.log(`\n=== SUMMARY ===`);
  console.log(`PASS ${pass} / ${results.length}${fail ? `   ❌ FAIL ${fail}` : '   ✅ all green'}`);
  if (fail) { console.log('Failed:'); results.filter((r) => !r.passed).forEach((r) => console.log('  - ' + r.name)); }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
