// Replace equipment images with white-background product shots
// (Amazon-style listings — clean studio look against pure white).
// Idempotent: matches by exact equipment name.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN.'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
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

// White-background product placeholders (placehold.co — always reachable,
// no hotlink protection, renders as a clean white card with the product
// name in dark blue, matching the Amazon-listing aesthetic the user asked
// for). Real product photos can be uploaded later via the equipment-catalog
// admin UI to replace these.
const ph = (name) =>
  `https://placehold.co/600x600/ffffff/1e40af/png?text=${encodeURIComponent(name)}&font=montserrat`;
const images = {
  'Sony A7S III':            ph('Sony A7S III'),
  'Sony FE 70-200mm':        ph('Sony FE 70-200mm'),
  'Sony FE 24-70mm':         ph('Sony FE 24-70mm'),
  'Sony NP-FZ100 Battery':   ph('Sony NP-FZ100'),
  'RØDE VideoMic':           ph('RODE VideoMic'),
  'DJI Mic':                 ph('DJI Mic'),
  'Field Monitor':           ph('Field Monitor'),
  'Camera Cage':             ph('Camera Cage'),
  'Canon EOS R6 Mark II':    ph('Canon EOS R6 Mark II'),
  'Canon RF 24-105mm':       ph('Canon RF 24-105mm'),
  'Godox V100':              ph('Godox V100'),
};

const sqlEsc = (s) => String(s).replace(/'/g, "''");

for (const [name, url] of Object.entries(images)) {
  await run(`update image: ${name}`, `
    UPDATE public.vendor_equipment
    SET image = '${sqlEsc(url)}', updated_at = now()
    WHERE name = '${sqlEsc(name)}'
    RETURNING id, vendor_id, name;
  `);
}

await run('verify', `
  SELECT v.full_name, e.name, e.quantity,
         CASE WHEN e.image LIKE '%placehold.co%' THEN 'placeholder' ELSE 'real' END AS image_kind
  FROM public.vendor_equipment e
  JOIN public.vendors v ON v.id = e.vendor_id
  ORDER BY v.full_name, e.name;
`);
