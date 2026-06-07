# Native-Auth Production Cutover — REVISED PLAN

**Supersedes the cutover section of `NATIVE_AUTH_CUTOVER_RUNBOOK.md`.** Rebuilt from the
read-only audit of the live production state (prod ref `akcpkjzfhtmurtwzyzhn`,
audited `scripts/audit-prod-security-state.mjs`).

> STATUS: PLAN ONLY — nothing applied, deployed, merged, or written. Awaiting approval.

---

## 0. Verified production state (from the audit)

| Item | State | Note |
|---|---|---|
| Migration **A** (`20260601000000`) | ✅ applied by effect | auth/session tables locked; **not** recorded in history |
| Migration **B** (`20260601000100`) | ❌ MISSING | anon PII reads open; no portal policies / nonce / `vendor_registration_check()` |
| Migration **C** (`20260601000200`) | ❌ MISSING | 3 buckets still `public=true` |
| Migration **D** (`20260601000300`) | ❌ MISSING | draft RPCs + `increment_otp_failed_attempts()` absent |
| `auth_user_id` (`20260604000000`) | ✅ effect present (78/1) | applied out-of-band; not recorded |
| CONTRACT enum (`20260607000000`) | ✅ effect present | applied out-of-band; not recorded |
| `schema_migrations` history | ⚠️ desynced | latest recorded `20260518150000`; A/0604/0607 effects exist but unrecorded |

**Native-frontend code dependencies (why scope grew):**
`src/components/vendor-registration/VendorRegistrationForm.tsx` calls
`get_vendor_draft` / `save_vendor_draft` / `delete_vendor_draft` (**D**) and
`vendor_registration_check` (**B**). `supabase/functions/verify-otp` calls
`increment_otp_failed_attempts` (**D**, graceful fallback). → The native frontend
needs **B and D**, not B alone.

---

## 1. Migration-history reconciliation (do FIRST; no downtime, no effect change)

The history is desynced, so a blanket `db push` would try to (re)apply A/0604/0607.
Reconcile **before** touching anything, so the only genuinely-pending migrations become B/C/D.

1. Get the authoritative diff:
   ```bash
   export SUPABASE_ACCESS_TOKEN=<FRESH_sbp>
   supabase migration list --project-ref akcpkjzfhtmurtwzyzhn
   ```
2. For every migration whose **effect is already present but is unrecorded**, mark it applied **without executing** it:
   ```bash
   supabase migration repair --status applied 20260601000000 --project-ref akcpkjzfhtmurtwzyzhn  # A
   supabase migration repair --status applied 20260604000000 --project-ref akcpkjzfhtmurtwzyzhn  # auth_user_id
   supabase migration repair --status applied 20260607000000 --project-ref akcpkjzfhtmurtwzyzhn  # CONTRACT enum
   supabase migration repair --status applied 20260405122259 --project-ref akcpkjzfhtmurtwzyzhn  # stub, if unrecorded
   ```
   (Confirm each against `migration list` first; only repair versions whose effect the audit proved present.)
3. Re-run `migration list` → **expected: only `20260601000100` (B), `…000200` (C), `…000300` (D) pending.**

> ⛔ STOP if, after repair, anything other than B/C/D shows pending. Do not continue until the pending set is exactly {B, C, D}.

---

## 2. Exact order: functions → frontend → D → B → C

All migration applies happen **after** the native frontend is live, because B and D each
remove anon access the **old** frontend depends on.

| # | Step | Who | Downtime |
|---|---|---|---|
| 2.1 | Deploy native edge functions (`verify-otp`, `create-post-registration-session`) | Operator | none (backward-compatible) |
| 2.2 | Deploy native frontend = **merge `feat/native-auth` → `main`** (Pages auto-publishes) | Operator | none until 2.3 |
| 2.3 | Apply **D** (`…000300`) — controlled apply + verify + repair | Operator | start of brief window |
| 2.4 | Apply **B** (`…000100`) — controlled apply + verify + repair | Operator | brief window |
| 2.5 | Apply **C** (`…000200`) — controlled apply + verify + repair | Operator | end of brief window |

Order **D → B → C** rationale: D installs the registration/OTP RPCs the new frontend
calls; B then closes the largest table exposure and enables portal reads; C closes the
storage exposure last (needs the signed-URL frontend from 2.2 already live). D↔B order is
interchangeable — apply them back-to-back to keep the gap to seconds.

> Between 2.2 and 2.4 the native frontend is live but portal reads return empty and
> registration RPCs error — keep 2.3–2.5 tight (target < 5 min).

---

## 3. Why D is required before/with the native frontend
- **Hard dependency:** the native registration form calls `get_vendor_draft` / `save_vendor_draft` / `delete_vendor_draft`. Without D these RPCs don't exist → draft load/save/delete error in the new UI.
- **OTP integrity:** `verify-otp` calls `increment_otp_failed_attempts` (D). Absent → it falls back to a non-atomic read-then-write counter (the original race D was written to fix). Not a hard break, but a security regression if left missing.
- **Consistency:** D also removes the legacy permissive `vendor_registration_drafts` policies the **old** frontend used for direct anon access — so D's breaking half, like B's, must land **with** the native frontend, not before.

---

## 4. Production exposures removed by each migration

| Migration | Live exposure it removes |
|---|---|
| **A** *(already applied)* | anon reads of `otp_codes` (every live OTP → account takeover), `vendor_sessions`, `client_sessions` (session tokens → impersonation). **Already closed.** |
| **B** | anon `USING(true)` reads on `vendors`, `clients`, `vendor_documents`, `vendor_equipment`, `vendor_approval_log`, `vendor_submission_snapshots` (+ registration-scoped reads on financial/travel/selected-fields). Closes **all vendor/client PII readable with the public anon key**, and the document **paths** that make the public buckets exploitable. |
| **C** | `vendor-images` / `project-files` / `client-documents` buckets are **public** → national IDs, passports, financial + client documents **downloadable over the public CDN**. C makes them private (signed-URL only). |
| **D** | direct anon access to `vendor_registration_drafts` (in-progress PII: name/phone/national-ID being typed); restores the atomic OTP attempt counter. |

---

## 5. Controlled-apply approach (NOT `db push`)

For **each** of D, B, C, in order:
1. **Apply** the exact committed migration SQL via the **Supabase SQL Editor** (or the Management API query endpoint, as `scripts/apply-migration-b-preview.mjs` does — repointed at prod). One migration at a time.
2. **Verify** using that migration file's own POST-APPLY VERIFICATION block:
   - **D:** `select * from pg_policies where tablename='vendor_registration_drafts';` → 0 rows; the 4 functions exist (`get/save/delete_vendor_draft`, `increment_otp_failed_attempts`).
   - **B:** `select tablename,policyname from pg_policies where cmd='SELECT' and 'anon'=any(roles) and tablename like 'vendor%';` → 0 rows; `portal_*` policies present; `vendor_registration_check()` exists; `registration_nonce` column exists.
   - **C:** `select id,public from storage.buckets where id in ('vendor-images','project-files','client-documents');` → all `false`; `private_buckets_authenticated_read` present.
3. **Record** it in history: `supabase migration repair --status applied <version> --project-ref akcpkjzfhtmurtwzyzhn`.
4. Only then proceed to the next migration.

Re-run `scripts/audit-prod-security-state.mjs` after all three → expect `A=APPLIED B=APPLIED C=APPLIED D=APPLIED`, 0 sensitive anon SELECT policies.

> Post-reconciliation, `db push` would technically apply exactly B/C/D — but per the maximum-control requirement we apply each explicitly and verify between steps.

---

## 6. Rollback strategy per stage

| Stage | Rollback |
|---|---|
| 2.1 functions | Redeploy prior versions from `main`/`staging`. New ones are backward-compatible; rarely needed. |
| 2.2 frontend | Cloudflare Pages → re-publish previous deployment (instant). The PR merge can also be reverted, but re-publish is faster. |
| 2.3 **D** | Fail-closed teardown: `DROP FUNCTION` the 4 D functions; leave drafts locked (RLS on, no policies). **A D down-script must be authored before cutover** (we don't have one yet). Service restore = PITR. |
| 2.4 **B** | Existing fail-closed down-script `supabase/rollback/20260601000100_security_lockdown_b_DOWN.sql` (drops portal policies + `vendor_registration_check`; does NOT reopen the anon leak). Service restore = PITR. |
| 2.5 **C** | Re-set buckets `public=true` + drop `private_buckets_authenticated_read`. Reopens the storage exposure but restores image display. **A C down-script must be authored before cutover.** |
| Any | **Universal fallback: PITR** to the restore point noted in pre-flight. Loses only data written during the (short) window. |

**Pre-cutover prep task:** author fail-closed down-scripts for **C** and **D** (we only have B's). Read-only planning flags this; I can write them on request.

---

## 7. Updated estimated downtime
- History reconciliation (§1): ~3 min, **no downtime, no effect change**.
- Functions deploy: ~3 min, no downtime.
- Frontend merge + Pages build: ~3 min, no downtime (old deploy serves until new is ready).
- Apply D→B→C (controlled, verified, repaired): ~6–10 min.
- **User-visible disruption window: ~2–5 min** (portals empty + registration RPCs error between frontend-live and B/D applied). Existing portal users are logged out and re-login via OTP (expected).
- Smoke + manual checklist: ~10–15 min.
- **Total window ≈ 35–50 min.**

---

## 8. Updated Go / No-Go criteria

**GO only when ALL are true:**
1. PITR/backup confirmed enabled + restore point timestamp noted.
2. Fresh `sbp` token in hand (old ones rotated post-cutover).
3. **Fail-closed down-scripts authored for C and D** (B already has one).
4. Preview re-validated with **D applied too** — specifically the registration **draft RPC** flow (`get/save/delete_vendor_draft`) and `vendor_registration_check`, which the smoke harness does not currently exercise (it seeds vendors directly).
5. History reconciliation plan (§1) reviewed; post-repair pending set confirmed = {B, C, D} only.
6. Maintenance window scheduled (low traffic; users will be logged out).

**NO-GO if:** any anon `USING(true)` policy remains after B; post-repair pending set ≠ {B,C,D}; C or D down-script missing; preview draft-RPC flow unverified; no PITR point.

---

## Risk callouts

- **Highest-risk STEP:** applying **Migration B** (§2.4). Largest blast radius — it drops every anon PII read and swaps in claim-scoped portal policies in one shot; a wrong claim path would empty all portals. Mitigations: validated end-to-end on preview, `app_metadata` claim path already corrected, fail-closed down-script ready, applied only after the native frontend is live.

- **Highest-risk LIVE exposure right now:** the anon **`USING(true)` reads on `vendors` and `clients`** (Migration B missing). Anyone with the public anon key (shipped in the frontend bundle) can read **all** vendor/client PII — national IDs, contact details — **and** the storage object paths, which in turn makes the still-public buckets (C missing) downloadable. This pairing (B-exposed table → C-public bucket) is the full PII-exfiltration chain and is **live today**.

- **Safest execution sequence:**
  `pre-flight (PITR + token + C/D down-scripts + preview draft-RPC re-validation)`
  → `§1 reconcile history (no downtime)`
  → `2.1 deploy functions`
  → `2.2 merge → frontend live`
  → `2.3 D` → `2.4 B` → `2.5 C` (tight, verified between each)
  → `re-run audit (expect all APPLIED, 0 leaks)`
  → `smoke (safe mode) + manual checklist`
  → `monitor` → `rotate creds after success`.

---

*Cutover remains STOPPED pending approval. No production change has been made.*
