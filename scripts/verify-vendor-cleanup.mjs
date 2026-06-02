// Verify no orphan rows remain for the 21 deleted vendor IDs.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN.'); process.exit(1); }
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(q, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  } catch (e) {
    if (attempt < 4) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return sql(q, attempt + 1);
    }
    throw e;
  }
}

const IDS = [
  'a3f79e9a-9764-4ff2-b47d-d483720a371f','819933f8-b425-4030-bedf-25f1391d3287',
  '492f8925-e013-4d1b-a6c2-7ebd38dfdab9','c5e597d4-4355-4d05-82af-203dd7c8cb24',
  '0dfac4f3-dd8d-4253-bb2c-9bb5b213c9ba','9f08d6ee-9a12-4f90-ac5b-e9ebafad363d',
  '64b2ae11-8942-4276-a508-f63b8bc350b8','17141149-43d9-476e-aaec-beeff6393ee4',
  'b63b59d6-0588-463b-a69c-b26e623af946','b6063133-4a56-4d4a-809b-f45b0c4b52c0',
  '86646d01-e165-4e0d-987e-8177c7901f7d','e1df4dd0-99e9-4f87-954a-f33d95496021',
  '03bdd32a-c0ca-408f-bceb-c16f43b5cae8','95767c61-a1f3-4caf-995d-8007bb373ac9',
  '90021f5a-29ed-4b44-ac6d-515974346843','80d23f4a-812b-4eba-9d71-53865f6f6463',
  '0d6a7470-7a29-49f0-a8a1-147b14511c4a','d3e17222-30f1-4d44-baf3-605961736347',
  '344d674a-2aac-4d4c-9f09-4cb1a333c3eb','1110b14b-9e59-44c0-9608-8b49e47f5954',
  'c7e64aae-f3d2-4468-b9d8-a20294733fec',
];
const inList = IDS.map(i => `'${i}'`).join(', ');

// 1. Find every public table with a vendor_id column.
const cols = await sql(`
  SELECT table_name FROM information_schema.columns
  WHERE table_schema='public' AND column_name='vendor_id'
  ORDER BY table_name
`);
console.log(`Scanning ${cols.length} vendor_id table(s)...\n`);

let orphans = 0;
for (const { table_name } of cols) {
  const r = await sql(`SELECT count(*)::int AS n FROM public.${table_name} WHERE vendor_id IN (${inList})`);
  const n = r[0]?.n || 0;
  console.log(`  ${n === 0 ? 'OK ' : 'HIT'} ${table_name}: ${n}`);
  if (n > 0) orphans += n;
}

// 2. Confirm vendors gone.
const v = await sql(`SELECT count(*)::int AS n FROM public.vendors WHERE id IN (${inList})`);
console.log(`\nvendors remaining: ${v[0].n}`);
console.log(`Total orphan child rows: ${orphans}`);
