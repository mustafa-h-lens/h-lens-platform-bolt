// Re-host equipment product photos in Supabase Storage so PDF/canvas exports
// can render them (Wikimedia upload.wikimedia.org blocks cross-origin canvas reads).
import fs from 'node:fs';
import path from 'node:path';
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
    console.log(`\n[sql] ${label} (HTTP ${res.status}): ${text.slice(0, 300)}`);
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

async function downloadAndUpload(name, sourceUrl, attempt = 1) {
  try {
    console.log(`\n[fetch] ${name} <- ${sourceUrl}`);
    const r = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'HalfLensEquipmentSync/1.0 (admin@h-lens.co)' },
    });
    if (!r.ok) throw new Error(`Source HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const slug = name.toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
    const objectPath = `equipment/${slug}.${ext}`;
    console.log(`[upload] ${objectPath} (${buf.length} bytes, ${ct})`);

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
    const upText = await up.text();
    console.log(`[upload] HTTP ${up.status}: ${upText.slice(0, 200)}`);
    if (!up.ok) throw new Error(`Upload failed: ${upText}`);

    return `${PROJECT_HOST}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  } catch (err) {
    if (attempt < 3) {
      console.log(`[retry] ${name} attempt ${attempt} failed: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return downloadAndUpload(name, sourceUrl, attempt + 1);
    }
    throw err;
  }
}

const items = [
  { name: 'Sony A7S III',          src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Sony_%CE%B17S_III_21_Oct_2020a.jpg/640px-Sony_%CE%B17S_III_21_Oct_2020a.jpg' },
  { name: 'Sony FE 70-200mm',      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Sony_G_FE_70-200mm_2015_%2846916035595%29.jpg/640px-Sony_G_FE_70-200mm_2015_%2846916035595%29.jpg' },
  { name: 'Sony FE 24-70mm',       src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Sony_FE_24-70mm_F2.8_GM.jpg/640px-Sony_FE_24-70mm_F2.8_GM.jpg' },
  { name: 'Sony NP-FZ100 Battery', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sony_NP-FZ100_Battery.jpg/640px-Sony_NP-FZ100_Battery.jpg' },
  { name: 'RØDE VideoMic',         src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/R%C3%98DE_Directional_VideoMic.JPG/640px-R%C3%98DE_Directional_VideoMic.JPG' },
  { name: 'DJI Mic',               src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Rode_Wireless_Go_II_microphones.jpg/640px-Rode_Wireless_Go_II_microphones.jpg' },
  { name: 'Field Monitor',         src: 'https://placehold.co/600x400/1e293b/ffffff/png?text=Field+Monitor' },
  { name: 'Camera Cage',           src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Esper_LightCage_photogrammetry_camera_rig.jpg/640px-Esper_LightCage_photogrammetry_camera_rig.jpg' },
  { name: 'Canon EOS R6 Mark II',  src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Canon_EOS_R6_Mark_II_-_by_Henry_S%C3%B6derlund_%2852546794891%29.jpg/640px-Canon_EOS_R6_Mark_II_-_by_Henry_S%C3%B6derlund_%2852546794891%29.jpg' },
  { name: 'Canon RF 24-105mm',     src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Canon_RF_24-105mm_f4-7.1_IS_STM.jpg/640px-Canon_RF_24-105mm_f4-7.1_IS_STM.jpg' },
  { name: 'Godox V100',            src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Godox_V1Pro-S_flash_20250517102428.jpg/640px-Godox_V1Pro-S_flash_20250517102428.jpg' },
];

const sqlEsc = (s) => String(s).replace(/'/g, "''");

for (const it of items) {
  const newUrl = await downloadAndUpload(it.name, it.src);
  console.log(`[ok] ${it.name} -> ${newUrl}`);
  await sql(`update ${it.name}`, `
    UPDATE public.vendor_equipment
    SET image = '${sqlEsc(newUrl)}', updated_at = now()
    WHERE name = '${sqlEsc(it.name)}'
    RETURNING id, name;
  `);
}

const result = await sql('verify', `
  SELECT v.full_name, e.name, e.image
  FROM public.vendor_equipment e
  JOIN public.vendors v ON v.id = e.vendor_id
  ORDER BY v.full_name, e.name;
`);
console.log('\n=== FINAL STATE ===');
console.log(JSON.stringify(result, null, 2));
