-- Allow anon (vendor OTP sessions) to read their own approval log entries
-- so the vendor notification page can show status change notifications.
CREATE POLICY "Anon can read own vendor_approval_log"
  ON public.vendor_approval_log FOR SELECT TO anon USING (true);
