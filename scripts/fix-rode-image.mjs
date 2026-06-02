// Fix RØDE VideoMic — Storage rejected the 'ø' character in the path.
// Re-upload with ASCII slug, point catalog + vendor_equipment to the new URL.
import { Buffer } from 'node:buffer';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var'); process.exit(1); }
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
    console.log(`[sql] ${label} (HTTP ${res.status}): ${text.slice(0, 200)}`);
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

// Wikimedia rate-limited / 400'd this URL repeatedly. Use a labelled placeholder
// so the image renders in PDF/canvas exports.
const src = 'https://placehold.co/640x480/1e293b/ffffff/png?text=R%C3%98DE+VideoMic';
const objectPath = 'equipment/rode-videomic.png';

let buf, contentType = 'image/png';
for (let i = 0; i < 3; i++) {
  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    contentType = r.headers.get('content-type') || contentType;
    buf = Buffer.from(await r.arrayBuffer());
    console.log(`[fetch] ok, ${buf.length} bytes (${contentType})`);
    break;
  } catch (err) {
    if (i === 2) throw err;
    await new Promise(r => setTimeout(r, 1500));
  }
}

const up = await fetch(`${PROJECT_HOST}/storage/v1/object/vendor-images/${objectPath}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': contentType,
    'x-upsert': 'true',
    'cache-control': 'public, max-age=31536000',
  },
  body: buf,
});
console.log(`[upload] HTTP ${up.status}: ${(await up.text()).slice(0, 200)}`);

const newUrl = `${PROJECT_HOST}/storage/v1/object/public/vendor-images/${objectPath}`;
console.log(`[ok] -> ${newUrl}`);

await sql('update catalog row', `
  UPDATE public.equipment_catalog
  SET image_url = '${newUrl}', updated_at = now()
  WHERE name = 'RØDE VideoMic'
  RETURNING id;
`);

await sql('update vendor_equipment', `
  UPDATE public.vendor_equipment
  SET image = '${newUrl}', updated_at = now()
  WHERE name = 'RØDE VideoMic'
  RETURNING id;
`);

await sql('verify', `
  SELECT name, image_url FROM public.equipment_catalog WHERE name = 'RØDE VideoMic';
`);
