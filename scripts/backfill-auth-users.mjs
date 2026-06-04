// ============================================================================
// NATIVE AUTH — step 2: backfill Supabase Auth users for existing vendors/clients
// ============================================================================
// ADDITIVE & IDEMPOTENT. For each vendor/client that has no auth_user_id yet, it
// creates a Supabase Auth user (synthetic internal email + app_metadata carrying
// vendor_id/client_id) and stores that user's id in the auth_user_id column.
//
// It NEVER deletes or overwrites existing data:
//   • creates NEW rows in auth.users (does not modify existing auth users),
//   • sets ONLY the previously-NULL auth_user_id column on vendors/clients,
//   • skips any row that already has an auth_user_id (safe to re-run).
//
// The synthetic email (e.g. v-<id>@portal.h-lens.co) is an internal identifier
// only — no email is ever sent to it. Real contact email/phone stays untouched
// on the vendors/clients table and is still used by the OTP flow.
//
// Prerequisite: the 20260604000000_add_auth_user_id... migration must be applied.
//
// DRY RUN (default — changes NOTHING, just prints the plan):
//   $env:SUPABASE_URL="https://akcpkjzfhtmurtwzyzhn.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
//   node scripts/backfill-auth-users.mjs
//
// EXECUTE (after you've reviewed the dry run):
//   ...same env...; $env:CONFIRM_BACKFILL="YES"; node scripts/backfill-auth-users.mjs
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL) { console.error('Missing SUPABASE_URL env var'); process.exit(1); }
if (!SERVICE) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var'); process.exit(1); }

const EXECUTE = process.env.CONFIRM_BACKFILL === 'YES';
const SYNTH_DOMAIN = 'portal.h-lens.co'; // synthetic identifier domain — never receives mail

const sb = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const synthEmail = (prefix, id) => `${prefix}-${id}@${SYNTH_DOMAIN}`;

// Find an existing auth user by email (only used on a re-run after a partial run).
async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) return null;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
}

async function backfill(table, portal, idClaim) {
  const { data: rows, error } = await sb.from(table).select('id').is('auth_user_id', null);
  if (error) { console.error(`  read ${table} failed: ${error.message}`); return; }

  console.log(`\n${table}: ${rows.length} row(s) without an auth user.`);
  let created = 0, reused = 0, failed = 0;

  for (const r of rows) {
    const email = synthEmail(portal === 'vendor' ? 'v' : 'c', r.id);
    const app_metadata = { portal, [idClaim]: r.id };

    if (!EXECUTE) {
      console.log(`  [dry-run] create ${email}  app_metadata=${JSON.stringify(app_metadata)}  → set ${table}.auth_user_id`);
      continue;
    }

    let userId = null;
    const { data: cu, error: ce } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      password: randomUUID() + randomUUID(), // never used (login is OTP → session); avoids "password required"
      app_metadata,
    });

    if (ce) {
      const existing = await findUserByEmail(email); // re-run safety
      if (existing) { userId = existing.id; reused++; }
      else { console.error(`  create failed for ${email}: ${ce.message}`); failed++; continue; }
    } else {
      userId = cu.user.id; created++;
    }

    const { error: ue } = await sb.from(table).update({ auth_user_id: userId }).eq('id', r.id);
    if (ue) { console.error(`  set auth_user_id on ${table} ${r.id} failed: ${ue.message}`); failed++; }
  }

  console.log(`  ${table}: created=${created} reused=${reused} failed=${failed}`);
}

console.log(EXECUTE
  ? '=== EXECUTING backfill (creating auth users + setting auth_user_id) ==='
  : '=== DRY RUN — nothing will be changed. Set CONFIRM_BACKFILL=YES to execute. ===');

await backfill('vendors', 'vendor', 'vendor_id');
await backfill('clients', 'client', 'client_id');

console.log('\nDone.');
