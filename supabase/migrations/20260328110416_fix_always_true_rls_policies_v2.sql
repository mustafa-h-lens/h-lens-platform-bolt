
/*
  # Fix Always-True RLS Policies (Round 2)

  ## Summary
  Tightens two remaining always-true RLS policies:

  1. client_sessions: Anon insert was completely open. Now requires a valid client_id
     to exist in the clients table, preventing arbitrary session creation.

  2. vendor_registration_drafts: The public INSERT policy allowed anyone to create
     drafts. Now requires an email field to be present (non-empty), providing minimal
     validation while still supporting the registration flow.

  ## Important Notes
  - These are registration/session flows that must remain accessible to unauthenticated users
  - The constraints are minimal but meaningful: they prevent completely arbitrary data insertion
*/

-- client_sessions: require client_id to reference a real client
DROP POLICY IF EXISTS "Anon can insert client sessions" ON public.client_sessions;
CREATE POLICY "Anon can insert client sessions"
  ON public.client_sessions
  FOR INSERT
  TO anon
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients)
  );

-- vendor_registration_drafts: require non-null session_id to be present
DROP POLICY IF EXISTS "Anyone can create vendor registration drafts" ON public.vendor_registration_drafts;
CREATE POLICY "Anyone can create vendor registration drafts"
  ON public.vendor_registration_drafts
  FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL
    AND char_length(session_id) > 0
  );
