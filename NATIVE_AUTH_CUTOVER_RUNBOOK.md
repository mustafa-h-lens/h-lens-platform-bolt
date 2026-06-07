# Native-Auth Production Cutover Runbook

Migrating the vendor/client portals from custom localStorage tokens to **native
Supabase Auth**. Validated end-to-end on the preview project `ikzccfjgrupjmuzdkzzg`
(see `scripts/validate-native-auth-preview.mjs`, commit `50d8ded`).

> **STATUS: NOT YET EXECUTED.** This document is the plan. Nothing here has been
> applied to production. Do not run any step until the cutover is explicitly
> approved and scheduled.

---

## 0. Identifiers & artifacts

| Thing | Value |
|---|---|
| Production Supabase ref | `akcpkjzfhtmurtwzyzhn` |
| Preview Supabase ref (already validated) | `ikzccfjgrupjmuzdkzzg` |
| Public URL (must not change) | `https://platform.h-lens.co` |
| Hosting | Cloudflare Pages (`h-lens-platform-bolt.pages.dev`), DNS on Hostinger, registrar GoDaddy |
| Frontend deploy mechanism | Cloudflare Pages auto-builds & publishes on **push to GitHub `main`** — the push *is* the publish. Prod frontend deploy = merge `feat/native-auth` → `main`. |
| Branch under test | `feat/native-auth` |
| Edge functions to deploy | `verify-otp`, `create-post-registration-session` |
| Migration to apply (this cutover) | `supabase/migrations/20260601000100_security_lockdown_b_portal_jwt_rls.sql` (the `app_metadata` claim-path version) |
| Rollback (fail-closed) | `supabase/rollback/20260601000100_security_lockdown_b_DOWN.sql` |

**Roles**
- **Operator** = the person with prod credentials (you / release engineer). Performs every production deploy, SQL apply, and verification.
- **Assistant** = prepared these artifacts; does **not** touch production.

**DNS / email rule (unchanged):** do NOT modify any DNS, MX, SPF, DKIM, DMARC, or nameserver records. Email is production-critical. This cutover touches only Cloudflare Pages, Supabase edge functions, and Supabase RLS.

---

## 1. Pre-flight (Operator) — do BEFORE the window

Use a **freshly rotated** Supabase management PAT (the one pasted during preview testing is burned — see §8).

```bash
export SUPABASE_ACCESS_TOKEN=<FRESH_sbp_token>
export PROD=akcpkjzfhtmurtwzyzhn
```

1. **Confirm prerequisites already on prod** (these were done earlier; verify, do not re-run):
   - `auth_user_id` column + backfill. Expect **78 vendors + 1 client** linked, **0** mismatches:
     ```sql
     select
       (select count(*) from vendors where auth_user_id is not null) as vendors_linked,
       (select count(*) from clients where auth_user_id is not null) as clients_linked,
       (select count(*) from auth.users where email like 'v-%@portal.h-lens.co'
                                            or email like 'c-%@portal.h-lens.co') as portal_auth_users;
     ```
   - Migrations A (`…000000`), C (`…000200`), D (`…000300`) already applied; B (`…000100`) **not** applied:
     ```bash
     supabase migration list --project-ref $PROD
     ```
2. **Confirm B is the ONLY thing you intend to apply.** If `migration list` shows other un-applied migrations you do not intend to ship, apply B explicitly (§7 option 2) rather than a blanket `db push`.
3. **Take a restore point:** confirm Supabase PITR is enabled and note the exact UTC timestamp, OR trigger an on-demand backup. Snapshot current policies for diffing:
   ```sql
   select schemaname, tablename, policyname, roles, cmd
   from pg_policies where schemaname='public' order by tablename, policyname;
   ```
   Save the output. This is your rollback reference.
4. **Build the frontend** from `feat/native-auth` and confirm it compiles:
   ```bash
   git checkout feat/native-auth && npm ci && npm run build   # expect: dist/ built, 0 errors
   ```

> ⛔ **STOP if:** backfill counts are wrong, PITR/backup is not available, `migration list` shows unexpected pending migrations, or the build fails. Do not proceed.

---

## 2. Cutover steps (Operator) — in a maintenance window

Run 2.1 → 2.4 in quick succession. Between 2.2 and 2.3 there is a brief window where the native frontend is live but RLS isn't claim-scoped yet — portal reads return empty during that gap, so keep it short.

### 2.1 Deploy native edge functions to prod
```bash
export SUPABASE_ACCESS_TOKEN=<FRESH_sbp_token>
supabase functions deploy verify-otp                       --project-ref akcpkjzfhtmurtwzyzhn --use-api
supabase functions deploy create-post-registration-session --project-ref akcpkjzfhtmurtwzyzhn --use-api
```
- No new secrets required: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the platform.
- These functions are backward-compatible (they still return the legacy `session` field alongside `auth.token_hash`), so deploying them does **not** break the current production frontend.
- **Expected result:** both deploys report `Deployed Functions on project akcpkjzfhtmurtwzyzhn`. The old site keeps working.

> ⛔ **STOP if:** either deploy fails after retries. The current site is unaffected; investigate before continuing.

### 2.2 Deploy native frontend to prod (Cloudflare Pages)
**Cloudflare Pages is connected to the GitHub `main` branch — every push to `main` auto-builds (`npm run build`) and publishes to `https://platform.h-lens.co`. The push *is* the publish.** Therefore the production frontend deploy = **merging `feat/native-auth` → `main`**. This is the PR merge that has been deliberately deferred; **merging it IS the frontend go-live**, so do it only at this point in the window. A failed build leaves the previous deployment live (no downtime). Public URL stays `https://platform.h-lens.co`.
- Alternative (no merge): upload the local `dist/` build via the Pages dashboard → "Create deployment". Use only if you must deploy without merging to `main`.
- **Expected result:** `https://platform.h-lens.co` serves the native-auth build. Portal **reads may be empty until 2.3 is applied** — this is expected; proceed immediately to 2.3.

> ⛔ **STOP if:** the deployment fails or the site 500s. Roll back the Pages deployment (§5.1) — the old functions still work, so the previous build is fully functional.

### 2.3 Apply Migration B to prod
Apply `supabase/migrations/20260601000100_security_lockdown_b_portal_jwt_rls.sql` (the committed `app_metadata` claim-path version). See §7 for the two exact methods.
- **Expected result:** portal reads start working under the native session; `pg_policies` shows the `portal_vendor_read_own_*` and `portal_client_read_own_*` policies with the `app_metadata` claim path; no anon SELECT policies remain on vendor PII tables.

> ⛔ **STOP if:** the apply errors, or post-apply portals stay empty. Go to §5 (rollback) — prefer fix-forward only if the cause is obvious and quick.

### 2.4 (Conditional) Migration C — private buckets
Only if not already live on prod. Apply `…000200_security_lockdown_c_private_buckets.sql` **after** the signed-URL frontend (2.2) is live, or images go blank.
- **Expected result:** buckets become private; images render via signed URLs.

---

## 3. Smoke tests (Operator) — immediately after 2.3

### 3a. Automated harness — `scripts/smoke-test-native-auth.mjs`
Runnable PASS/FAIL checks with clear exit codes. Two modes:

**Production — SAFE read-only (no writes; run this first against prod):**
```bash
SMOKE_URL=https://akcpkjzfhtmurtwzyzhn.supabase.co \
SMOKE_ANON_KEY=<prod anon key> \
node scripts/smoke-test-native-auth.mjs
```
Verifies, **without writing anything**: anon lockdown on `vendors`/`clients`/`otp_codes`/`vendor_sessions`/`client_sessions`, and that `verify-otp` + `create-post-registration-session` are deployed & reachable (probed with a random non-matching identifier → 401/400, never mutates data). A `404` here means a function isn't deployed.

**Preview — FULL login/session/RLS/isolation (seeds + cleans throwaway data; TEST MODE):**
```bash
SMOKE_URL=https://ikzccfjgrupjmuzdkzzg.supabase.co SMOKE_ANON_KEY=<preview anon> \
SMOKE_TEST_MODE=1 SMOKE_ACCESS_TOKEN=sbp_<fresh> SMOKE_PROJECT_REF=ikzccfjgrupjmuzdkzzg \
node scripts/smoke-test-native-auth.mjs
```
Runs Phase A **plus** vendor registration auto-login + vendor OTP login + client OTP login, each → native session → app_metadata claim → Migration B RLS own-row → tenant isolation → project scoping, then deletes every throwaway row it created. Last validated **25/25 green** on the preview.

> ⚠️ Do **not** run TEST MODE against production. The full flow is validated on the preview; production gets the read-only Phase A only.

### 3b. Manual checklist (Operator)
Run against `https://platform.h-lens.co`. All must pass.

1. **Vendor registration → auto-login:** complete a new vendor registration; the success screen should land in the vendor portal with a native session (no manual OTP).
2. **Vendor OTP login:** log in as an existing vendor via OTP; portal loads that vendor's data only.
3. **Client OTP login:** log in as the client via OTP; client portal shows that client's projects/invoices only.
4. **Isolation spot-check:** while logged in as one vendor, confirm no other vendor's data is visible anywhere in the UI.
5. **Image display:** vendor profile image and any project/client files render (signed URLs working).
6. **Logout / re-login:** sign out, sign back in via OTP — session re-establishes cleanly.
7. **Admin app unaffected:** admin login + dashboard still work (admins use the normal Supabase Auth path; `is_admin()` still sees everything).

> ⛔ **STOP / ROLLBACK if:** any vendor/client sees another tenant's data (isolation failure — **critical**), portals are empty after Migration B, or registration cannot create a session.

---

## 4. Post-cutover cleanup (Operator)

- Remove the obsolete `SUPABASE_JWT_SECRET` edge-function secret (native auth no longer uses it).
- Rotate all credentials in §8.
- Existing portal users were signed out by the cutover and must re-login via OTP — expected; notify if needed.

---

## 5. Rollback steps

Pick the lightest rollback that resolves the failure.

### 5.1 Frontend only (fastest, no data impact)
Cloudflare Pages → re-publish the previous production deployment. Instant. The new edge functions are backward-compatible, so the old build works against them. Use this if the problem is purely UI.

### 5.2 Edge functions
Redeploy the prior versions from `staging`/`main`:
```bash
git checkout staging   # or main — the pre-native-auth function code
supabase functions deploy verify-otp                       --project-ref akcpkjzfhtmurtwzyzhn --use-api
supabase functions deploy create-post-registration-session --project-ref akcpkjzfhtmurtwzyzhn --use-api
```
Usually unnecessary (new functions are backward-compatible).

### 5.3 Migration B — fail-closed teardown (NOT a service restore)
Apply `supabase/rollback/20260601000100_security_lockdown_b_DOWN.sql`. This **drops the native portal read policies + the registration-check function**. It is **fail-closed**: after it runs, portals read **nothing**, but **no PII leak is reopened**.
- It intentionally does **NOT** recreate the old `anon … USING(true)` SELECT policies, because that would re-open the original data leak.
- Therefore the down-script alone does **not** restore the old (anon-based) site to working order.

### 5.4 Full service-restoring rollback — PITR
To return to a fully working pre-cutover state (old frontend + old anon read policies), **restore from the PITR point / backup taken in §1.3**. This is the only path that brings back the pre-existing policies the old frontend depends on. Data written during the maintenance window is lost — acceptable because the window is short and portals are in maintenance.

**Decision rule:** UI/glitch → 5.1. Function issue → 5.2. RLS broke and you need to fail safe immediately → 5.3 then investigate. Need the old site fully working again → 5.4 (PITR).

---

## 6. Exact commands — function deploy (reference)
```bash
export SUPABASE_ACCESS_TOKEN=<FRESH_sbp_token>     # NOT the burned preview token
supabase functions deploy verify-otp                       --project-ref akcpkjzfhtmurtwzyzhn --use-api
supabase functions deploy create-post-registration-session --project-ref akcpkjzfhtmurtwzyzhn --use-api
```
`--use-api` bundles server-side (no Docker needed). If a deploy hits a transient TLS reset, simply re-run it.

---

## 7. Exact SQL / migration to apply

**Only** Migration B this cutover: `supabase/migrations/20260601000100_security_lockdown_b_portal_jwt_rls.sql` (already includes the `app_metadata` claim-path fix, commit `50d8ded`).

**Option 1 — Supabase CLI (records migration history).** Use only if `migration list` confirms B is the sole pending migration you intend to ship:
```bash
supabase db push --project-ref akcpkjzfhtmurtwzyzhn
```

**Option 2 — controlled apply (recommended when other migrations are pending).** Run the B file's SQL once via the SQL Editor (or the Management API, as in `scripts/apply-migration-b-preview.mjs` pointed at prod), then mark it applied so history stays consistent:
```bash
supabase migration repair --status applied 20260601000100 --project-ref akcpkjzfhtmurtwzyzhn
```

**Post-apply verification (must return zero anon SELECT on vendor PII):**
```sql
select tablename, policyname, roles, cmd
from pg_policies
where schemaname='public' and cmd='SELECT' and 'anon' = any(roles)
  and tablename like 'vendor%';   -- expect 0 rows
```

> The other migrations — A (`…000000`), C (`…000200`), D (`…000300`), `auth_user_id` (`20260604…`), CONTRACT enum (`20260607…`) — are already on prod. Do **not** re-apply them as part of this cutover.

---

## 8. Tokens/secrets to rotate (do after cutover)

1. **The `sbp_` Supabase management PAT** pasted during preview testing — used for the preview deploy + Management API. **Burned; rotate now.**
2. **Supabase `service_role` key** — leaked earlier in scripts/history.
3. **Two earlier `sbp_` management PATs** from prior sessions.
4. **Three GitHub PATs** — classic `ghp_…`, fine-grained `github_pat_…`, and the dead one in `.git/config`. After rotating: scrub git history (filter-repo) + force-push; fix the remote (`git remote set-url origin https://github.com/mustafa-h-lens/h-lens-platform-bolt.git`).
5. **`SUPABASE_JWT_SECRET`** — decommission (remove the edge-function env var); native auth no longer uses it.

The Supabase **anon key** is public by design — no rotation needed.

---

## Global stop conditions (any step)
- Tenant isolation failure (one portal user sees another's data) → **stop, rollback (§5.3/5.4), do not continue.**
- Backfill/auth-user counts wrong in pre-flight → **stop, do not start.**
- Unexpected pending migrations → **stop, use controlled apply (§7 option 2).**
- No working PITR/backup point → **stop, do not apply Migration B.**
