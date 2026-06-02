# Operational scripts

These are one-shot / maintenance scripts that talk to Supabase via the
Management API (and, for storage uploads, the service-role key).

## Required environment variables

All credentials are now read **strictly from the environment** — there are no
hardcoded fallbacks. A script will print which variable is missing and exit
with a non-zero code if it is not set. Provide them via a local, **untracked**
`.env` file (already gitignored) or your shell:

- `SUPABASE_ACCESS_TOKEN` — Supabase Management API personal access token (PAT, `sbp_...`).
- `SUPABASE_PROJECT_REF` — the target project ref.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role JWT, required by the storage-upload scripts
  (`rehost-equipment-images.mjs`, `fix-rate-limited-images.mjs`, `fix-rode-image.mjs`,
  `sync-equipment-catalog.mjs`, `add-two-more-vendors.mjs`).

A few older scripts use their own variable names: `apply-rls-migration.mjs`
expects `MGMT_TOKEN` and `PROJECT_REF`; `apply-p1-migrations.mjs` expects
`DATABASE_URL`.

> These scripts must **NEVER** contain hardcoded credentials. If you need to
> reuse a token, put it in your untracked `.env` — do not paste it into a script.

## DESTRUCTIVE scripts (no confirmation guard)

The following scripts delete or wipe data immediately on run, with **no**
interactive confirmation prompt. Double-check `SUPABASE_PROJECT_REF` points at
the intended project before running them:

- `clear-db.mjs` — wipes vendors, projects, expenses, suggestions, clients (and dependents).
- `clear-activity-logs.mjs` — clears all activity-log tables.
- `force-delete-vendors.mjs` — force-deletes vendors (disables/re-enables triggers around the delete).
- `force-delete-admin-users.mjs` — force-deletes specific admin users from `auth.users`.
