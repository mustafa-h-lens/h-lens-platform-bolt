// 1) Check whether each item from the PDF (+ Canon R6 II / 24-105mm / Godox V100) is
//    already in equipment_catalog (settings -> Equipment).
// 2) For missing ones, insert a catalog row with brand, category, and a self-hosted image
//    (re-hosted in Supabase Storage so PDF/canvas exports can read them — Wikimedia blocks
//    cross-origin canvas reads).
// 3) Update vendor_equipment to point at the new Storage URLs and link catalog_item_id.
// Idempotent on every step.
import { Buffer } from 'node:buffer';

const TOKEN = 'sbp_8e1c5c20236afde3110411820241cfd9da90118c';
const REF = 'akcpkjzfhtmurtwzyzhn';
const SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY3BranpmaHRtdXJ0d3p5emhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc2MzI4OCwiZXhwIjoyMDgyMzM5Mjg4fQ.CQY7hTL29xq82c06Y0GGVWWlJMDAeFmclCEgGIHtl2g';

const BUCKET = 'vendor-images';
const PROJECT_HOST = `https://${REF}.supabase.co`;
const SQL_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(label, query, attempt = 1) {
  try {
    const res = await fetch(SQL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    console.log(`\n[sql] ${label} (HTTP ${res.status})`);
    console.log(text.slice(0, 1200));
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  } catch (err) {
    if (attempt < 4) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return sql(label, query, attempt + 1);
    }
    throw err;
  }
}

async function uploadFromUrl(slug, sourceUrl, attempt = 1) {
  try {
    const r = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'HalfLensCatalogSync/1.0 (admin@h-lens.co)' },
    });
    if (!r.ok) throw new Error(`Source HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const objectPath = `equipment/${slug}.${ext}`;
    const up = await fetch(`${PROJECT_HOST}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': ct,
        'x-upsert': 'true',
        'cache-control': 'public, max-age=31536000',
      },
      body: buf,
    });
    if (!up.ok) {
      const t = await up.text();
      throw new Error(`Upload HTTP ${up.status}: ${t}`);
    }
    return `${PROJECT_HOST}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  } catch (err) {
    if (attempt < 3) {
      console.log(`[retry ${slug}] ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return uploadFromUrl(slug, sourceUrl, attempt + 1);
    }
    throw err;
  }
}

// Brand IDs (already in equipment_brands table).
const BRAND = {
  sony:   'e9ca1af2-f053-4bc0-9d73-3482ff42fe44',
  canon:  '717bec96-5845-48dc-b4e8-5f7286b35cfb',
  dji:    'e7ad0386-50f5-4eff-b86b-7084dc2dae1d',
  godox:  'bdcb7e2a-c2a3-40f3-8908-125ef8d0955f',
  // Rode + Atomos may not exist — handled below.
};
// Category IDs.
const CAT = {
  camera:      '04809fe3-8d55-4d9c-811c-d90b4633ab90', // كاميرا
  lens:        '53e0192a-40f8-4293-a836-2fe863ff8e86', // عدسة
  audio:       '484e45ca-f5e2-43be-8264-333c805befa3', // صوت
  lighting:    'cbf55fcd-240c-4cb7-afee-6dc83933a4ef', // إضاءة
  accessories: '744dcb6b-48bd-477e-b3f8-d1b46b6b07a0', // اكسسوارات
};

// Source images — Wikimedia where available, placehold.co labelled fallback otherwise.
const items = [
  { name: 'Sony A7S III',          name_en: 'Sony α7S III',         brandKey: 'sony',  category: CAT.camera,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Sony_%CE%B17S_III_21_Oct_2020a.jpg/640px-Sony_%CE%B17S_III_21_Oct_2020a.jpg' },
  { name: 'Sony FE 70-200mm',      name_en: 'Sony FE 70-200mm',     brandKey: 'sony',  category: CAT.lens,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Sony_G_FE_70-200mm_2015_%2846916035595%29.jpg/640px-Sony_G_FE_70-200mm_2015_%2846916035595%29.jpg' },
  { name: 'Sony FE 24-70mm',       name_en: 'Sony FE 24-70mm GM',   brandKey: 'sony',  category: CAT.lens,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Sony_FE_24-70mm_F2.8_GM.jpg/640px-Sony_FE_24-70mm_F2.8_GM.jpg' },
  { name: 'Sony NP-FZ100 Battery', name_en: 'Sony NP-FZ100 Battery', brandKey: 'sony',  category: CAT.accessories,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sony_NP-FZ100_Battery.jpg/640px-Sony_NP-FZ100_Battery.jpg' },
  { name: 'RØDE VideoMic',         name_en: 'RØDE VideoMic',        brandKey: 'rode',  category: CAT.audio,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/R%C3%98DE_Directional_VideoMic.JPG/640px-R%C3%98DE_Directional_VideoMic.JPG' },
  { name: 'DJI Mic',               name_en: 'DJI Mic',              brandKey: 'dji',   category: CAT.audio,
    // No Wikimedia photo of DJI Mic — using a labelled fallback.
    img: 'https://placehold.co/640x480/1e293b/ffffff/png?text=DJI+Mic' },
  { name: 'Field Monitor',         name_en: 'Field Monitor',        brandKey: null,    category: CAT.accessories,
    img: 'https://placehold.co/640x480/1e293b/ffffff/png?text=Field+Monitor' },
  { name: 'Camera Cage',           name_en: 'Camera Cage',          brandKey: null,    category: CAT.accessories,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Esper_LightCage_photogrammetry_camera_rig.jpg/640px-Esper_LightCage_photogrammetry_camera_rig.jpg' },
  { name: 'Canon EOS R6 Mark II',  name_en: 'Canon EOS R6 Mark II', brandKey: 'canon', category: CAT.camera,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Canon_EOS_R6_Mark_II_-_by_Henry_S%C3%B6derlund_%2852546794891%29.jpg/640px-Canon_EOS_R6_Mark_II_-_by_Henry_S%C3%B6derlund_%2852546794891%29.jpg' },
  { name: 'Canon RF 24-105mm',     name_en: 'Canon RF 24-105mm',    brandKey: 'canon', category: CAT.lens,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Canon_RF_24-105mm_f4-7.1_IS_STM.jpg/640px-Canon_RF_24-105mm_f4-7.1_IS_STM.jpg' },
  { name: 'Godox V100',            name_en: 'Godox V100',           brandKey: 'godox', category: CAT.lighting,
    // No V100 photo on Wikimedia — using labelled fallback (so it actually says "Godox V100").
    img: 'https://placehold.co/640x480/1e293b/ffffff/png?text=Godox+V100' },
];

const sqlEsc = (s) => String(s).replace(/'/g, "''");
const slugify = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

// Step 1: ensure Rode brand exists (if needed by any item).
if (items.some(i => i.brandKey === 'rode')) {
  const rodeRows = await sql('lookup Rode brand', `
    SELECT id FROM public.equipment_brands
    WHERE lower(name_en) IN ('rode','røde') OR name ILIKE '%رود%'
    LIMIT 1
  `);
  if (rodeRows.length === 0) {
    const created = await sql('insert Rode brand', `
      INSERT INTO public.equipment_brands (name, name_en, is_active, display_order)
      VALUES ('رود', 'RØDE', true, 25)
      RETURNING id;
    `);
    BRAND.rode = created[0].id;
  } else {
    BRAND.rode = rodeRows[0].id;
  }
}

// Step 2: check which items are already in equipment_catalog.
console.log('\n=== Step 1/4: checking equipment_catalog ===');
const existing = await sql('existing catalog rows for our names', `
  SELECT id, name, name_en, category_id, brand_id, image_url
  FROM public.equipment_catalog
  WHERE name IN (${items.map(i => `'${sqlEsc(i.name)}'`).join(',')})
     OR name_en IN (${items.map(i => `'${sqlEsc(i.name_en)}'`).join(',')})
`);
const existingByName = new Map(existing.map(r => [r.name, r]));
const existingByNameEn = new Map(existing.map(r => [r.name_en, r]));

// Step 3: re-host images in Supabase Storage and upsert catalog rows.
console.log('\n=== Step 2/4: rehost images + upsert catalog ===');
const catalogIdByName = {};
for (const it of items) {
  const slug = slugify(it.name);
  let storedUrl;
  try {
    storedUrl = await uploadFromUrl(slug, it.img);
  } catch (err) {
    console.log(`[!] could not rehost ${it.name}, falling back to source URL: ${err.message}`);
    storedUrl = it.img;
  }
  console.log(`[ok] ${it.name} -> ${storedUrl}`);

  const existingRow = existingByName.get(it.name) || existingByNameEn.get(it.name_en);
  if (existingRow) {
    // Update existing row's image_url to the storage URL (catalog row already exists).
    const updated = await sql(`update catalog: ${it.name}`, `
      UPDATE public.equipment_catalog
      SET image_url = '${sqlEsc(storedUrl)}',
          name_en = COALESCE(name_en, '${sqlEsc(it.name_en)}'),
          category_id = COALESCE(category_id, '${it.category}'),
          brand_id = COALESCE(brand_id, ${it.brandKey ? `'${BRAND[it.brandKey]}'` : 'NULL'}),
          updated_at = now()
      WHERE id = '${existingRow.id}'
      RETURNING id;
    `);
    catalogIdByName[it.name] = updated[0].id;
  } else {
    const inserted = await sql(`insert catalog: ${it.name}`, `
      INSERT INTO public.equipment_catalog (name, name_en, category_id, brand_id, image_url, is_active)
      VALUES ('${sqlEsc(it.name)}', '${sqlEsc(it.name_en)}', '${it.category}',
              ${it.brandKey ? `'${BRAND[it.brandKey]}'` : 'NULL'},
              '${sqlEsc(storedUrl)}', true)
      RETURNING id;
    `);
    catalogIdByName[it.name] = inserted[0].id;
  }
}

// Step 4: link vendor_equipment to catalog rows + replace image with the storage URL.
console.log('\n=== Step 3/4: relink vendor_equipment ===');
for (const it of items) {
  const catalogId = catalogIdByName[it.name];
  await sql(`relink vendor_equipment: ${it.name}`, `
    UPDATE public.vendor_equipment ve
    SET catalog_item_id = '${catalogId}',
        image = ec.image_url,
        updated_at = now()
    FROM public.equipment_catalog ec
    WHERE ec.id = '${catalogId}'
      AND ve.name = '${sqlEsc(it.name)}'
    RETURNING ve.id;
  `);
}

// Step 5: final report.
console.log('\n=== Step 4/4: final state ===');
const final = await sql('final report', `
  SELECT v.full_name, e.name, e.quantity, e.image, e.catalog_item_id IS NOT NULL AS linked_to_catalog
  FROM public.vendor_equipment e
  JOIN public.vendors v ON v.id = e.vendor_id
  WHERE v.phone IN ('0500000001','0500000002','0500000003')
  ORDER BY v.full_name, e.name;
`);
console.log(JSON.stringify(final, null, 2));

const beforeCount = existing.length;
const totalItems = items.length;
console.log(`\nSummary: ${beforeCount}/${totalItems} were already in equipment_catalog. ${totalItems - beforeCount} new catalog rows inserted.`);
