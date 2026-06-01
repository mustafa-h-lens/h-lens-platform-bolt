// Force-delete vendors. Disables the two activity-log triggers that fire on
// vendor_suggestions / vendor_travel_documents during cascade — they try to
// INSERT into vendor_activity_log referencing the now-deleted vendor and
// blow up the cascade. Triggers re-enabled after the delete.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
if (!TOKEN) {
  console.error('Set SUPABASE_ACCESS_TOKEN before running this script.');
  process.exit(1);
}
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(label, query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    console.log(`\n=== ${label} (HTTP ${res.status}) ===`);
    console.log(text.slice(0, 2000));
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  } catch (err) {
    if (attempt < 4) {
      await new Promise(r => setTimeout(r, 2500 * attempt));
      return sql(label, query, attempt + 1);
    }
    throw err;
  }
}

const NAMES = [
  'عمرو بن صادق السبئي',
  'سعد علي خالد',
  'سعيد خالد',
  'خالد علي محمد',
  'هاهخاا',
  'Mohamed Khaled',
  'lplv d1',
  'شركة النور للإنتاج',
  'amro alsabaeei',
  'خالد عبدالله السبيعي',
  'سارة أحمد الحربي',
  'أحمد محمد العلي',
  'سالم سالم سالم',
  'محمد بن محمد المحمدي',
];
const inList = NAMES.map(n => `'${n.replace(/'/g, "''")}'`).join(', ');

await sql('preview', `
  SELECT id, full_name, status FROM public.vendors
  WHERE full_name IN (${inList})
  ORDER BY full_name
`);

// vendor_invoices has ON DELETE RESTRICT — wipe first.
await sql('delete vendor_invoices', `
  DELETE FROM public.vendor_invoices
  WHERE vendor_id IN (SELECT id FROM public.vendors WHERE full_name IN (${inList}))
  RETURNING id
`);

// Disable the two triggers that re-INSERT into vendor_activity_log during the
// vendor cascade, then delete vendors, then re-enable.
await sql('force delete (txn)', `
  BEGIN;
  ALTER TABLE public.vendor_suggestions       DISABLE TRIGGER vendor_suggestion_changes_trigger;
  ALTER TABLE public.vendor_travel_documents  DISABLE TRIGGER vendor_travel_doc_changes_trigger;

  WITH deleted AS (
    DELETE FROM public.vendors
    WHERE full_name IN (${inList})
    RETURNING id, full_name
  )
  SELECT count(*)::int AS n, array_agg(full_name) AS names FROM deleted;

  ALTER TABLE public.vendor_suggestions       ENABLE TRIGGER vendor_suggestion_changes_trigger;
  ALTER TABLE public.vendor_travel_documents  ENABLE TRIGGER vendor_travel_doc_changes_trigger;
  COMMIT;
`);

await sql('verify', `
  SELECT count(*)::int AS remaining FROM public.vendors WHERE full_name IN (${inList})
`);

console.log('\nDone.');
