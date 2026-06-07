// READ-ONLY audit: production state vs migrations A/B/C/D. No writes whatsoever.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... PROJECT_REF=akcpkjzfhtmurtwzyzhn node scripts/audit-prod-security-state.mjs

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.PROJECT_REF || 'akcpkjzfhtmurtwzyzhn';
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN'); process.exit(1); }

async function q(query) {
  let last;
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
      return j;
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 700 * i)); }
  }
  throw last;
}
const n = (rows) => rows?.[0] ? Object.values(rows[0])[0] : null;

const B_TABLES = ['vendors','vendor_documents','vendor_financial_data','vendor_travel_documents',
  'vendor_submission_snapshots','vendor_invoices','vendor_equipment','vendor_selected_fields',
  'vendor_suggestions','vendor_approval_log','equipment_suggestions'];
const C_BUCKETS = ['vendor-images','project-files','client-documents'];
const D_FUNCS = ['get_vendor_draft','save_vendor_draft','delete_vendor_draft','increment_otp_failed_attempts'];

(async () => {
  console.log(`\n=== READ-ONLY prod security-state audit (${REF}) ===\n`);

  // ── Migration A ──
  console.log('— Migration A (lock otp_codes / vendor_sessions / client_sessions) —');
  const aPol = await q(`select tablename, count(*)::int c from pg_policies
    where schemaname='public' and tablename in ('otp_codes','vendor_sessions','client_sessions')
    group by tablename order by tablename;`);
  const aMap = Object.fromEntries(aPol.map((r) => [r.tablename, r.c]));
  for (const t of ['otp_codes','vendor_sessions','client_sessions']) console.log(`   ${t}: ${aMap[t] || 0} policies (A expects 0)`);
  const aApplied = ['otp_codes','vendor_sessions','client_sessions'].every((t) => !aMap[t]);
  console.log(`   => A applied by effect: ${aApplied ? 'YES' : 'NO'}`);

  // ── Migration B ──
  console.log('\n— Migration B (portal claim-scoped RLS) —');
  const bNonce = n(await q(`select count(*)::int from information_schema.columns where table_schema='public' and table_name='vendors' and column_name='registration_nonce';`));
  const bPortal = n(await q(`select count(*)::int from pg_policies where schemaname='public' and policyname like 'portal_%';`));
  const bFn = n(await q(`select count(*)::int from pg_proc where proname='vendor_registration_check';`));
  const bAnonSel = n(await q(`select count(*)::int from pg_policies where schemaname='public' and cmd='SELECT' and 'anon'=any(roles) and tablename in (${B_TABLES.map((t)=>`'${t}'`).join(',')});`));
  console.log(`   registration_nonce column: ${bNonce ? 'present' : 'ABSENT'}`);
  console.log(`   portal_* policies: ${bPortal}`);
  console.log(`   vendor_registration_check(): ${bFn ? 'present' : 'ABSENT'}`);
  console.log(`   anon SELECT policies still on B's ${B_TABLES.length} PII tables: ${bAnonSel} (B expects 0)`);
  console.log(`   => B applied by effect: ${(bNonce && bPortal > 0 && bFn && bAnonSel === 0) ? 'YES' : 'NO'}`);

  // ── Migration C ──
  console.log('\n— Migration C (private storage buckets) —');
  const buckets = await q(`select id, public from storage.buckets where id in (${C_BUCKETS.map((b)=>`'${b}'`).join(',')}) order by id;`);
  buckets.forEach((b) => console.log(`   bucket ${b.id}: public=${b.public} (C expects false)`));
  const cPol = n(await q(`select count(*)::int from pg_policies where schemaname='storage' and tablename='objects' and policyname='private_buckets_authenticated_read';`));
  console.log(`   private_buckets_authenticated_read policy: ${cPol ? 'present' : 'ABSENT'}`);
  const cApplied = buckets.length === 3 && buckets.every((b) => b.public === false) && cPol >= 1;
  console.log(`   => C applied by effect: ${cApplied ? 'YES' : 'NO'}`);

  // ── Migration D ──
  console.log('\n— Migration D (drafts RPCs + atomic OTP counter) —');
  const dDraftPol = n(await q(`select count(*)::int from pg_policies where schemaname='public' and tablename='vendor_registration_drafts';`));
  const dFns = await q(`select proname, count(*)::int c from pg_proc where proname in (${D_FUNCS.map((f)=>`'${f}'`).join(',')}) group by proname;`);
  const dMap = Object.fromEntries(dFns.map((r) => [r.proname, r.c]));
  console.log(`   vendor_registration_drafts policies: ${dDraftPol} (D expects 0)`);
  D_FUNCS.forEach((f) => console.log(`   fn ${f}(): ${dMap[f] ? 'present' : 'ABSENT'}`));
  const dApplied = dDraftPol === 0 && D_FUNCS.every((f) => dMap[f]);
  console.log(`   => D applied by effect: ${dApplied ? 'YES' : (D_FUNCS.every((f)=>dMap[f]) ? 'PARTIAL' : 'NO')}`);

  // ── Q4: remaining anon/public SELECT policies on sensitive tables ──
  console.log('\n— Anon/public SELECT policies STILL exposing sensitive data —');
  const leaks = await q(`select tablename, policyname, roles::text, qual
    from pg_policies
    where schemaname='public' and cmd='SELECT'
      and ('anon'=any(roles) or 'public'=any(roles))
      and ( tablename like 'vendor%' or tablename in ('clients','otp_codes','vendor_sessions','client_sessions','vendor_registration_drafts') )
    order by tablename, policyname;`);
  if (!leaks.length) console.log('   (none)');
  leaks.forEach((r) => console.log(`   ⚠️ ${r.tablename} · "${r.policyname}" · roles=${r.roles} · USING=${(r.qual||'').slice(0,60)}`));

  console.log('\n=== SUMMARY ===');
  console.log(`A=${aApplied?'APPLIED':'MISSING'}  B=${(bNonce&&bPortal>0&&bFn&&bAnonSel===0)?'APPLIED':'MISSING'}  C=${cApplied?'APPLIED':'MISSING'}  D=${dApplied?'APPLIED':(D_FUNCS.every((f)=>dMap[f])?'PARTIAL':'MISSING')}`);
  console.log(`Sensitive anon SELECT policies still present: ${leaks.length}`);
})().catch((e) => { console.error('AUDIT ERROR:', e.message); process.exit(1); });
