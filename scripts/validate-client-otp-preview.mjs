// Live CLIENT-portal OTP validation against a Supabase PREVIEW branch.
//
// Closes the one gap the anon-only vendor test could not reach: the verify-otp
// *client* branch end-to-end (OTP check -> issuePortalSession('client') ->
// native session -> Migration B client RLS -> tenant isolation).
//
// Why it needs an access token: post-Migration-A, otp_codes is locked to anon,
// so a valid code can only be SEEDED with elevated access. This script uses the
// Supabase Management API (a PERSONAL ACCESS TOKEN, sbp_...) ONLY to seed/clean
// throwaway test rows on the PREVIEW project. It never uses service_role and
// never touches production. The actual auth flow (verify-otp + verifyOtp) is
// exercised with the ANON key, exactly like a real browser.
//
// SAFETY: use a FRESH, rotatable token. Do NOT reuse a burned token. The script
// cleans up every row it creates (finally block).
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_FRESH \
//   PROJECT_REF=ikzccfjgrupjmuzdkzzg \
//   PREVIEW_URL=https://ikzccfjgrupjmuzdkzzg.supabase.co \
//   PREVIEW_ANON_KEY=<preview anon key> \
//   node scripts/validate-client-otp-preview.mjs

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF   = process.env.PROJECT_REF   || 'ikzccfjgrupjmuzdkzzg';
const URL   = process.env.PREVIEW_URL   || `https://${REF}.supabase.co`;
const ANON  = process.env.PREVIEW_ANON_KEY;
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN (a FRESH sbp_ token — never a burned one).'); process.exit(1); }
if (!ANON)  { console.error('Set PREVIEW_ANON_KEY.'); process.exit(1); }

const ok  = (m) => console.log('  ✅ ' + m);
const bad = (m) => { console.log('  ❌ ' + m); failed = true; };
let failed = false;

const sqlLit = (s) => `'${String(s).replace(/'/g, "''")}'`;
async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mgmt SQL ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body; // array of rows
}

const stamp = Date.now();
const clientA = randomUUID();
const clientB = randomUUID();
const phoneA  = `5${String(stamp).slice(-8)}`;     // Saudi 9-digit
const phoneB  = `4${String(stamp).slice(-8)}`;
const code    = '654321';
const expISO  = new Date(stamp + 10 * 60 * 1000).toISOString();
const synthEmailA = `c-${clientA}@portal.h-lens.co`;
let projectA = null;

async function main() {
  console.log(`\n=== CLIENT-portal OTP validation against ${URL} ===\n`);

  // SEED (Management API — throwaway rows on the preview only) -----------------
  console.log('Seeding throwaway client rows + OTP (Management API):');
  await runSql(`insert into public.clients (id, name, phone, invitation_status)
                values (${sqlLit(clientA)}, ${sqlLit('Client OTP Test A ' + stamp)}, ${sqlLit(phoneA)}, 'pending'),
                       (${sqlLit(clientB)}, ${sqlLit('Client OTP Test B ' + stamp)}, ${sqlLit(phoneB)}, 'pending');`);
  ok(`clients A=${clientA} B=${clientB}`);

  // Best-effort: a project for A (needs a created_by user). Skipped if no users.
  try {
    const users = await runSql(`select id from public.users limit 1;`);
    const uid = users?.[0]?.id;
    if (uid) {
      const pid = randomUUID();
      await runSql(`insert into public.projects (id, client_id, name, created_by)
                    values (${sqlLit(pid)}, ${sqlLit(clientA)}, ${sqlLit('OTP Test Project ' + stamp)}, ${sqlLit(uid)});`);
      projectA = pid; ok(`seeded project ${pid} for client A (positive RLS check enabled)`);
    } else { console.log('  ℹ️ no users row — skipping project seed (clients-only scoping check)'); }
  } catch (e) { console.log(`  ℹ️ project seed skipped: ${e.message.slice(0, 120)}`); }

  await runSql(`insert into public.otp_codes (phone, code, expires_at, used, failed_attempts)
                values (${sqlLit(phoneA)}, ${sqlLit(code)}, ${sqlLit(expISO)}, false, 0);`);
  ok(`otp_codes seeded for phone A (code ${code})`);

  // 1. verify-otp (client branch) ---------------------------------------------
  console.log('\n1) verify-otp portal_type=client (native function):');
  let tokenHash = null;
  {
    const res = await fetch(`${URL}/functions/v1/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ phone: phoneA, code, portal_type: 'client' }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { bad(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`); return; }
    if (body?.portal_type !== 'client') bad(`portal_type = ${body?.portal_type} (expected client)`);
    if (!body?.auth?.token_hash) { bad(`no auth.token_hash: ${JSON.stringify(body).slice(0, 300)}`); return; }
    tokenHash = body.auth.token_hash;
    ok(`returned auth.token_hash; client.id=${body.client?.id} (matches A: ${body.client?.id === clientA})`);
  }

  // 2. Exchange token_hash -> native session (magiclink) ----------------------
  console.log('\n2) supabase.auth.verifyOtp({ type: "magiclink" }):');
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: vo, error: voErr } = await c.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (voErr || !vo?.session) { bad(`verifyOtp failed: ${voErr?.message || 'no session'}`); return; }
  ok('native session established');

  // 3. Session contents --------------------------------------------------------
  console.log('\n3) Native session contents:');
  const md = vo.session.user?.app_metadata || {};
  (md.portal === 'client' ? ok('app_metadata.portal = client') : bad(`app_metadata.portal = ${md.portal}`));
  (md.client_id === clientA ? ok('app_metadata.client_id matches client A') : bad(`app_metadata.client_id = ${md.client_id}`));

  // 4. Migration B client RLS + isolation -------------------------------------
  console.log('\n4) Migration B client RLS + isolation:');
  {
    const { data, error } = await c.from('clients').select('id');
    if (error) bad(`clients select errored (token not accepted?): ${error.message}`);
    else if (data.length === 1 && data[0].id === clientA) ok('client A sees ONLY its own client row');
    else bad(`expected only A, got ${JSON.stringify(data).slice(0, 200)}`);
  }
  {
    const { data } = await c.from('clients').select('id').eq('id', clientB);
    (data && data.length === 0) ? ok('client A cannot read client B (isolation holds)') : bad(`LEAK: A read B -> ${JSON.stringify(data)}`);
  }
  if (projectA) {
    const { data } = await c.from('projects').select('id, client_id');
    const ownOnly = (data || []).length >= 1 && (data || []).every((p) => p.client_id === clientA);
    ownOnly ? ok(`projects scoped to client A only (${data.length} row[s])`) : bad(`projects not scoped: ${JSON.stringify(data).slice(0, 200)}`);
  }

  console.log('\n=== RESULT ===');
  console.log(failed ? 'CLIENT OTP path: FAILURES above.' : 'CLIENT OTP path: validated end-to-end (verify-otp client branch + native session + RLS + isolation).');
}

async function cleanup() {
  console.log('\nCleanup (Management API):');
  try {
    if (projectA) await runSql(`delete from public.projects where id = ${sqlLit(projectA)};`);
    await runSql(`delete from public.otp_codes where phone in (${sqlLit(phoneA)});`);
    await runSql(`delete from public.client_sessions where client_id in (${sqlLit(clientA)}, ${sqlLit(clientB)});`);
    await runSql(`delete from public.clients where id in (${sqlLit(clientA)}, ${sqlLit(clientB)});`);
    await runSql(`delete from auth.users where email = ${sqlLit(synthEmailA)};`);
    console.log('  ✅ throwaway rows removed');
  } catch (e) { console.log(`  ⚠️ cleanup issue (remove manually): ${e.message.slice(0, 200)}`); }
}

main()
  .catch((e) => { console.error('\nFAILED:', e.message); failed = true; })
  .finally(async () => { await cleanup(); process.exit(failed ? 1 : 0); });
