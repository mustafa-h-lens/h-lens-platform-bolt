# QA Audit Report — Vendors Management System

**Date:** 2026-03-07
**Audited by:** Claude Code
**Total Findings:** 15 (4 Critical, 7 High, 4 Medium)

---

## Settings Module

### #1 — CRITICAL: TermsSettings & PrivacySettings query non-existent table
- **Files:** `src/components/admin/settings/TermsSettings.tsx:42`, `src/components/admin/settings/PrivacySettings.tsx:42`
- **Description:** Both components query `legal_pages` table via Supabase, but this table does not exist in any migration. The database has `terms_and_privacy_settings` (from migration `20260227234112`) which is never used by the frontend.
- **Impact:** Both settings tabs crash at runtime with "relation 'legal_pages' does not exist".
- **Fix:** Update both components to query `terms_and_privacy_settings` table instead of `legal_pages`, matching the column names from the migration schema.

### #4 — CRITICAL: POSettings save fails when no default record exists
- **File:** `src/components/admin/settings/POSettings.tsx:57`
- **Description:** `handleSave()` calls `.eq('id', settings?.id)` to update the record. On first use, `loadSettings()` returns null (no record exists), so `settings` stays null. Clicking save tries to match `id = null`, which silently fails.
- **Impact:** PO settings can never be saved on a fresh system. No error shown to user.
- **Fix:** Add upsert logic — if no record exists, INSERT a new one instead of UPDATE.

---

## Project Tabs Module

### #2 — CRITICAL: ProjectInvoices has 3 non-functional buttons
- **File:** `src/components/admin/project-tabs/ProjectInvoices.tsx:82,154,162`
- **Description:** Three buttons have empty click handlers `onClick={() => {}}`:
  1. **Line 82** — "إصدار فاتورة" (Create Invoice)
  2. **Line 154** — "عرض" (View Invoice)
  3. **Line 162** — "تحميل" (Download Invoice)
- **Impact:** Users see interactive buttons that do nothing. Core invoice workflow is broken.
- **Fix:** Implement invoice creation modal, PDF view, and PDF download functionality — or hide the buttons until implemented.

### #11 — HIGH: ProjectItems missing `currency` prop
- **File:** `src/components/admin/ImprovedProjectDetails.tsx:338`
- **Description:** `<ProjectItems projectId={projectId} />` is rendered without the required `currency` prop. The `ProjectItems` component signature requires `{ projectId, currency }`.
- **Impact:** Currency displays incorrectly or component may error depending on fallback handling.
- **Fix:** Pass `currency={project.currency}` to the `ProjectItems` component.

---

## Vendor Portal Module (vendor self-service)

### #3 — CRITICAL: Equipment suggestion fakes success
- **File:** `src/components/vendor/VendorPortal.tsx:1189-1194`
- **Description:** `sendSuggestion()` function sets `setSuggSent(true)` and shows a success message, but the body contains only a TODO comment — no Supabase insert or API call is made.
- **Impact:** Vendors believe their equipment suggestion was submitted when it was silently discarded.
- **Fix:** Create a `vendor_suggestions` table (or similar) and insert the suggestion text + vendor ID. Alternatively, remove the feature until implemented.

### #10 — HIGH: Document delete leaves orphaned files in storage
- **File:** `src/components/vendor/VendorPortal.tsx:1371-1375`
- **Description:** `deleteDoc()` deletes the DB record from `vendor_documents` but does not call `supabase.storage.from('vendor-documents').remove([filePath])` to clean up the actual file.
- **Impact:** Storage bucket accumulates orphaned files over time, wasting space and potentially leaking sensitive documents.
- **Fix:** Extract the file path from the document's URL before deleting the DB record, then call storage `.remove()`.

---

## Vendor Tabs Module (admin-side vendor management)

### #9 — HIGH: VendorInvoices "عرض المشروع" button has no handler
- **File:** `src/components/admin/vendor-tabs/VendorInvoices.tsx:152`
- **Description:** The "عرض المشروع" (View Project) button renders with an `<ExternalLink>` icon but has no `onClick` handler. It appears interactive but does nothing.
- **Impact:** Admin cannot navigate to the related project from the vendor invoices tab.
- **Fix:** Add `onClick` that calls `navigate('/projects/' + invoice.project_id)` or accept an `onViewProject` callback prop.

### #12 — MEDIUM: VendorTravelDocs allows invalid date ranges
- **File:** `src/components/admin/vendor-tabs/VendorTravelDocs.tsx:210`
- **Description:** Visa form validates that country and expiry_date exist, but does not check that `start_date < expiry_date`. Users can save a visa with start date after expiry date.
- **Impact:** Invalid visa records in the database; confusing data for admin review.
- **Fix:** Add validation check before save: if `start_date >= expiry_date`, show error and block submission.

### #13 — MEDIUM: VendorEquipment uses brittle hardcoded category names
- **File:** `src/components/admin/vendor-tabs/VendorEquipment.tsx:175-207`
- **Description:** Special-case logic matches equipment categories by comparing Arabic name strings (e.g., checking for "Lighting", "Accessories"). If category names change in the database, this logic silently breaks.
- **Impact:** Category-specific behavior stops working if admin renames categories in settings.
- **Fix:** Use category IDs or a `category_code` field instead of matching by display name.

### #15 — MEDIUM: VendorPersonalInfo lacks input validation
- **File:** `src/components/admin/vendor-tabs/VendorPersonalInfo.tsx`
- **Description:** Phone number field accepts any digits (no Saudi format validation like `05XXXXXXXX`). Estimated cost field accepts negative numbers. ID number field allows 0-length input.
- **Impact:** Invalid vendor data can be saved to the database.
- **Fix:** Add regex validation for phone (`/^05\d{8}$/`), min=0 for cost, and length check for ID number.

---

## Clients Module

### #5 — HIGH: ClientsPage has English text in Arabic UI
- **File:** `src/components/admin/ClientsPage.tsx:182,258,263`
- **Description:** Several UI strings are in English instead of Arabic:
  - Line 182: `"Sort by: {getSortLabel(sortBy)}"`
  - Line 258: `"Projects"`
  - Line 263: `"Updated on"`
  - `getSortLabel()` function (lines 130-141) returns English labels
- **Impact:** Inconsistent bilingual UI experience for Arabic-speaking users.
- **Fix:** Replace all English strings with Arabic equivalents. Update `getSortLabel()` to return Arabic labels.

### #6 — HIGH: ClientsPage uses native browser dialogs
- **File:** `src/components/admin/ClientsPage.tsx:95,111-113`
- **Description:** Uses `confirm()` for delete confirmation and `alert()` for error messages instead of the project's `NotificationContext` and `ConfirmationModal` pattern used elsewhere.
- **Impact:** Inconsistent UX — native dialogs block the UI thread and look different from the rest of the app.
- **Fix:** Import `useNotification` context and replace `confirm()` with `confirm()` from context, replace `alert()` with `showError()`.

### #7 — HIGH: ClientsPage has N+1 query problem
- **File:** `src/components/admin/ClientsPage.tsx:69-81`
- **Description:** First loads all clients, then loops through each client to make a separate query for project count. With 100 clients, this makes 101 database queries.
- **Impact:** Slow page load, excessive Supabase API calls, potential rate limiting.
- **Fix:** Use a single query with aggregation or a Postgres view/function that returns clients with their project counts.

---

## User Management Module

### #8 — HIGH: UserManagement uses alert() and has dead code
- **File:** `src/components/admin/UserManagement.tsx:253,12,25,32`
- **Description:** Two issues in one component:
  1. Uses native `alert()` for error display (line 253) instead of NotificationContext
  2. Fetches `clients` data (line 25) and passes it to UserModal, but neither the state nor the prop is ever used — dead code
- **Impact:** Inconsistent error UX; unnecessary database query on every load.
- **Fix:** Replace `alert()` with `showError()`. Remove unused `clients` state, fetch call, and prop.

---

## Cross-cutting

### #14 — MEDIUM: Multiple components use console.error only
- **Files:**
  - `src/components/admin/VendorsPage.tsx:79-84`
  - `src/components/admin/ProjectsList.tsx:63`
  - `src/components/admin/EnhancedProjectsPage.tsx:94-95`
  - `src/components/admin/ClientDetails.tsx:49-54`
- **Description:** Data fetch errors are caught and logged to `console.error()` but no user-facing error notification is shown. Users see empty states or infinite loading with no explanation.
- **Impact:** Users have no way to know something went wrong or to retry.
- **Fix:** Add `showError('حدث خطأ في تحميل البيانات')` in each catch block using NotificationContext.

---

## Summary by Module

| Module | Critical | High | Medium | Total |
|--------|----------|------|--------|-------|
| Settings | 2 | 0 | 0 | **2** |
| Project Tabs | 1 | 1 | 0 | **2** |
| Vendor Portal | 1 | 1 | 0 | **2** |
| Vendor Tabs (admin) | 0 | 1 | 3 | **4** |
| Clients | 0 | 3 | 0 | **3** |
| User Management | 0 | 1 | 0 | **1** |
| Cross-cutting | 0 | 0 | 1 | **1** |
| **Total** | **4** | **7** | **4** | **15** |
