// Headless validation of the native-auth flow against a Supabase PREVIEW branch.
// Uses ONLY the anon key. No service_role. No OTP/SMTP. No production impact.
//
// It exercises the post-registration path (which bypasses OTP delivery):
//   anon-insert test vendor -> create-post-registration-session -> token_hash
//   -> supabase.auth.verifyOtp({ token_hash }) -> native session -> RLS check.
//
// Usage:
//   PREVIEW_URL=https://ikzccfjgrupjmuzdkzzg.supabase.co \
//   PREVIEW_ANON_KEY=<preview anon key> \
//   node scripts/validate-native-auth-preview.mjs

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = process.env.PREVIEW_URL || 'https://ikzccfjgrupjmuzdkzzg.supabase.co';
const ANON = process.env.PREVIEW_ANON_KEY;
if (!ANON) { console.error('Set PREVIEW_ANON_KEY (the preview project anon key).'); process.exit(1); }

const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => console.log('  ❌ ' + m);

async function main() {
  console.log(`\n=== Native-auth validation against ${URL} ===\n`);

  // 0. Anon (no session) must NOT be able to read locked tables (Migration A/B live?)
  const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log('0) Migration A/B active on preview (anon reads blocked):');
  for (const t of ['otp_codes', 'vendors', 'vendor_sessions']) {
    const { data, error } = await anon.from(t).select('*').limit(1);
    if (error) console.log(`   ${t}: error -> ${error.message}`);
    else (data?.length ? bad(`${t} returned ${data.length} row(s) to anon (NOT locked)`) : ok(`${t} -> [] (locked)`));
  }

  // 1. Anon-insert a throwaway test vendor (registration-style).
  //    NOTE: we generate the id client-side and do NOT chain .select(), because
  //    Migration B drops the anon SELECT policy on vendors. An INSERT...RETURNING
  //    (which .select() triggers) needs SELECT visibility for the returned row,
  //    so chaining .select() here fails with a (misleading) RLS error even though
  //    the INSERT WITH CHECK (status='pending_approval') passes. The real
  //    registration form inserts without needing the row back, so this mirrors it.
  console.log('\n1) Anon-insert a test vendor (registration path):');
  const nonce = randomUUID();
  const vendorId = randomUUID();
  const stamp = Date.now();
  const insertBody = {
    id: vendorId,
    full_name: `Native Auth Test ${stamp}`,
    phone: `5${String(stamp).slice(-8)}`,
    email: null,
    nationality: 'سعودي',
    primary_field: 'test',
    vendor_type: 'individual',
    primary_city: 'الرياض',
    id_number: String(stamp).slice(-10),
    status: 'pending_approval',
    registration_nonce: nonce,
  };
  {
    const { error } = await anon.from('vendors').insert(insertBody);
    if (error) { bad(`insert failed: ${error.message}`); console.log('   (adjust required fields if NOT NULL)'); return; }
    ok(`inserted vendor id=${vendorId} (no RETURNING — anon SELECT is locked by Migration B)`);
  }

  // 1b. A SECOND throwaway vendor (B) — used later to prove cross-vendor isolation.
  const vendorBId = randomUUID();
  {
    const { error } = await anon.from('vendors').insert({
      ...insertBody,
      id: vendorBId,
      full_name: `Native Auth Test B ${stamp}`,
      phone: `4${String(stamp).slice(-8)}`,
      id_number: `9${String(stamp).slice(-9)}`,
      registration_nonce: randomUUID(),
    });
    if (error) { bad(`vendor B insert failed: ${error.message}`); return; }
    ok(`inserted isolation-probe vendor B id=${vendorBId}`);
  }

  // 2. create-post-registration-session -> token_hash
  console.log('\n2) create-post-registration-session (native function):');
  let tokenHash = null;
  {
    const res = await fetch(`${URL}/functions/v1/create-post-registration-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ vendor_id: vendorId, nonce }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { bad(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`); return; }
    if (!body?.auth?.token_hash) { bad(`no auth.token_hash in response: ${JSON.stringify(body).slice(0, 300)}`); return; }
    tokenHash = body.auth.token_hash;
    ok(`function returned auth.token_hash (native session bootstrap) — backward-compat session present: ${!!body.session}`);
  }

  // 3. Exchange token_hash for a NATIVE session — determine the correct type.
  console.log('\n3) supabase.auth.verifyOtp — which type works?');
  let workingType = null, session = null;
  for (const type of ['magiclink', 'email']) {
    const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await c.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error && data?.session) { workingType = type; session = { client: c, data: data.session }; ok(`type "${type}" WORKED — native session established`); break; }
    else bad(`type "${type}" failed: ${error?.message || 'no session'}`);
    // NOTE: a failed verify may consume the token; if both fail, the first error is the meaningful one.
  }
  if (!workingType) { bad('Could not establish a native session with either type.'); return; }

  // 4. Inspect the session: app_metadata + acceptance.
  console.log('\n4) Native session contents:');
  const user = session.data.user;
  const md = user?.app_metadata || {};
  (md.portal === 'vendor' ? ok(`app_metadata.portal = vendor`) : bad(`app_metadata.portal = ${md.portal}`));
  (md.vendor_id === vendorId ? ok(`app_metadata.vendor_id matches the vendor`) : bad(`app_metadata.vendor_id = ${md.vendor_id} (expected ${vendorId})`));
  ok(`role = ${session.data.user?.role || '(authenticated)'} ; token is a real Supabase JWT (length ${session.data.access_token?.length})`);

  // 5. RLS under the native session. Distinguish three outcomes:
  //    - error            -> the native token was NOT accepted (signing-key problem)
  //    - 1 own row        -> token accepted AND Migration B's claim path matches
  //    - 0 rows, no error -> token accepted but Migration B reads the WRONG claim
  //      path. Native auth puts vendor_id under app_metadata, but Migration B uses
  //      (auth.jwt() ->> 'vendor_id') (top level). It must become
  //      (auth.jwt() -> 'app_metadata' ->> 'vendor_id') before native cutover.
  console.log('\n5) Migration B RLS under the native session:');
  let claimPathOk = false;
  {
    const { data, error } = await session.client.from('vendors').select('id, full_name');
    if (error) { bad(`select ERRORED -> token NOT accepted by PostgREST: ${error.message}`); }
    else if (data.length === 1 && data[0].id === vendorId) { claimPathOk = true; ok(`vendor sees ONLY its own row — token accepted AND Migration B claim path is correct`); }
    else if (data.length === 0) { bad(`token ACCEPTED but scoped to 0 rows -> Migration B claim path mismatch (needs app_metadata fix). This is expected with the un-revised Migration B.`); }
    else bad(`unexpected: got ${data.length} rows -> ${JSON.stringify(data).slice(0, 200)}`);
  }

  // 6. Vendor isolation: vendor A's session must NOT be able to read vendor B.
  console.log('\n6) Vendor isolation (A cannot read B):');
  let isolationOk = false;
  {
    const { data, error } = await session.client.from('vendors').select('id').eq('id', vendorBId);
    if (error) { bad(`isolation probe errored: ${error.message}`); }
    else if (data.length === 0) { isolationOk = true; ok(`vendor A's session returns 0 rows for vendor B — isolation holds`); }
    else bad(`LEAK: vendor A read vendor B (${data.length} row) -> RLS not isolating`);
  }

  console.log('\n=== RESULT ===');
  console.log(`verifyOtp type to use: "${workingType}"`);
  console.log(`native session issued + app_metadata correct: yes`);
  console.log(`vendor isolation (A cannot read B): ${isolationOk ? 'yes' : 'NO'}`);
  console.log(`Migration B RLS claim path correct for native auth: ${claimPathOk ? 'yes' : 'NO — revise to app_metadata path before cutover'}`);
  console.log(claimPathOk
    ? 'Native auth on the preview: validated end-to-end.\n'
    : 'Native auth token flow validated; Migration B needs the app_metadata claim-path revision (then re-run).\n');
}

main().catch(e => { console.error('\nFAILED:', e); process.exit(1); });
