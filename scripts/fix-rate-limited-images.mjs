// Re-rehost equipment images that fell back to upload.wikimedia.org during the
// previous run (rate-limited). Reads with longer backoff and updates both the
// catalog row and any vendor_equipment rows.
import { Buffer } from 'node:buffer';

const TOKEN = 'sbp_8e1c5c20236afde3110411820241cfd9da90118c';
const REF = 'akcpkjzfhtmurtwzyzhn';
const SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY3BranpmaHRtdXJ0d3p5emhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc2MzI4OCwiZXhwIjoyMDgyMzM5Mjg4fQ.CQY7hTL29xq82c06Y0GGVWWlJMDAeFmclCEgGIHtl2g';
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

async function fetchWithBackoff(url, maxAttempts = 5) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'HalfLensCatalogSync/1.0 (admin@h-lens.co)',
          'Accept': 'image/jpeg, image/png, image/*, */*',
        },
      });
      if (r.status === 429 || r.status === 503) {
        const wait = 4000 * i;
        console.log(`  [${url.slice(-40)}] HTTP ${r.status}, waiting ${wait}ms (attempt ${i}/${maxAttempts})`);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const ct = r.headers.get('content-type') || 'image/jpeg';
      const buf = Buffer.from(await r.arrayBuffer());
      return { buf, ct };
    } catch (err) {
      console.log(`  [${url.slice(-40)}] error attempt ${i}: ${err.message}`);
      if (i === maxAttempts) throw err;
      await new Promise(res => setTimeout(res, 2000 * i));
    }
  }
  throw new Error('exhausted retries');
}

async function uploadToStorage(objectPath, buf, ct) {
  const up = await fetch(`${PROJECT_HOST}/storage/v1/object/vendor-images/${objectPath}`, {
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
  return `${PROJECT_HOST}/storage/v1/object/public/vendor-images/${objectPath}`;
}

const items = [
  { name: 'Sony FE 16-35mm', slug: 'sony-fe-16-35mm', ext: 'jpg',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Sony_FE_16-35mm_F4_ZA_OSS.jpg/640px-Sony_FE_16-35mm_F4_ZA_OSS.jpg' },
];

const sqlEsc = (s) => String(s).replace(/'/g, "''");

for (const it of items) {
  console.log(`\n=== ${it.name} ===`);
  let storedUrl;
  try {
    const { buf, ct } = await fetchWithBackoff(it.src);
    const objectPath = `equipment/${it.slug}.${it.ext}`;
    storedUrl = await uploadToStorage(objectPath, buf, ct);
    console.log(`[ok] uploaded ${buf.length} bytes -> ${storedUrl}`);
  } catch (err) {
    console.log(`[!] failed to fetch ${it.name}: ${err.message}`);
    continue;
  }
  await sql(`update catalog ${it.name}`, `
    UPDATE public.equipment_catalog SET image_url = '${sqlEsc(storedUrl)}', updated_at = now()
    WHERE name = '${sqlEsc(it.name)}'
    RETURNING id;
  `);
  await sql(`update vendor_equipment ${it.name}`, `
    UPDATE public.vendor_equipment SET image = '${sqlEsc(storedUrl)}', updated_at = now()
    WHERE name = '${sqlEsc(it.name)}'
    RETURNING id;
  `);
}

const v = await sql('verify still-wiki', `
  SELECT name, image_url FROM public.equipment_catalog
  WHERE image_url LIKE 'https://upload.wikimedia.org/%'
  ORDER BY name;
`);
console.log('\n=== Still pointing at Wikimedia (should be empty) ===');
console.log(JSON.stringify(v, null, 2));
