# 🔐 Launch Security Checklist — Half-Lens

Pre-launch security hardening for the Half-Lens platform. All **code** changes are
committed on branch `security/pre-launch-hardening`:

| Commit | What it contains |
|--------|------------------|
| `e17b23c` | Portal JWT auth, RLS lockdown A+B, secret scrub, edge-function hardening, XSS/dev-OTP fixes |
| `f734a59` | Private storage buckets + signed URLs, destructive-script guards |
| `078c39b` | Registration-drafts anon-read fix, atomic OTP attempt counter |

> **Legend:** 🔴 = **blocker, must be done before going public** · 🟢 = **intentionally deferred to after launch (not a blocker)**

> ⚠️ This app is **pre-launch** (no public traffic yet), so the migrations + deploy can be done in one coordinated pass and then tested. None of the four migrations delete data (they only adjust policies, add a column, add functions, and flip bucket flags).

---

## 1. 🔴 MUST-DO BEFORE LAUNCH (blockers)

### 1.1 🔴 Rotate the 4 leaked credentials
These were found hardcoded in the repo / git history and must be considered compromised.

| Credential | Where it leaked | How to rotate |
|------------|-----------------|----------------|
| **Supabase `service_role` key** (project `akcpkjzfhtmurtwzyzhn`) | committed scripts | Dashboard → Project Settings → API → rotate. **See the JWT note in 1.3 — rotating this regenerates the JWT secret, which also changes the anon key and the HS256 secret.** |
| **Supabase management PAT** `sbp_8e1c…` | committed scripts | supabase.com → Account → **Access Tokens** → revoke |
| **Supabase management PAT** `sbp_2ce4…` (second project `ftudsqnyylrzlyhbplqh`) | `.claude` tmp files | supabase.com → Account → **Access Tokens** → revoke |
| **GitHub PAT** `ghp_iWSx…` | `.claude/verify-merge-tmp.mjs` | GitHub → Settings → Developer settings → Personal access tokens → revoke |

After rotating, the scripts read these from env only (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`) — never re-hardcode them.

### 1.2 🔴 Scrub git history
The service_role key and `sbp_8e1c…` PAT are in **committed history**, not just the working tree — removing the lines is not enough.

- Use `git filter-repo` (or BFG) to purge the secrets from all history, then force-push.
- Rotation (1.1) is mandatory **regardless** of the scrub, because the repo is about to be public.
- `.claude/` is now gitignored; delete the local `.claude/*-tmp.mjs` and `.claude/verify-otp-OLD.ts` files.

### 1.3 🔴 Confirm Supabase JWT setup + set `SUPABASE_JWT_SECRET`
The vendor/client portals now authenticate with a Supabase JWT minted by `verify-otp` and
`create-post-registration-session`. Those functions sign tokens with the project's **legacy
HS256 JWT secret**.

1. **Confirm your project uses the legacy HS256 (shared) JWT secret, NOT the new asymmetric (ES256/RS256) signing keys.**
   - Dashboard → Project Settings → API → JWT Settings.
   - If your project uses **asymmetric signing keys**, the HS256 tokens we mint **will be rejected** and the portals will not work — **stop and tell the developer to switch the signer to the asymmetric key** before proceeding.
2. Set the secret on the edge functions (value = the JWT Secret from the dashboard):
   ```bash
   supabase secrets set SUPABASE_JWT_SECRET=<your-project-jwt-secret>
   ```
3. **If you rotated the service_role key in 1.1 by regenerating the JWT secret**, then:
   - Update `VITE_SUPABASE_ANON_KEY` in the frontend `.env` to the **new** anon key and rebuild.
   - Set `SUPABASE_JWT_SECRET` to the **new** secret (step 2 above uses the new value).
4. Also confirm these existing function secrets are set: `SUPABASE_SERVICE_ROLE_KEY`, SMTP creds, `ANTHROPIC_API_KEY`, the 4jawaly SMS creds, and (recommended) `ALLOWED_ORIGIN` = your real site origin.

### 1.4 🔴 Deploy in the correct order
> Recommended: take a database backup first, and run through this on a staging project if you have one.

**Backward-compatible first (safe any time):**
1. Apply **Migration A** — `20260601000000_security_lockdown_a_drop_anon_sensitive_reads.sql`
   (drops anon read on `otp_codes`, `vendor_sessions`, `client_sessions`; nothing in the app reads these, so zero impact).
2. Deploy the **edge functions** (they keep returning the old session token too, so the old frontend keeps working):
   `verify-otp`, `create-post-registration-session`, `send-otp-email`, `send-otp-sms`,
   `create-admin-user`, `delete-admin-user`, `send-user-update-email`, `extract-document-data`.

**Coordinated cutover (do these together — the new frontend depends on the new schema/RPCs, and the new RLS depends on the new frontend's JWTs):**
3. Apply **Migration B** — `20260601000100_security_lockdown_b_portal_jwt_rls.sql`
   (claim-scoped RLS, `registration_nonce` column, `vendor_registration_check` RPC).
4. Apply **Migration D** — `20260601000300_security_lockdown_d_drafts_and_otp.sql`
   (draft RPCs, atomic OTP counter).
5. **Deploy the new frontend build** (mints/sends portal JWTs, uses signed URLs and the new RPCs).
6. Apply **Migration C** — `20260601000200_security_lockdown_c_private_buckets.sql`
   (makes `vendor-images`, `project-files`, `client-documents` private).
   **Must be after step 5**, or images render blank until the signed-URL frontend is live.

> Order summary: **A → functions → (B, D) → frontend → C**.

### 1.5 🔴 Run the required launch tests
Do not announce/launch until all of these pass.

**Anonymous (public anon key only, no login) — everything below must be EMPTY/denied:**
- [ ] `select * from otp_codes` → empty
- [ ] `select * from vendors` → empty
- [ ] `select * from vendor_sessions` / `client_sessions` → empty
- [ ] `select * from vendor_registration_drafts` → empty
- [ ] Open a known `…/storage/v1/object/public/vendor-images/<path>` URL (e.g. an ID image) → **403/400**, not the file.

**Vendor portal:**
- [ ] Login via **email OTP** and via **SMS OTP** → portal loads, profile/ID/documents **images display** (signed URLs).
- [ ] **Tenant isolation:** logged in as Vendor A, in the browser console run `supabase.from('vendors').select('*')` → returns **only A's row**. Editing `localStorage.vendor_data.id` to another vendor's id does **not** expose their data.
- [ ] Blocked/rejected vendor cannot log in.

**Client portal:**
- [ ] Login → sees **only their own** projects and invoices; documents open via signed URLs.

**Registration:**
- [ ] New vendor registration completes; duplicate email/phone/ID is detected.
- [ ] Draft autosave + **resume** works (reload mid-registration restores progress).
- [ ] Image previews show during the form (local), and auto-login lands in the portal after submit.

**Admin:**
- [ ] Login; vendor list, details, ID/passport images, and the **PDF/Excel export with images** all work.
- [ ] A **non-super_admin** account cannot create or delete admin users (gets 403).

**OTP abuse:**
- [ ] 6 wrong codes in a row → locked out ("استنفاد المحاولات").

---

## 2. 🟢 POST-LAUNCH IMPROVEMENTS (intentionally deferred — NOT blockers)

These are defense-in-depth. They are safe to do shortly after launch; the current state is
acceptable to go public because the high-impact leaks they relate to are already closed.

### 2.1 🟢 OTP hashing at rest
- **Now:** OTP codes are stored in plaintext in `otp_codes`. Anon can no longer read them (Migration A), they are single-use, 10-minute expiry, 5-attempt lock.
- **Why deferred:** only matters in a **database-breach** scenario.
- **Later:** store an HMAC-SHA256 of the code; compare hashes with constant-time equality in `verify-otp`.

### 2.2 🟢 Per-IP rate limit on the verify endpoint
- **Now:** the **send** side is rate-limited (20/hr per IP), each code has a 5-attempt lock (now **atomic**, so the race is closed) and a 10-minute expiry. Practical brute-force ceiling ≈ 20 codes/hr × 5 ≈ 100 guesses/hr against a 1,000,000 space → infeasible.
- **Why deferred:** the atomic lock + send-side limit already make brute-force impractical.
- **Later:** add a per-IP attempt limit on `verify-otp` (needs a small attempts table or counter store).

### 2.3 🟢 Tighter per-vendor storage path scoping
- **Now:** the private buckets allow **any authenticated** caller to mint a signed URL. This is safe because object **paths are not discoverable** — Migration B removed the table reads that exposed those URLs to non-owners, so a vendor cannot learn another vendor's object path.
- **Why deferred:** no practical exposure given paths aren't discoverable.
- **Later:** scope `storage.objects` SELECT by a per-vendor path prefix (or proxy reads through an edge function that validates the vendor's session before signing).

---

## Appendix — what each migration does (no data deleted)

- **A** `…000000` — drops anon read on `otp_codes` / `vendor_sessions` / `client_sessions`.
- **B** `…000100` — drops `anon USING(true)` reads on `vendors` + vendor PII tables; adds authenticated, claim-scoped (`vendor_id`/`client_id`) policies + `is_admin()`; adds `vendors.registration_nonce`; adds `vendor_registration_check()` RPC.
- **C** `…000200` — sets `vendor-images` / `project-files` / `client-documents` buckets to private; authenticated-only read (for signed URLs).
- **D** `…000300` — drops permissive `vendor_registration_drafts` policies, gates drafts behind session-id-keyed RPCs; adds atomic `increment_otp_failed_attempts()` RPC.

## Appendix — operational safety
- The destructive scripts (`clear-db.mjs`, `clear-activity-logs.mjs`, `force-delete-vendors.mjs`,
  `force-delete-admin-users.mjs`) now refuse to run unless `CONFIRM_DESTRUCTIVE=YES` is set.
  Keep it that way; never run them against production without an explicit, intentional reason.
