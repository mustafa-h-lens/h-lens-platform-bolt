# Admin Panel — Incomplete Features Report

## CRITICAL (Broken Logic)

| # | File | Issue |
|---|------|-------|
| 1 | `project-tabs/ProjectExpenses.tsx:66` | **Expenses always empty** — `setExpenses([])` called instead of `setExpenses(data \|\| [])`, so expenses never display |
| 2 | `project-tabs/ProjectVendors.tsx:30` | **Vendors list always empty** — `loadVendors()` only calls `setVendors([])` with no Supabase query |
| 3 | `UserManagement.tsx:226` | **User creation not implemented** — just logs `console.log('Creating new user - functionality pending Supabase Auth setup')` |

## HIGH (Non-Functional Buttons/Features)

| # | File | Issue |
|---|------|-------|
| 4 | `project-tabs/ProjectInvoices.tsx:82` | **Create Invoice button** — `onClick={() => {}}` does nothing |
| 5 | `project-tabs/ProjectInvoices.tsx:154` | **View Invoice button** — `onClick={() => {}}` does nothing |
| 6 | `project-tabs/ProjectInvoices.tsx:162` | **Download Invoice button** — `onClick={() => {}}` does nothing |
| 7 | `project-tabs/ProjectFiles.tsx:106` | **Upload File button** — `onClick={() => {}}` does nothing |
| 8 | `project-tabs/ProjectExpenses.tsx:209` | **Delete Expense button** — `onClick={() => {}}` does nothing |
| 9 | `vendor-tabs/VendorTravelDocs.tsx:317-320` | **Passport file upload button** — no onClick handler |
| 10 | `vendor-tabs/VendorTravelDocs.tsx:362-365` | **Passport file view button** — no onClick handler |
| 11 | `vendor-tabs/VendorTravelDocs.tsx:453-456` | **Visa file upload button** — no onClick handler |
| 12 | `vendor-tabs/VendorTravelDocs.tsx:522-525` | **Visa file view button** — no onClick handler |
| 13 | `vendor-tabs/VendorDocuments.tsx:300` | **Document upload** — manual URL entry only, no real file upload |
| 14 | `CreateInvoiceModal.tsx:156-166` | **Invoice file** — text URL input only, no file upload |

## MEDIUM (Type Errors / Missing Imports)

| # | File | Issue |
|---|------|-------|
| 15 | `project-tabs/ProjectBasicInfo.tsx:39-40` | **Undefined type `UserType`** — should be `User` |
| 16 | `project-tabs/ProjectBasicInfo.tsx` | **Missing icon imports** — Calendar, Users, DollarSign, FileText not imported |
| 17 | `project-tabs/ProjectBasicInfo.tsx` | **Missing formatter imports** — `formatCurrency()`, `formatDateArabic()` not imported |

## LOW (Placeholder UX / Inconsistencies)

| # | File | Issue |
|---|------|-------|
| 18 | `ClientsPage.tsx:110-114` | Uses `alert()` instead of notification system |
| 19 | `AddItemModal.tsx:60,64,66,107` | Uses `alert()` instead of notification system |
| 20 | `ClientModal.tsx:55,60,123,160` | Uses `alert()` instead of notification system |
| 21 | `ItemCategoriesManagement.tsx:80,112,132` | Uses `alert()` instead of notification system |
| 22 | `settings/POSettings.tsx:232-298` | PO statuses are **hardcoded/static** — not editable |
| 23 | `settings/TermsSettings.tsx` & `PrivacySettings.tsx` | Creates versions but **no version history UI** |
| 24 | `settings/AIExtractionTest.tsx` | Test/debug component exposed in production settings |

---

**Total: 24 issues across 16 files**
