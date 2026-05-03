// Force-delete admin@example.com and admin@h-lens.co.
// Strategy: reassign NOT-NULL FK references to a fallback admin
// (ahmed@h-lens.co), NULL out the nullable ones, then DELETE from auth.users
// (which cascades into public.users via the public.users.id -> auth.users.id
// CASCADE FK).
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || 'akcpkjzfhtmurtwzyzhn';
if (!TOKEN) { console.error('Set SUPABASE_ACCESS_TOKEN.'); process.exit(1); }
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
      await new Promise(r => setTimeout(r, 2500 * attempt));
      return sql(label, query, attempt + 1);
    }
    throw err;
  }
}

const EMAILS_TO_DELETE = ['admin@example.com', 'admin@h-lens.co'];
const FALLBACK_EMAIL = 'ahmed@h-lens.co';
const inList = EMAILS_TO_DELETE.map(e => `'${e}'`).join(', ');

await sql('preview', `
  SELECT id, email, role FROM public.users WHERE email IN (${inList})
  UNION ALL
  SELECT id, email, 'fallback' AS role FROM public.users WHERE email = '${FALLBACK_EMAIL}'
`);

// One big transaction. Uses CTE-bound fallback id; reassigns NOT NULL FKs,
// NULLs nullable ones, then deletes from auth.users.
await sql('reassign + delete', `
DO $$
DECLARE
  fallback_id uuid;
  victim_ids  uuid[];
BEGIN
  SELECT id INTO fallback_id FROM public.users WHERE email = '${FALLBACK_EMAIL}';
  IF fallback_id IS NULL THEN RAISE EXCEPTION 'Fallback admin not found'; END IF;

  SELECT array_agg(id) INTO victim_ids FROM public.users WHERE email IN (${inList});
  IF victim_ids IS NULL OR array_length(victim_ids, 1) = 0 THEN
    RAISE NOTICE 'No matching users to delete'; RETURN;
  END IF;

  -- NOT NULL FKs -> reassign to fallback admin
  UPDATE public.clients              SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.invoices             SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.item_categories      SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.production_tasks     SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.project_files        SET uploaded_by  = fallback_id WHERE uploaded_by  = ANY(victim_ids);
  UPDATE public.project_milestones   SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.project_tasks        SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.projects             SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.purchase_orders      SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);
  UPDATE public.service_items        SET created_by   = fallback_id WHERE created_by   = ANY(victim_ids);

  -- Nullable FKs -> NULL out
  UPDATE public.expense_payments        SET approved_by    = NULL WHERE approved_by    = ANY(victim_ids);
  UPDATE public.expense_payments        SET created_by     = NULL WHERE created_by     = ANY(victim_ids);
  UPDATE public.expense_payments        SET transferred_by = NULL WHERE transferred_by = ANY(victim_ids);
  UPDATE public.legal_pages             SET created_by     = NULL WHERE created_by     = ANY(victim_ids);
  UPDATE public.legal_pages_history     SET created_by     = NULL WHERE created_by     = ANY(victim_ids);
  UPDATE public.projects                SET project_manager_id = NULL WHERE project_manager_id = ANY(victim_ids);
  UPDATE public.settings_config         SET updated_by     = NULL WHERE updated_by     = ANY(victim_ids);
  UPDATE public.terms_and_privacy_settings SET updated_by  = NULL WHERE updated_by     = ANY(victim_ids);
  UPDATE public.vendor_activity_log     SET performed_by   = NULL WHERE performed_by   = ANY(victim_ids);
  UPDATE public.vendor_approval_log     SET performed_by   = NULL WHERE performed_by   = ANY(victim_ids);
  UPDATE public.vendor_documents        SET uploaded_by    = NULL WHERE uploaded_by    = ANY(victim_ids);
  UPDATE public.vendor_invoices         SET paid_by_user_id = NULL WHERE paid_by_user_id = ANY(victim_ids);
  UPDATE public.vendor_invoices         SET team_member_id  = NULL WHERE team_member_id  = ANY(victim_ids);
  UPDATE public.vendor_suggestions      SET responded_by    = NULL WHERE responded_by    = ANY(victim_ids);
  UPDATE public.vendors                 SET created_by      = NULL WHERE created_by      = ANY(victim_ids);
  UPDATE public.vendors                 SET reviewed_by     = NULL WHERE reviewed_by     = ANY(victim_ids);
  UPDATE public.vendors                 SET user_id         = NULL WHERE user_id         = ANY(victim_ids);
  -- public.activity_logs.user_id, public.client_document_types.created_by,
  -- public.client_documents.uploaded_by, public.clients.user_id, project_tasks.assigned_to,
  -- public.system_activity_log.user_id are SET NULL on delete — auto handled.
  -- public.user_client_access.user_id is CASCADE.

  -- Now safe to delete from auth.users (cascades to public.users)
  DELETE FROM auth.users WHERE id = ANY(victim_ids);
END $$;
`);

await sql('verify auth.users', `SELECT count(*)::int AS n FROM auth.users WHERE email IN (${inList})`);
await sql('verify public.users', `SELECT count(*)::int AS n FROM public.users WHERE email IN (${inList})`);

console.log('\nDone.');
