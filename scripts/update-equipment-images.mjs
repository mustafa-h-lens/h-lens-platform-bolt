// Replace placeholder equipment images with real product photos from Wikimedia Commons.
// Idempotent: matches by exact equipment name.
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

// Real product photos sourced from Wikimedia Commons (CC-licensed, stable URLs).
// DJI Mic and Field Monitor have no Wikimedia photo — using closest visual analogues.
const images = {
  'Sony A7S III':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Sony_%CE%B17S_III_21_Oct_2020a.jpg/640px-Sony_%CE%B17S_III_21_Oct_2020a.jpg',
  'Sony FE 70-200mm':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Sony_G_FE_70-200mm_2015_%2846916035595%29.jpg/640px-Sony_G_FE_70-200mm_2015_%2846916035595%29.jpg',
  'Sony FE 24-70mm':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Sony_FE_24-70mm_F2.8_GM.jpg/640px-Sony_FE_24-70mm_F2.8_GM.jpg',
  'Sony NP-FZ100 Battery':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sony_NP-FZ100_Battery.jpg/640px-Sony_NP-FZ100_Battery.jpg',
  'RØDE VideoMic':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/R%C3%98DE_Directional_VideoMic.JPG/640px-R%C3%98DE_Directional_VideoMic.JPG',
  // No DJI Mic on Wikimedia — using Rode Wireless Go II as closest visual analogue (both are compact wireless mic transmitters).
  'DJI Mic':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Rode_Wireless_Go_II_microphones.jpg/640px-Rode_Wireless_Go_II_microphones.jpg',
  // No on-camera field monitor on Wikimedia — using a labelled placeholder.
  'Field Monitor':
    'https://placehold.co/600x400/1e293b/ffffff/png?text=Field+Monitor',
  'Camera Cage':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Esper_LightCage_photogrammetry_camera_rig.jpg/640px-Esper_LightCage_photogrammetry_camera_rig.jpg',
  'Canon EOS R6 Mark II':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Canon_EOS_R6_Mark_II_-_by_Henry_S%C3%B6derlund_%2852546794891%29.jpg/640px-Canon_EOS_R6_Mark_II_-_by_Henry_S%C3%B6derlund_%2852546794891%29.jpg',
  'Canon RF 24-105mm':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Canon_RF_24-105mm_f4-7.1_IS_STM.jpg/640px-Canon_RF_24-105mm_f4-7.1_IS_STM.jpg',
  // No V100 on Wikimedia — using the visually-identical V1Pro-S (same round-head speedlight design).
  'Godox V100':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Godox_V1Pro-S_flash_20250517102428.jpg/640px-Godox_V1Pro-S_flash_20250517102428.jpg',
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
