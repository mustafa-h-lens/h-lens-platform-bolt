// Fill missing nationality / primary_city for a known list of vendors.
//
// Usage:
//   node scripts/fill-vendor-details.mjs            # dry-run — prints what would change
//   node scripts/fill-vendor-details.mjs --apply    # actually writes the updates
//
// Requires (or defaults to the project's existing pinned creds in env):
//   SUPABASE_ACCESS_TOKEN   — Supabase management-API PAT
//   SUPABASE_PROJECT_REF    — project ref (the akcpkjzfhtmurtwzyzhn one)
//
// Behaviour:
//   - Reads each target by an ILIKE %name% match. If multiple rows match, prints
//     them all and SKIPS that target (you can re-run with a more specific name).
//   - Only fills fields that are currently NULL/empty in the DB — never overwrites
//     a non-empty value. Idempotent: re-running after success is a no-op.
//   - Prints a final summary table: matched / skipped (multi) / not found.

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || 'akcpkjzfhtmurtwzyzhn';
if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env var. See scripts/add-three-vendors.mjs for the pinned dev token if you want to reuse it.');
  process.exit(2);
}
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const APPLY = process.argv.includes('--apply');

const targets = [
  { match: 'حمد السلمان',         city: 'الرياض' },
  { match: 'مصعب عسيري',          city: 'الرياض' },
  { match: 'عبدالرحمن فائغ',      city: 'الرياض' },
  { match: 'عبدالعزيز إمام',      city: 'جدة',      primary_field: 'منتج' },
  { match: 'عبدالرحمن شيخ',       city: 'المدينة المنورة' },
  { match: 'اياس محمد',           city: 'المدينة المنورة' },
  { match: 'فيصل العسيري',        city: 'أبها' },
  { match: 'عبدالإله مولبي',      city: 'جدة' },
  { match: 'طارق الغامدي',        nationality: 'سعودي', city: 'الرياض' },
  { match: 'عبدالرحمن بن طالب',   nationality: 'سعودي', city: 'الرياض' },
  { match: 'سعود مؤمن',           city: 'الرياض' },
  { match: 'مصطفى أنور',          nationality: 'سوداني' },
];

async function q(sql) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

const esc = (s) => s.replace(/'/g, "''");

const report = { matched: [], skippedMulti: [], notFound: [], noChange: [], applied: [] };

console.log(`\nMode: ${APPLY ? 'APPLY (writes will happen)' : 'DRY-RUN (no writes)'}`);
console.log('Looking up ' + targets.length + ' vendors...\n');

for (const t of targets) {
  const lookup = `
    SELECT id, full_name, phone, nationality, primary_city, primary_field, status
    FROM vendors
    WHERE full_name ILIKE '%${esc(t.match)}%'
    ORDER BY created_at DESC;
  `;
  const rows = await q(lookup);
  if (!rows || rows.length === 0) {
    console.log(`❌ NOT FOUND  : ${t.match}`);
    report.notFound.push(t.match);
    continue;
  }
  if (rows.length > 1) {
    console.log(`⚠️  AMBIGUOUS  : ${t.match} — ${rows.length} matches`);
    rows.forEach((r) => console.log(`     • ${r.full_name} (${r.phone}) — ${r.status}`));
    report.skippedMulti.push(t.match);
    continue;
  }
  const v = rows[0];
  const updates = [];
  if (t.nationality && !v.nationality)   updates.push(['nationality',   t.nationality]);
  if (t.city        && !v.primary_city)  updates.push(['primary_city',  t.city]);
  if (t.primary_field && !v.primary_field) updates.push(['primary_field', t.primary_field]);

  if (updates.length === 0) {
    console.log(`➖ NO CHANGE  : ${v.full_name} — already filled`);
    report.noChange.push(v.full_name);
    continue;
  }

  const setClause = updates.map(([k, val]) => `${k} = '${esc(val)}'`).join(', ');
  const summary = updates.map(([k, val]) => `${k}='${val}'`).join(', ');
  console.log(`✅ MATCH      : ${v.full_name} — would set ${summary}`);
  report.matched.push({ id: v.id, name: v.full_name, sql: `UPDATE vendors SET ${setClause} WHERE id = '${v.id}';` });

  if (APPLY) {
    await q(`UPDATE vendors SET ${setClause} WHERE id = '${v.id}';`);
    report.applied.push(v.full_name);
  }
}

console.log('\n— Summary —');
console.log(`Matched:        ${report.matched.length}`);
console.log(`Already filled: ${report.noChange.length}`);
console.log(`Ambiguous:      ${report.skippedMulti.length} ${report.skippedMulti.length ? '(' + report.skippedMulti.join(', ') + ')' : ''}`);
console.log(`Not found:      ${report.notFound.length} ${report.notFound.length ? '(' + report.notFound.join(', ') + ')' : ''}`);

if (!APPLY && report.matched.length > 0) {
  console.log('\nThis was a dry-run. To apply these updates, re-run with --apply:');
  console.log('  node scripts/fill-vendor-details.mjs --apply');
} else if (APPLY) {
  console.log(`\nApplied: ${report.applied.length}`);
  report.applied.forEach(n => console.log(`  ✅ ${n}`));
}
