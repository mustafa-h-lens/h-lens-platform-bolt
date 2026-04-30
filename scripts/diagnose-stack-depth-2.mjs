const TOKEN = 'sbp_8e1c5c20236afde3110411820241cfd9da90118c';
const REF = 'akcpkjzfhtmurtwzyzhn';
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(label, query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    console.log(`\n=== ${label} (HTTP ${res.status}) ===`);
    console.log(text.slice(0, 6000));
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

await sql('public.users RLS policies', `
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename='users'
  ORDER BY policyname;
`);

await sql('public.user_client_access RLS', `
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename='user_client_access'
  ORDER BY policyname;
`);

await sql('public.roles RLS', `
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename='roles'
  ORDER BY policyname;
`);

await sql('all functions called by RLS (search for query mentions)', `
  SELECT proname,
    pg_get_function_identity_arguments(p.oid) AS args,
    p.prosecdef AS security_definer,
    p.provolatile,
    LEFT(prosrc, 600) AS src_preview
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosrc LIKE '%public.users%'
  ORDER BY proname;
`);
