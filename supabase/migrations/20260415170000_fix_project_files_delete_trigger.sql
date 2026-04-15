/*
  # Fix project_files DELETE failing with activity_logs not-null violation

  The trigger `project_file_upload_trigger` was defined as AFTER INSERT OR DELETE
  but the function `log_project_file_upload` references NEW.project_id. On DELETE,
  NEW is NULL, so the insert into activity_logs fails with a not-null violation
  on project_id.

  Fix: restrict the trigger to AFTER INSERT. Deletions are already logged to
  system_activity_log by the companion trigger `project_file_changes_trigger`.
*/

DROP TRIGGER IF EXISTS project_file_upload_trigger ON public.project_files;
CREATE TRIGGER project_file_upload_trigger
  AFTER INSERT ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION log_project_file_upload();
