// Re-apply is_admin() and has_module_access() as SECURITY DEFINER to break
// the infinite-recursion through public.users RLS that causes
// "stack depth limit exceeded" on every page that queries with auth.
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
    console.log(text.slice(0, 1500));
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

await sql('recreate is_admin SECURITY DEFINER', `
  CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
  AS $func$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.users u
      LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
      AND u.is_active = true
      AND (
        u.role IN ('project_manager', 'super_admin')
        OR r.is_system = true
        OR u.role_id IS NOT NULL
      )
    );
  END;
  $func$;
`);

await sql('recreate has_module_access SECURITY DEFINER', `
  CREATE OR REPLACE FUNCTION public.has_module_access(p_module_key text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
  AS $func$
  BEGIN
    RETURN EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      LEFT JOIN public.role_permissions rp ON rp.role_id = r.id AND rp.module_key = p_module_key
      WHERE u.id = auth.uid()
      AND u.is_active = true
      AND (r.is_system = true OR rp.has_access = true)
    );
  END;
  $func$;
`);

await sql('verify is_admin attributes', `
  SELECT proname, prosecdef AS security_definer, provolatile,
         pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('is_admin','has_module_access')
  ORDER BY proname;
`);
