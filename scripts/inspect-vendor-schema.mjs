// Inspect schemas relevant to adding vendors + equipment
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_8e1c5c20236afde3110411820241cfd9da90118c';
const REF = process.env.SUPABASE_PROJECT_REF || 'akcpkjzfhtmurtwzyzhn';
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function run(label, query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    console.log(`\n=== ${label} (HTTP ${res.status}) ===`);
    console.log(text.slice(0, 6000));
    if (!res.ok) throw new Error(`Query failed: ${label}`);
    return text;
  } catch (err) {
    if (attempt < 4) {
      console.log(`\n--- ${label} attempt ${attempt} failed (${err.message || err.code}); retrying ---`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return run(label, query, attempt + 1);
    }
    throw err;
  }
}

const cols = (t) => `
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='${t}'
  ORDER BY ordinal_position
`;

await run('vendors columns', cols('vendors'));
await run('vendor_equipment columns', cols('vendor_equipment'));
await run('equipment_catalog columns', cols('equipment_catalog'));
await run('equipment_brands columns', cols('equipment_brands'));
await run('equipment_categories columns', cols('equipment_categories'));
await run('vendor_fields columns', cols('vendor_fields'));
await run('vendor_selected_fields columns', cols('vendor_selected_fields'));
await run('cities columns', cols('cities'));

await run('existing vendor_fields rows', `SELECT id, name_ar, name_en FROM public.vendor_fields ORDER BY id LIMIT 50`);
await run('existing equipment_categories', `SELECT * FROM public.equipment_categories ORDER BY id LIMIT 60`);
await run('existing equipment_brands sample', `SELECT * FROM public.equipment_brands ORDER BY id LIMIT 40`);
await run('any existing vendors with these names', `
  SELECT id, full_name, email, phone, status FROM public.vendors
  WHERE full_name ILIKE '%سعود%صلاح%مؤمن%' OR full_name ILIKE '%عبدالرحمن%محمد%طالب%' OR full_name ILIKE '%طارق%عبدالله%الغامدي%'
`);
