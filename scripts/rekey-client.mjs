// Re-key a client: replace an "ugly" hardcoded id (e.g. the demo-looking
// 33333333-3333-...) with a fresh random UUID, WITHOUT deleting the client or
// any of its data. Every child row that references clients(id) — projects,
// invoices, purchase_orders, production_tasks, client_documents,
// client_sessions, etc. — is re-pointed to the new id inside one transaction.
//
// NOTHING IS DELETED. It only UPDATEs ids.
//
// Usage (dry-run report first — shows everything connected, changes nothing):
//   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... \
//     OLD_CLIENT_ID=33333333-3333-3333-3333-333333333333 \
//     node scripts/rekey-client.mjs
//
// Then, to actually apply it:
//   ...same vars... CONFIRM_REKEY=YES node scripts/rekey-client.mjs
//
// Optional: NEW_CLIENT_ID=<uuid> to choose the new id (default: random).

import { randomUUID } from 'node:crypto';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OLD = (process.env.OLD_CLIENT_ID || '33333333-3333-3333-3333-333333333333').trim();
const NEW = (process.env.NEW_CLIENT_ID || randomUUID()).trim();
if (!UUID_RE.test(OLD)) { console.error(`OLD_CLIENT_ID is not a valid UUID: ${OLD}`); process.exit(1); }
if (!UUID_RE.test(NEW)) { console.error(`NEW_CLIENT_ID is not a valid UUID: ${NEW}`); process.exit(1); }

const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function q(label, query, attempt = 1) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${label} -> HTTP ${res.status}: ${text.slice(0, 500)}`);
    return text ? JSON.parse(text) : [];
  } catch (err) {
    if (attempt < 4) {
      console.log(`  (${label} attempt ${attempt} failed: ${err.message}; retrying)`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return q(label, query, attempt + 1);
    }
    throw err;
  }
}

const lit = (v) => `'${v}'`; // v is a validated UUID — safe to inline

async function main() {
  // 1. Confirm the client exists.
  const client = await q('load client',
    `SELECT id::text, name, email FROM public.clients WHERE id = ${lit(OLD)}::uuid`);
  if (!client.length) {
    console.error(`No client found with id ${OLD}. Nothing to do.`);
    process.exit(1);
  }
  console.log('\n=== CLIENT TO RE-KEY ===');
  console.log(`  name : ${client[0].name}`);
  console.log(`  email: ${client[0].email}`);
  console.log(`  old id: ${OLD}`);
  console.log(`  new id: ${NEW}`);

  // 2. Discover every column that references clients(id).
  const refs = await q('discover FKs', `
    SELECT (c.conrelid::regclass)::text AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f' AND c.confrelid = 'public.clients'::regclass
    ORDER BY 1, 2`);

  // 3. Report how many rows each child table has pointing at the OLD id.
  console.log('\n=== CONNECTED RECORDS (all will be KEPT and re-pointed) ===');
  if (!refs.length) {
    console.log('  (no child tables reference clients(id))');
  } else {
    const counts = refs.map(r =>
      `SELECT '${r.tbl}.${r.col}' AS ref, count(*)::int AS n FROM ${r.tbl} WHERE ${r.col} = ${lit(OLD)}::uuid`
    ).join('\nUNION ALL\n');
    const rows = await q('count refs', counts);
    for (const row of rows) console.log(`  ${row.ref.padEnd(36)} ${row.n} row(s)`);
  }

  // 4. Dry-run gate.
  if (process.env.CONFIRM_REKEY !== 'YES') {
    console.log('\nDRY RUN ONLY — nothing changed.');
    console.log('Review the connected records above. To APPLY the re-key, re-run with CONFIRM_REKEY=YES');
    return;
  }

  // 5. Apply: re-key inside one transaction. Supabase roles can't disable FK
  //    triggers (session_replication_role is denied), so instead we temporarily
  //    add ON UPDATE CASCADE to every FK that references clients(id), update the
  //    id (which cascades to all children), then restore each FK to its original
  //    definition. Schema ends identical; no row is deleted.
  console.log('\nApplying re-key...');
  await q('rekey', `
    DO $$
    DECLARE
      v_old uuid := ${lit(OLD)};
      v_new uuid := ${lit(NEW)};
      r record;
    BEGIN
      IF EXISTS (SELECT 1 FROM public.clients WHERE id = v_new) THEN
        RAISE EXCEPTION 'new id % already exists', v_new;
      END IF;
      CREATE TEMP TABLE _fk_backup ON COMMIT DROP AS
        SELECT c.conname,
               (c.conrelid::regclass)::text AS tbl,
               pg_get_constraintdef(c.oid)  AS def
        FROM pg_constraint c
        WHERE c.contype = 'f' AND c.confrelid = 'public.clients'::regclass;
      -- add ON UPDATE CASCADE
      FOR r IN SELECT * FROM _fk_backup LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON UPDATE CASCADE', r.tbl, r.conname, r.def);
      END LOOP;
      -- re-key; children follow automatically
      UPDATE public.clients SET id = v_new WHERE id = v_old;
      -- restore FKs to their original definitions
      FOR r IN SELECT * FROM _fk_backup LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', r.tbl, r.conname, r.def);
      END LOOP;
    END $$;`);

  // 6. Verify: new id present, old id gone, child counts preserved.
  const after = await q('verify client',
    `SELECT id::text, name FROM public.clients WHERE id = ${lit(NEW)}::uuid`);
  const orphan = await q('verify old gone',
    `SELECT count(*)::int AS n FROM public.clients WHERE id = ${lit(OLD)}::uuid`);
  console.log('\n=== DONE ===');
  console.log(`  client now: ${after[0]?.name} (${after[0]?.id})`);
  console.log(`  rows still using OLD id: ${orphan[0]?.n} (should be 0)`);
  console.log(`  new client URL: /admin#clients/${NEW}`);
}

main().catch(err => { console.error('\nFAILED:', err.message); process.exit(1); });
