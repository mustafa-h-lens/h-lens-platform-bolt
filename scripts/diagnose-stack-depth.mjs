// Diagnose: (1) actual row counts after the restore, and (2) what is causing
// "stack depth limit exceeded" — typically recursive RLS policies on Postgres.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }
const REF = process.env.SUPABASE_PROJECT_REF;
if (!REF) { console.error('Missing SUPABASE_PROJECT_REF env var'); process.exit(1); }
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
    console.log(text.slice(0, 4000));
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

await sql('row counts (post-restore)', `
  SELECT 'vendors' AS t, count(*)::int AS n FROM public.vendors UNION ALL
  SELECT 'clients', count(*)::int FROM public.clients UNION ALL
  SELECT 'projects', count(*)::int FROM public.projects UNION ALL
  SELECT 'expense_payments', count(*)::int FROM public.expense_payments UNION ALL
  SELECT 'invoices', count(*)::int FROM public.invoices UNION ALL
  SELECT 'purchase_orders', count(*)::int FROM public.purchase_orders UNION ALL
  SELECT 'project_tasks', count(*)::int FROM public.project_tasks UNION ALL
  SELECT 'project_items', count(*)::int FROM public.project_items UNION ALL
  SELECT 'project_files', count(*)::int FROM public.project_files UNION ALL
  SELECT 'users', count(*)::int FROM public.users UNION ALL
  SELECT 'vendor_suggestions', count(*)::int FROM public.vendor_suggestions UNION ALL
  SELECT 'equipment_suggestions', count(*)::int FROM public.equipment_suggestions
  ORDER BY t;
`);

await sql('current max_stack_depth', `SHOW max_stack_depth;`);

await sql('expenses-related views/tables', `
  SELECT table_name, table_type
  FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE '%expense%' OR table_name LIKE '%payment%'
  ORDER BY table_name;
`);

await sql('all RLS policies on expenses-likely tables', `
  SELECT schemaname, tablename, policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename IN
    ('expense_payments','projects','project_tasks','clients','invoices','purchase_orders','users','user_client_access','task_po_allocations','vendor_invoices')
  ORDER BY tablename, policyname;
`);

await sql('helper functions used in policies', `
  SELECT proname, prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND (proname LIKE '%role%' OR proname LIKE '%admin%' OR proname LIKE '%user_can%' OR proname LIKE '%is_%')
  ORDER BY proname
  LIMIT 30;
`);
