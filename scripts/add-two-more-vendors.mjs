// Add two more vendors:
//   1. عبدالله بن معيض بن دويشر النعيم الشراري — مصور فيديو, 11 equipment items
//   2. هاني بن قبلان بن فرحان الفليحاني الشراري — مساعد, no equipment
// - Uploads each vendor's ID card image to Supabase Storage and links it.
// - Reuses existing equipment_catalog rows where possible; inserts new ones with
//   re-hosted images for the items not yet in catalog.
// Idempotent: vendor matched by phone, equipment by (vendor_id, name), catalog by name.
import fs from 'node:fs';
import { Buffer } from 'node:buffer';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var'); process.exit(1); }

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
    console.log(`[sql] ${label} (HTTP ${res.status}): ${text.slice(0, 300)}`);
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

async function uploadBuffer(objectPath, buf, contentType, attempt = 1) {
  try {
    const up = await fetch(`${PROJECT_HOST}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': contentType,
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
      console.log(`[retry upload ${objectPath}] ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return uploadBuffer(objectPath, buf, contentType, attempt + 1);
    }
    throw err;
  }
}

async function uploadFromUrl(slug, sourceUrl, attempt = 1) {
  try {
    const r = await fetch(sourceUrl);
    if (!r.ok) throw new Error(`Source HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const objectPath = `equipment/${slug}.${ext}`;
    return await uploadBuffer(objectPath, buf, ct);
  } catch (err) {
    if (attempt < 3) {
      console.log(`[retry fetch ${slug}] ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return uploadFromUrl(slug, sourceUrl, attempt + 1);
    }
    throw err;
  }
}

const sqlEsc = (s) => String(s).replace(/'/g, "''");

// Brand IDs.
const BRAND = {
  sony:  'e9ca1af2-f053-4bc0-9d73-3482ff42fe44',
  godox: 'bdcb7e2a-c2a3-40f3-8908-125ef8d0955f',
};
// Category IDs.
const CAT = {
  camera:      '04809fe3-8d55-4d9c-811c-d90b4633ab90',
  lens:        '53e0192a-40f8-4293-a836-2fe863ff8e86',
  audio:       '484e45ca-f5e2-43be-8264-333c805befa3',
  lighting:    'cbf55fcd-240c-4cb7-afee-6dc83933a4ef',
  accessories: '744dcb6b-48bd-477e-b3f8-d1b46b6b07a0',
};

// ── Step 1: Look up / create the Neewer brand and the مساعد field ──
const neewerRows = await sql('lookup Neewer brand', `
  SELECT id FROM public.equipment_brands
  WHERE lower(name_en) = 'neewer' OR name ILIKE '%نيوار%' OR name ILIKE '%نيوير%'
  LIMIT 1
`);
let neewerId;
if (neewerRows.length === 0) {
  const created = await sql('insert Neewer brand', `
    INSERT INTO public.equipment_brands (name, name_en, is_active, display_order)
    VALUES ('نيوير', 'Neewer', true, 26)
    RETURNING id;
  `);
  neewerId = created[0].id;
} else {
  neewerId = neewerRows[0].id;
}

// Look up / create generic "مساعد" vendor_field under "Production Management" parent.
const ASSISTANT_PARENT = '1cfa8230-3182-4d0b-bb6f-054475b48b53';
const asstRows = await sql('lookup مساعد field', `
  SELECT id FROM public.vendor_fields
  WHERE name_ar = 'مساعد' AND name_en = 'Assistant'
  LIMIT 1
`);
let assistantFieldId;
if (asstRows.length === 0) {
  const created = await sql('insert مساعد field', `
    INSERT INTO public.vendor_fields (name_ar, name_en, parent_id, display_order, is_active)
    VALUES ('مساعد', 'Assistant', '${ASSISTANT_PARENT}', 99, true)
    RETURNING id;
  `);
  assistantFieldId = created[0].id;
} else {
  assistantFieldId = asstRows[0].id;
}
const FIELD_CAMERA_OPERATOR = 'a23e7293-c323-4984-8e73-fef4ee5fa918'; // مصور كاميرا

// ── Step 2: Build catalog plan — items needed by vendor 1 ──
// Items already in catalog (skip insert, just look up id):
//   Sony A7S III, Sony FE 24-70mm, Sony FE 70-200mm
// New items to insert with images:
const newCatalog = [
  { name: 'Sony FX3',                      name_en: 'Sony FX3',                      brandId: BRAND.sony,  category: CAT.camera,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Sony_FX3_with_Sony_FE_24mm_F1.4_GM_-_by_Henry_S%C3%B6derlund_%2851061907312%2C_cropped%29.jpg/640px-Sony_FX3_with_Sony_FE_24mm_F1.4_GM_-_by_Henry_S%C3%B6derlund_%2851061907312%2C_cropped%29.jpg' },
  { name: 'Sony A7 III',                   name_en: 'Sony α7 III',                   brandId: BRAND.sony,  category: CAT.camera,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Sony_Alpha7_III_20_apr_2018f.jpg/640px-Sony_Alpha7_III_20_apr_2018f.jpg' },
  { name: 'Sony FE 16-35mm',               name_en: 'Sony FE 16-35mm',               brandId: BRAND.sony,  category: CAT.lens,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Sony_FE_16-35mm_F4_ZA_OSS.jpg/640px-Sony_FE_16-35mm_F4_ZA_OSS.jpg' },
  { name: 'Sony FE 85mm',                  name_en: 'Sony FE 85mm',                  brandId: BRAND.sony,  category: CAT.lens,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Sony_FE_85mm_F1.4_GM_-_by_Henry_S%C3%B6derlund_%2851195890541%29.jpg/640px-Sony_FE_85mm_F1.4_GM_-_by_Henry_S%C3%B6derlund_%2851195890541%29.jpg' },
  { name: 'Godox V1Pro-S',                 name_en: 'Godox V1Pro-S',                 brandId: BRAND.godox, category: CAT.lighting,
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Godox_V1Pro-S_flash_20250517102428.jpg/640px-Godox_V1Pro-S_flash_20250517102428.jpg' },
  { name: 'Godox SU1 Wireless Trigger',    name_en: 'Godox SU1 Wireless Trigger',    brandId: BRAND.godox, category: CAT.accessories,
    img: 'https://placehold.co/640x480/1e293b/ffffff/png?text=Godox+SU1' },
  { name: 'Neewer Pro Wireless Mic',       name_en: 'Neewer Pro Wireless Mic',       brandId: neewerId,    category: CAT.audio,
    img: 'https://placehold.co/640x480/1e293b/ffffff/png?text=Neewer+Pro+Mic' },
  { name: 'Sony TOUGH G V90 256GB',        name_en: 'Sony TOUGH G V90 256GB',        brandId: BRAND.sony,  category: CAT.accessories,
    img: 'https://placehold.co/640x480/1e293b/ffffff/png?text=Sony+TOUGH+G+V90+256GB' },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Insert/update each new catalog item.
const catalogIdByName = {};
for (const it of newCatalog) {
  const slug = slugify(it.name);
  let storedUrl;
  try {
    storedUrl = await uploadFromUrl(slug, it.img);
  } catch (err) {
    console.log(`[!] image rehost failed for ${it.name}: ${err.message}; falling back to source URL`);
    storedUrl = it.img;
  }
  console.log(`[ok] ${it.name} -> ${storedUrl}`);

  // Look up existing by name; insert if missing; update image_url either way.
  const existing = await sql(`lookup catalog ${it.name}`, `
    SELECT id FROM public.equipment_catalog WHERE name = '${sqlEsc(it.name)}' LIMIT 1
  `);
  if (existing.length > 0) {
    const updated = await sql(`update catalog ${it.name}`, `
      UPDATE public.equipment_catalog
      SET image_url = '${sqlEsc(storedUrl)}',
          name_en = COALESCE(name_en, '${sqlEsc(it.name_en)}'),
          category_id = COALESCE(category_id, '${it.category}'),
          brand_id = COALESCE(brand_id, '${it.brandId}'),
          updated_at = now()
      WHERE id = '${existing[0].id}'
      RETURNING id;
    `);
    catalogIdByName[it.name] = updated[0].id;
  } else {
    const inserted = await sql(`insert catalog ${it.name}`, `
      INSERT INTO public.equipment_catalog (name, name_en, category_id, brand_id, image_url, is_active)
      VALUES ('${sqlEsc(it.name)}', '${sqlEsc(it.name_en)}', '${it.category}',
              '${it.brandId}', '${sqlEsc(storedUrl)}', true)
      RETURNING id;
    `);
    catalogIdByName[it.name] = inserted[0].id;
  }
}

// Look up the catalog rows that already existed.
const reusedRows = await sql('lookup existing catalog rows', `
  SELECT id, name, image_url FROM public.equipment_catalog
  WHERE name IN ('Sony A7S III','Sony FE 24-70mm','Sony FE 70-200mm');
`);
for (const r of reusedRows) catalogIdByName[r.name] = r.id;
const imagesByName = Object.fromEntries(reusedRows.map(r => [r.name, r.image_url]));

// ── Step 3: Upload ID card images for both vendors ──
const id1Buf = fs.readFileSync('C:/Users/amroa/.claude/image-cache/9d220f59-e50c-4c0f-a353-2e45a9b2593d/41.jpeg');
const id2Buf = fs.readFileSync('C:/Users/amroa/.claude/image-cache/9d220f59-e50c-4c0f-a353-2e45a9b2593d/43.jpeg');
const id1Url = await uploadBuffer('id-cards/abdullah-alsharari.jpg', id1Buf, 'image/jpeg');
const id2Url = await uploadBuffer('id-cards/hani-alsharari.jpg', id2Buf, 'image/jpeg');
console.log(`[ok] ID card 1 -> ${id1Url}`);
console.log(`[ok] ID card 2 -> ${id2Url}`);

// ── Step 4: Insert vendors ──
const vendors = [
  {
    full_name: 'عبدالله بن معيض بن دويشر النعيم الشراري',
    phone: '0500000004',
    primary_field: 'مصور فيديو',
    field_id: FIELD_CAMERA_OPERATOR,
    id_number: '1088257603',
    id_expiry: '2026-07-21',
    nationality: 'سعودي',
    primary_city: 'القريات',
    id_image: id1Url,
  },
  {
    full_name: 'هاني بن قبلان بن فرحان الفليحاني الشراري',
    phone: '0500000005',
    primary_field: 'مساعد',
    field_id: assistantFieldId,
    id_number: '1134561917',
    id_expiry: '2027-06-07',
    nationality: 'سعودي',
    primary_city: 'سكاكا',
    id_image: id2Url,
  },
];

for (const v of vendors) {
  await sql(`upsert vendor: ${v.full_name}`, `
    INSERT INTO public.vendors
      (full_name, phone, country_code, primary_field, vendor_type, status,
       id_number, id_expiry_date, nationality, primary_city, id_image)
    SELECT '${sqlEsc(v.full_name)}', '${sqlEsc(v.phone)}', '+966',
           '${sqlEsc(v.primary_field)}', 'individual', 'active',
           '${sqlEsc(v.id_number)}', '${v.id_expiry}', '${sqlEsc(v.nationality)}',
           '${sqlEsc(v.primary_city)}', '${sqlEsc(v.id_image)}'
    WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE phone = '${sqlEsc(v.phone)}')
    RETURNING id, full_name;
  `);

  // Always update id_image / details for an existing row in case they were null.
  await sql(`update vendor details: ${v.full_name}`, `
    UPDATE public.vendors SET
      id_number = '${sqlEsc(v.id_number)}',
      id_expiry_date = '${v.id_expiry}',
      nationality = '${sqlEsc(v.nationality)}',
      primary_city = '${sqlEsc(v.primary_city)}',
      id_image = '${sqlEsc(v.id_image)}',
      updated_at = now()
    WHERE phone = '${sqlEsc(v.phone)}'
    RETURNING id;
  `);

  await sql(`link field: ${v.full_name}`, `
    INSERT INTO public.vendor_selected_fields (vendor_id, field_id, currency)
    SELECT ve.id, '${v.field_id}', 'SAR'
    FROM public.vendors ve
    WHERE ve.phone = '${sqlEsc(v.phone)}'
      AND NOT EXISTS (
        SELECT 1 FROM public.vendor_selected_fields vsf
        WHERE vsf.vendor_id = ve.id AND vsf.field_id = '${v.field_id}'
      )
    RETURNING id;
  `);
}

// ── Step 5: Insert equipment for vendor 1 (عبدالله) ──
const v1Equipment = [
  { name: 'Sony FX3',                   type: 'كاميرا',    qty: 1 },
  { name: 'Sony A7S III',               type: 'كاميرا',    qty: 1 },
  { name: 'Sony A7 III',                type: 'كاميرا',    qty: 2 },
  { name: 'Sony FE 24-70mm',            type: 'عدسة',      qty: 1 },
  { name: 'Sony FE 70-200mm',           type: 'عدسة',      qty: 1 },
  { name: 'Sony FE 16-35mm',            type: 'عدسة',      qty: 1 },
  { name: 'Sony FE 85mm',               type: 'عدسة',      qty: 1 },
  { name: 'Godox V1Pro-S',              type: 'إضاءة',     qty: 1 },
  { name: 'Godox SU1 Wireless Trigger', type: 'اكسسوارات', qty: 1 },
  { name: 'Neewer Pro Wireless Mic',    type: 'صوت',       qty: 1 },
  { name: 'Sony TOUGH G V90 256GB',     type: 'اكسسوارات', qty: 5 },
];

const VENDOR1_PHONE = '0500000004';
for (const e of v1Equipment) {
  const catalogId = catalogIdByName[e.name];
  if (!catalogId) {
    console.log(`[!] no catalog id for ${e.name}, skipping`);
    continue;
  }
  // Resolve image URL: from new catalog (just rehosted) or from existing row.
  const imgRow = await sql(`lookup catalog image ${e.name}`, `
    SELECT image_url FROM public.equipment_catalog WHERE id = '${catalogId}';
  `);
  const imageUrl = imgRow[0]?.image_url || '';

  await sql(`equipment: ${e.name}`, `
    INSERT INTO public.vendor_equipment
      (vendor_id, name, type, image, quantity, catalog_item_id)
    SELECT ve.id, '${sqlEsc(e.name)}', '${sqlEsc(e.type)}', '${sqlEsc(imageUrl)}',
           ${e.qty}, '${catalogId}'
    FROM public.vendors ve
    WHERE ve.phone = '${VENDOR1_PHONE}'
      AND NOT EXISTS (
        SELECT 1 FROM public.vendor_equipment veq
        WHERE veq.vendor_id = ve.id AND veq.name = '${sqlEsc(e.name)}'
      )
    RETURNING id, name, quantity;
  `);
}

// Final summary.
const summary = await sql('summary', `
  SELECT v.full_name, v.phone, v.primary_field, v.id_number, v.primary_city,
         (SELECT count(*) FROM public.vendor_equipment e WHERE e.vendor_id = v.id) AS equipment_count,
         v.id_image IS NOT NULL AS has_id_image
  FROM public.vendors v
  WHERE v.phone IN ('0500000004','0500000005')
  ORDER BY v.full_name;
`);
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
