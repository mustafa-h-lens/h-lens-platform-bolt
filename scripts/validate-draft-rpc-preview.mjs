// Preview validation of the registration draft-RPC flow (Migration D) + the
// duplicate-check RPC (Migration B) — the path the native frontend depends on
// that the smoke harness does NOT exercise.
//
// RPCs covered (all anon-callable SECURITY DEFINER):
//   save_vendor_draft / get_vendor_draft / delete_vendor_draft   (Migration D)
//   vendor_registration_check                                    (Migration B)
//
// Core test is ANON-ONLY (browser-equivalent). An optional preview access token
// (PREVIEW_ACCESS_TOKEN + PREVIEW_PROJECT_REF) is used ONLY to delete the one
// throwaway vendor seeded for the positive duplicate-check. PREVIEW ONLY.
//
// Usage:
//   PREVIEW_URL=https://ikzccfjgrupjmuzdkzzg.supabase.co PREVIEW_ANON_KEY=<anon> \
//   [PREVIEW_ACCESS_TOKEN=sbp_... PREVIEW_PROJECT_REF=ikzccfjgrupjmuzdkzzg] \
//   node scripts/validate-draft-rpc-preview.mjs

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = process.env.PREVIEW_URL || 'https://ikzccfjgrupjmuzdkzzg.supabase.co';
const ANON = process.env.PREVIEW_ANON_KEY;
const TOKEN = process.env.PREVIEW_ACCESS_TOKEN;
const REF = process.env.PREVIEW_PROJECT_REF || 'ikzccfjgrupjmuzdkzzg';
if (!ANON) { console.error('Set PREVIEW_ANON_KEY'); process.exit(1); }

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const sqlLit = (s) => `'${String(s).replace(/'/g, "''")}'`;
async function runSql(query) {
  if (!TOKEN) return null;
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`Mgmt SQL ${r.status}`);
  return r.json();
}

const stamp = Date.now();
const sessionId = `draft-${randomUUID()}`;          // >= 8 chars (save_vendor_draft requires it)
const otherSession = `draft-${randomUUID()}`;
const vendorId = randomUUID();
const phone = `50${String(stamp).slice(-7)}`;
const formData = { full_name: `Draft RPC Test ${stamp}`, phone, primary_field: 'test', step_marker: stamp };

async function main() {
  console.log(`\n=== Draft-RPC preview validation against ${URL} ===\n`);

  // 1. save_vendor_draft (D)
  console.log('1) save_vendor_draft / get_vendor_draft (D):');
  {
    const { error } = await anon.rpc('save_vendor_draft', { p_session_id: sessionId, p_form_data: formData, p_current_step: 2, p_phone: phone });
    check('save_vendor_draft executes (no error)', !error, error?.message || '');
  }
  // 2. get_vendor_draft round-trips
  {
    const { data, error } = await anon.rpc('get_vendor_draft', { p_session_id: sessionId });
    const row = Array.isArray(data) ? data[0] : data;
    check('get_vendor_draft returns the saved draft', !error && row && row.current_step === 2 && row.form_data?.step_marker === stamp,
      error?.message || `current_step=${row?.current_step}`);
  }
  // 3. session isolation — a different session id sees nothing
  {
    const { data, error } = await anon.rpc('get_vendor_draft', { p_session_id: otherSession });
    const empty = !error && (!data || (Array.isArray(data) && data.length === 0));
    check('get_vendor_draft isolates by session id (other session → empty)', empty, error?.message || `rows=${Array.isArray(data) ? data.length : '?'}`);
  }

  // 4. vendor_registration_check (B) — negative then positive
  console.log('\n2) vendor_registration_check (B):');
  {
    const { data, error } = await anon.rpc('vendor_registration_check', { p_email: `none-${stamp}@none.invalid`, p_phone: `59${String(stamp).slice(-7)}`, p_id_number: `9${String(stamp).slice(-9)}` });
    const row = Array.isArray(data) ? data[0] : data;
    check('vendor_registration_check: no conflict for fresh values', !error && (!row || row.conflict_field === null), error?.message || `conflict=${row?.conflict_field}`);
  }
  // seed a throwaway vendor (anon insert, no RETURNING) to assert a positive phone conflict
  {
    const { error } = await anon.from('vendors').insert({
      id: vendorId, full_name: formData.full_name, phone, email: null, nationality: 'سعودي',
      primary_field: 'test', vendor_type: 'individual', primary_city: 'الرياض',
      id_number: String(stamp).slice(-10), status: 'pending_approval', registration_nonce: randomUUID(),
    });
    if (error) check('seed throwaway vendor for conflict test', false, error.message);
    else {
      const { data, error: e2 } = await anon.rpc('vendor_registration_check', { p_phone: phone });
      const row = Array.isArray(data) ? data[0] : data;
      check('vendor_registration_check: detects existing phone conflict', !e2 && row?.conflict_field === 'phone', e2?.message || `conflict=${row?.conflict_field}`);
    }
  }

  // 5. delete_vendor_draft (D) — then confirm it's gone
  console.log('\n3) delete_vendor_draft (D):');
  {
    const { error } = await anon.rpc('delete_vendor_draft', { p_session_id: sessionId });
    check('delete_vendor_draft executes (no error)', !error, error?.message || '');
    const { data } = await anon.rpc('get_vendor_draft', { p_session_id: sessionId });
    const gone = !data || (Array.isArray(data) && data.length === 0);
    check('draft is gone after delete', gone, `rows=${Array.isArray(data) ? data.length : '?'}`);
  }

  // 6. optional cleanup of the throwaway vendor (preview only; token optional)
  if (TOKEN) {
    try { await runSql(`delete from public.vendors where id = ${sqlLit(vendorId)};`); console.log('\n  · cleaned throwaway vendor via Management API'); }
    catch (e) { console.log(`\n  ⚠️ vendor cleanup skipped: ${e.message}`); }
  } else {
    console.log(`\n  · note: throwaway vendor ${vendorId} left on preview (anon cannot delete; set PREVIEW_ACCESS_TOKEN to auto-clean)`);
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n=== SUMMARY ===`);
  console.log(`PASS ${pass} / ${results.length}${fail ? `   ❌ FAIL ${fail}` : '   ✅ all green'}`);
  if (fail) { console.log('Failed:'); results.filter((r) => !r.ok).forEach((r) => console.log('  - ' + r.name)); }
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
