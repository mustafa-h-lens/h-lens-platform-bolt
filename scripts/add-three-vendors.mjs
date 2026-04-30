// Add three vendors + their equipment with image URLs.
// Idempotent: skips vendors whose phone already exists; skips equipment rows
// whose (vendor_id, name) pair already exists.
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
    console.log(text.slice(0, 4000));
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

// Field IDs from existing vendor_fields rows.
const FIELD_INTERNAL_TEAM = '17e37ecb-2382-46e4-b1f3-7790e4f31ea2'; // فريق العمل الداخلي
const FIELD_CAMERA_OPERATOR = 'a23e7293-c323-4984-8e73-fef4ee5fa918'; // مصور كاميرا
const FIELD_PHOTOGRAPHER = '24e4e36d-6261-4f54-93fb-6c98078bf180'; // مصور فوتوغرافي

// Stable image URLs (placehold.co — guaranteed-working labelled placeholders).
const IMG = {
  sonyA7S3: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Sony+A7S+III',
  sony70200: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Sony+FE+70-200mm',
  sony2470: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Sony+FE+24-70mm',
  npfz100: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Sony+NP-FZ100',
  rodeMic: 'https://placehold.co/600x400/0f172a/ffffff/png?text=R%C3%98DE+VideoMic',
  djiMic: 'https://placehold.co/600x400/0f172a/ffffff/png?text=DJI+Mic',
  fieldMonitor: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Field+Monitor',
  cameraCage: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Camera+Cage',
  canonR6ii: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Canon+R6+Mark+II',
  canon24105: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Canon+RF+24-105mm',
  godoxV100: 'https://placehold.co/600x400/0f172a/ffffff/png?text=Godox+V100',
};

// Three vendors + their equipment.
const vendors = [
  {
    full_name: 'سعود صلاح مؤمن',
    phone: '0500000001',
    primary_field: 'فريق هاف لينس',
    field_id: FIELD_INTERNAL_TEAM,
    equipment: [],
  },
  {
    full_name: 'عبدالرحمن محمد بن طالب',
    phone: '0500000002',
    primary_field: 'مصور فيديو',
    field_id: FIELD_CAMERA_OPERATOR,
    equipment: [
      { name: 'Sony A7S III',          type: 'كاميرا',    qty: 2, image: IMG.sonyA7S3 },
      { name: 'Sony FE 70-200mm',      type: 'عدسة',      qty: 1, image: IMG.sony70200 },
      { name: 'Sony FE 24-70mm',       type: 'عدسة',      qty: 1, image: IMG.sony2470 },
      { name: 'Sony NP-FZ100 Battery', type: 'اكسسوارات', qty: 4, image: IMG.npfz100 },
      { name: 'RØDE VideoMic',         type: 'صوت',       qty: 1, image: IMG.rodeMic },
      { name: 'DJI Mic',               type: 'صوت',       qty: 1, image: IMG.djiMic },
      { name: 'Field Monitor',         type: 'اكسسوارات', qty: 1, image: IMG.fieldMonitor },
      { name: 'Camera Cage',           type: 'اكسسوارات', qty: 1, image: IMG.cameraCage },
    ],
  },
  {
    full_name: 'طارق عبدالله الغامدي',
    phone: '0500000003',
    primary_field: 'مصور فوتو',
    field_id: FIELD_PHOTOGRAPHER,
    equipment: [
      { name: 'Canon EOS R6 Mark II',  type: 'كاميرا', qty: 1, image: IMG.canonR6ii },
      { name: 'Canon RF 24-105mm',     type: 'عدسة',   qty: 1, image: IMG.canon24105 },
      { name: 'Godox V100',            type: 'إضاءة',  qty: 1, image: IMG.godoxV100 },
    ],
  },
];

const sqlEsc = (s) => String(s).replace(/'/g, "''");

for (const v of vendors) {
  // 1) Insert vendor — skip if a row with same phone already exists.
  await run(`upsert vendor: ${v.full_name}`, `
    INSERT INTO public.vendors (full_name, phone, country_code, primary_field, vendor_type, status)
    SELECT '${sqlEsc(v.full_name)}', '${sqlEsc(v.phone)}', '+966',
           '${sqlEsc(v.primary_field)}', 'individual', 'active'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.vendors WHERE phone = '${sqlEsc(v.phone)}'
    )
    RETURNING id, full_name, phone;
  `);

  // 2) Capture vendor id (by phone — guaranteed-unique by step 1).
  // 3) Link primary field — skip if already linked.
  await run(`link field: ${v.full_name}`, `
    INSERT INTO public.vendor_selected_fields (vendor_id, field_id, currency)
    SELECT ve.id, '${v.field_id}', 'SAR'
    FROM public.vendors ve
    WHERE ve.phone = '${sqlEsc(v.phone)}'
      AND NOT EXISTS (
        SELECT 1 FROM public.vendor_selected_fields vsf
        WHERE vsf.vendor_id = ve.id AND vsf.field_id = '${v.field_id}'
      )
    RETURNING id, vendor_id, field_id;
  `);

  // 4) Add equipment — skip if (vendor_id, name) pair already exists.
  for (const e of v.equipment) {
    await run(`equipment: ${v.full_name} → ${e.name}`, `
      INSERT INTO public.vendor_equipment (vendor_id, name, type, image, quantity)
      SELECT ve.id, '${sqlEsc(e.name)}', '${sqlEsc(e.type)}', '${sqlEsc(e.image)}', ${e.qty}
      FROM public.vendors ve
      WHERE ve.phone = '${sqlEsc(v.phone)}'
        AND NOT EXISTS (
          SELECT 1 FROM public.vendor_equipment veq
          WHERE veq.vendor_id = ve.id AND veq.name = '${sqlEsc(e.name)}'
        )
      RETURNING id, vendor_id, name, quantity;
    `);
  }
}

await run('summary — vendors', `
  SELECT v.id, v.full_name, v.phone, v.primary_field, v.status,
         (SELECT count(*) FROM public.vendor_selected_fields s WHERE s.vendor_id = v.id) AS fields,
         (SELECT count(*) FROM public.vendor_equipment e WHERE e.vendor_id = v.id) AS equipment
  FROM public.vendors v
  WHERE v.phone IN ('0500000001','0500000002','0500000003')
  ORDER BY v.full_name;
`);
