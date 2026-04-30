// One-shot DB cleanup: wipes vendors, projects, expenses, suggestions, clients
// (and their dependent rows). Uses the Supabase Management API; no DATABASE_URL needed.
//
// Usage: node scripts/clear-db.mjs
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_8e1c5c20236afde3110411820241cfd9da90118c';
const REF = process.env.SUPABASE_PROJECT_REF || 'akcpkjzfhtmurtwzyzhn';
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function run(label, query, attempt = 1) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
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

// Single transaction. CASCADE handles FK-dependent rows automatically.
// Categories the user asked to clear:
//   موردين  -> vendors (+ all vendor_* via CASCADE)
//   مشاريع  -> projects (+ project_* / invoices / purchase_orders via CASCADE)
//   المصروفات -> expense_payments (closest match — no plain "expenses" table)
//   المقترحات -> vendor_suggestions, equipment_suggestions
//   العملاء  -> clients (+ client_* / user_client_access via CASCADE)
// Drafts table doesn't FK to vendors, so list it explicitly.
await run('truncate target tables', `
  BEGIN;
  TRUNCATE TABLE
    public.vendors,
    public.vendor_registration_drafts,
    public.projects,
    public.expense_payments,
    public.vendor_suggestions,
    public.equipment_suggestions,
    public.clients
  RESTART IDENTITY CASCADE;
  COMMIT;
`);

await run('counts after wipe', `
  SELECT 'vendors' AS t, count(*)::int AS n FROM public.vendors UNION ALL
  SELECT 'vendor_registration_drafts', count(*)::int FROM public.vendor_registration_drafts UNION ALL
  SELECT 'vendor_approval_log', count(*)::int FROM public.vendor_approval_log UNION ALL
  SELECT 'vendor_submission_snapshots', count(*)::int FROM public.vendor_submission_snapshots UNION ALL
  SELECT 'vendor_equipment', count(*)::int FROM public.vendor_equipment UNION ALL
  SELECT 'vendor_documents', count(*)::int FROM public.vendor_documents UNION ALL
  SELECT 'vendor_financial_data', count(*)::int FROM public.vendor_financial_data UNION ALL
  SELECT 'vendor_invoices', count(*)::int FROM public.vendor_invoices UNION ALL
  SELECT 'vendor_notifications', count(*)::int FROM public.vendor_notifications UNION ALL
  SELECT 'vendor_selected_fields', count(*)::int FROM public.vendor_selected_fields UNION ALL
  SELECT 'vendor_sessions', count(*)::int FROM public.vendor_sessions UNION ALL
  SELECT 'vendor_suggestions', count(*)::int FROM public.vendor_suggestions UNION ALL
  SELECT 'vendor_travel_documents', count(*)::int FROM public.vendor_travel_documents UNION ALL
  SELECT 'vendor_activity_log', count(*)::int FROM public.vendor_activity_log UNION ALL
  SELECT 'projects', count(*)::int FROM public.projects UNION ALL
  SELECT 'project_files', count(*)::int FROM public.project_files UNION ALL
  SELECT 'project_items', count(*)::int FROM public.project_items UNION ALL
  SELECT 'project_milestones', count(*)::int FROM public.project_milestones UNION ALL
  SELECT 'project_tasks', count(*)::int FROM public.project_tasks UNION ALL
  SELECT 'invoices', count(*)::int FROM public.invoices UNION ALL
  SELECT 'purchase_orders', count(*)::int FROM public.purchase_orders UNION ALL
  SELECT 'expense_payments', count(*)::int FROM public.expense_payments UNION ALL
  SELECT 'equipment_suggestions', count(*)::int FROM public.equipment_suggestions UNION ALL
  SELECT 'clients', count(*)::int FROM public.clients UNION ALL
  SELECT 'client_documents', count(*)::int FROM public.client_documents UNION ALL
  SELECT 'client_sessions', count(*)::int FROM public.client_sessions UNION ALL
  SELECT 'user_client_access', count(*)::int FROM public.user_client_access
  ORDER BY t
`);
