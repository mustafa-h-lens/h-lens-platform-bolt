# Technical Research: Vendor Registration Approval Flow

**Project:** idaratech-workspace (Half Lens Vendor Management)
**Date:** 2026-03-14
**Type:** Feature Feasibility & Solution Design (Post-Adversarial Review)
**Researcher:** Claude (Technical Research Agent)

---

## 1. Problem Statement

Currently, when a vendor completes the 7-step registration form, their record is **immediately set to `active`** status and they can log in right away. There is no review or approval step for the admin team.

**Goal:** Introduce an approval workflow where:
1. Admin receives pending registration requests in the Vendors tab
2. Admin can **Approve** the vendor
3. Admin can **Reject** the vendor with a reason
4. Admin can **Send back for edits** with specific notes on what needs to change

---

## 2. Current System Analysis

### 2.1 Vendor Registration (7 Steps)
| Step | Data Collected |
|------|---------------|
| 1. Basic Identity | full_name, nationality, vendor_type |
| 2. Contact Info | phone, country_code, primary_city, other_cities |
| 3. Identity Documents | id_number, id_image, profile_image |
| 4. Travel Info | passport_number, visa_country, visa_file |
| 5. Financial Data | bank_id, account_name, iban, price_includes_tax |
| 6. Fields & Rates | selected_fields with rate_from/rate_to per field |
| 7. Review | Confirmation & submit |

**On submit** (`VendorRegistrationForm.tsx` line ~246): status is set to `'active'`.

### 2.2 Database Tables Involved
- `vendors` — main record (status: active|inactive|blocked)
- `vendor_travel_documents` — passport/visa data
- `vendor_financial_data` — banking details
- `vendor_selected_fields` — specialties with rates
- `vendor_registration_drafts` — auto-saved drafts (session-based, 30-day expiry)

### 2.3 Admin Vendors Tab (`VendorsPage.tsx`)
- Table list with search & filters (status, nationality, city, field, cost range)
- Summary stat cards: Total, Active, Inactive, Blocked
- Bulk operations: delete, export
- Click → `VendorDetails.tsx` with 7 tabs (Dashboard, Personal Info, Travel Docs, Equipment, Financial, Invoices, Documents)

### 2.4 Email Infrastructure
- **Transport:** Brevo SMTP via Nodemailer (Supabase Edge Function)
- **Template:** Arabic RTL HTML, table-based layout, Half Lens branding
- **Design tokens:** Header gradient `#0a0f1e → #1a2332`, accent blue `#2563eb`, card backgrounds `#f8fafc` / `#f1f5f9`
- **Edge Function:** `supabase/functions/send-otp-email/index.ts`
- **Secrets:** SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME

### 2.5 Vendor Login Flow
- OTP-based (no passwords) — vendor enters email → receives OTP → verifies
- `send-otp-email` function checks vendor exists before sending OTP
- Currently does **not** check vendor status — any existing vendor can request OTP

---

## 3. Proposed Solution

### 3.1 Database Changes

#### 3.1.1 Extend `vendors.status` Field with CHECK Constraint
Add new status values and enforce them at the database level:

| Status | Meaning |
|--------|---------|
| `pending_approval` | **NEW** — Just registered, awaiting admin review |
| `revision_requested` | **NEW** — Admin sent back for edits |
| `rejected` | **NEW** — Admin rejected the registration |
| `active` | Existing — Approved and operational |
| `inactive` | Existing — Deactivated by admin |
| `blocked` | Existing — Blocked by admin |

```sql
ALTER TABLE vendors
ADD CONSTRAINT vendors_status_check
CHECK (status IN ('pending_approval', 'revision_requested', 'rejected', 'active', 'inactive', 'blocked'));
```

#### 3.1.2 Status State Machine

Valid transitions are strictly enforced. No other transitions are permitted.

| From | Allowed To | Triggered By |
|------|-----------|-------------|
| `pending_approval` | `active`, `rejected`, `revision_requested` | Admin action |
| `revision_requested` | `pending_approval` | Vendor resubmits |
| `rejected` | `pending_approval` | Vendor re-registers with same email |
| `active` | `inactive`, `blocked` | Admin action |
| `inactive` | `active`, `blocked` | Admin action |
| `blocked` | `active`, `inactive` | Admin action |

**Enforcement:** Validate transitions in a shared helper function on the frontend. The approval log provides a full audit trail of all transitions.

#### 3.1.3 New Table: `vendor_approval_log`

```sql
CREATE TABLE vendor_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'revision_requested', 'resubmitted')),
  reason text,
  performed_by uuid REFERENCES users(id), -- NULL for vendor-initiated actions (submitted/resubmitted)
  created_at timestamptz DEFAULT now(),

  -- Enforce: reason is required for rejected and revision_requested actions
  CONSTRAINT reason_required_for_rejection_and_revision CHECK (
    (action IN ('rejected', 'revision_requested') AND reason IS NOT NULL AND reason != '')
    OR action NOT IN ('rejected', 'revision_requested')
  )
);

CREATE INDEX idx_vendor_approval_log_vendor_id ON vendor_approval_log(vendor_id);
CREATE INDEX idx_vendor_approval_log_action ON vendor_approval_log(action);
```

#### 3.1.4 Vendor Deletion Protection

Change foreign key behavior on key relations from `CASCADE` to `RESTRICT`:

```sql
-- Prevent deleting vendors that have linked business records
ALTER TABLE vendor_invoices DROP CONSTRAINT IF EXISTS vendor_invoices_vendor_id_fkey;
ALTER TABLE vendor_invoices ADD CONSTRAINT vendor_invoices_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT;

-- Same for project assignments, expenses, etc.
```

**Rules:**
- If a vendor has **any** linked business records (projects, invoices, expenses), deletion is **blocked at the database level** (`RESTRICT`)
- The UI checks before attempting delete and shows: "This vendor cannot be deleted because they have linked records. You can deactivate or block them instead."
- Only vendors with zero relations (e.g., freshly registered, never assigned to anything) can be deleted
- `ON DELETE CASCADE` is kept for non-business records: `vendor_registration_drafts`, `vendor_approval_log` (for unlinked vendors), `vendor_travel_documents`, `vendor_financial_data`, `vendor_selected_fields`

#### 3.1.5 RLS Policies
- **Admin/super_admin:** Full read/write on `vendor_approval_log` via Supabase Auth RLS
- **Vendor portal:** No RLS — vendor auth is custom OTP-based (not Supabase Auth, no `auth.uid()`). Vendor reads are filtered at the application level by `vendor_id` using the service-role key. This is consistent with the existing vendor portal architecture.

### 3.2 Registration Flow Changes

#### 3.2.1 On Submit (`VendorRegistrationForm.tsx`)
- Change status from `'active'` to `'pending_approval'`
- Insert initial log entry: `{ action: 'submitted', vendor_id, performed_by: null }`
- **Delete the registration draft** for this session (`DELETE FROM vendor_registration_drafts WHERE session_id = ...`)
- Show a **"Registration Under Review"** confirmation page instead of immediate login redirect
- Send "Registration Received" email to vendor
- Send "New Registration" notification email to admin(s)

#### 3.2.2 Re-Registration for Rejected Vendors
When a vendor attempts to register with an email that already exists in the `vendors` table:
- If status is `rejected`: **Reset the existing record** — update status to `pending_approval`, allow the vendor to go through the registration form overwriting their data, log `{ action: 'resubmitted' }` in approval log. No duplicate records created.
- If any other status: Show error message "This email is already registered."

#### 3.2.3 Confirmation Page Content
- Thank you message
- "Your registration has been received and is under review"
- "You will receive an email notification once your registration is reviewed"
- Estimated review time (optional, configurable)

#### 3.2.4 Vendor Login Gate
In `send-otp-email` Edge Function: check `vendor.status`
- If `pending_approval` → return error: "Your registration is still under review"
- If `rejected` → return error: "Your registration was not approved. Please check your email for details"
- If `revision_requested` → **allow login** (vendor needs to access portal to edit)
- If `active` → allow login (current behavior)
- If `inactive` / `blocked` → return error: "Your account is inactive/blocked"
- If unknown status → treat as blocked, log warning

### 3.3 Admin Panel Changes

#### 3.3.1 Vendors Tab — Sub-Navigation
Add an inner tab bar to `VendorsPage.tsx`:

| Tab | Filter | Badge |
|-----|--------|-------|
| **All Vendors** | `status IN ('active', 'inactive', 'blocked')` only | — |
| **Pending Requests** | `status IN ('pending_approval', 'revision_requested')` | Count badge |

**Clean separation:** "All Vendors" excludes pending/rejected/revision vendors entirely. Pending and revision requests are only visible in the "Pending Requests" tab. Rejected vendors are not shown in either tab (they're effectively archived unless they re-register).

#### 3.3.2 Admin Notifications for New Registrations
- **Email:** Send notification to all `super_admin` users when a new vendor registers. Uses the same `send-vendor-status-email` Edge Function with an `admin_new_registration` email type.
- **In-app badge:** Show a count badge on the Vendors sidebar item when there are pending requests (`pending_approval` + `revision_requested` count).

#### 3.3.3 Request Review View
A dedicated view (or modal) showing:
- **All registration data** in read-only format (same layout as VendorDetails but condensed)
- **Uploaded documents** (ID image, profile image, visa) with preview
- **Approval history** from `vendor_approval_log` (if resubmitted, show previous notes)
- **3 Action Buttons:**

| Action | Button Style | Behavior |
|--------|-------------|----------|
| **Approve** | Green/Success | Confirm dialog → checks `updated_at` optimistic lock → sets status to `active`, logs action, sends approval email |
| **Reject** | Red/Danger | Opens modal with required reason textarea → checks `updated_at` → sets status to `rejected`, logs action with reason, sends rejection email, deletes registration draft |
| **Request Edits** | Yellow/Warning | Opens modal with required notes textarea → checks `updated_at` → sets status to `revision_requested`, logs action with notes, sends revision email |

**Optimistic Lock:** When the admin loads the review view, the vendor's `updated_at` timestamp is captured. On any action, the update query includes `WHERE updated_at = :captured_updated_at`. If the row count is 0 (vendor data changed since loaded), show: "This vendor's data has changed since you loaded it. Please refresh and review again."

#### 3.3.4 Vendor Status Change Warnings
When changing an **active** vendor's status to `inactive` or `blocked`:
- Check for linked business records (active projects, unpaid invoices)
- If found, show confirmation: "This vendor has X active projects and Y unpaid invoices. Are you sure you want to change their status?"

#### 3.3.5 Vendor Deletion Protection (UI)
Before attempting to delete a vendor:
- Check for any linked business records
- If found: show "This vendor cannot be deleted because they have linked records (X projects, Y invoices). You can deactivate or block them instead."
- If no records: allow deletion with standard confirmation

#### 3.3.6 Stats Cards Update
Update the summary stats in VendorsPage to include:
- **Pending** count (`pending_approval` + `revision_requested`)

### 3.4 Vendor Portal — Revision Flow

When a vendor with `revision_requested` status logs in:

1. **Locked-down edit-only mode:** Hide Dashboard, Projects, Invoices, Equipment, Documents tabs. Only show profile editing sections.
2. **Status Banner** at the top: "Your registration requires changes. Please review the admin notes below and update your information."
3. **Admin Notes Display:** Show the latest `revision_requested` reason from `vendor_approval_log`
4. **Edit Mode:** Enable editing on: Personal Info, Travel Docs, Financial Data, Fields & Rates
5. **Resubmit Button:** After making changes, vendor clicks "Resubmit for Review"
   - Sets status back to `pending_approval`
   - Logs `{ action: 'resubmitted' }` in approval log
   - Sends resubmission confirmation email to vendor
   - Sends notification email to admin(s)

### 3.5 Email Notifications

All emails follow the **existing Half Lens email template design**:
- Arabic RTL HTML, table-based layout
- Dark gradient header with Half Lens logo
- Content card with appropriate icon/color section
- Footer with links and copyright

#### 3.5.1 Email: Registration Received (to Vendor)
**Trigger:** Vendor completes registration
**Subject:** `تأكيد استلام طلب التسجيل - Half Lens`
**Content:**

| Section | Content |
|---------|---------|
| **Header Title** | `تم استلام طلب التسجيل` (Registration Request Received) |
| **Header Subtitle** | `نظام إدارة الموردين` (Vendor Management System) |
| **Greeting** | `مرحباً {vendor_name}` |
| **Body** | `شكراً لتسجيلك في نظام Half Lens لإدارة الموردين. تم استلام طلبك بنجاح وهو الآن قيد المراجعة من قبل فريقنا.` (Thank you for registering with Half Lens Vendor Management System. Your application has been received and is now under review by our team.) |
| **Info Box** (blue `#f1f5f9`) | **حالة الطلب:** قيد المراجعة (Status: Under Review) / **تاريخ التقديم:** {date} (Submission Date) / **البريد الإلكتروني:** {email} |
| **Note Box** (yellow `#fef3c7`) | `سيتم إشعارك عبر البريد الإلكتروني بمجرد مراجعة طلبك. عادةً ما تتم المراجعة خلال 1-3 أيام عمل.` (You will be notified via email once your application is reviewed. Review typically takes 1-3 business days.) |
| **Footer** | Standard footer |

#### 3.5.2 Email: Registration Approved (to Vendor)
**Trigger:** Admin approves vendor
**Subject:** `تمت الموافقة على طلب التسجيل - Half Lens`
**Content:**

| Section | Content |
|---------|---------|
| **Header Title** | `تمت الموافقة على طلبك` (Your Application Has Been Approved) |
| **Success Box** (green `#dcfce7`, border `#22c55e`) | `✅ مبروك! تمت الموافقة على تسجيلك في نظام Half Lens لإدارة الموردين. يمكنك الآن تسجيل الدخول والوصول إلى حسابك.` (Congratulations! Your registration has been approved. You can now log in and access your account.) |
| **CTA Button** (green `#22c55e`) | `تسجيل الدخول إلى حسابك` (Log in to your account) → links to vendor login page |
| **Footer** | Standard footer |

#### 3.5.3 Email: Registration Rejected (to Vendor)
**Trigger:** Admin rejects vendor
**Subject:** `تحديث بشأن طلب التسجيل - Half Lens`
**Content:**

| Section | Content |
|---------|---------|
| **Header Title** | `تحديث حالة طلب التسجيل` (Registration Application Update) |
| **Status Box** (red `#fee2e2`, border `#ef4444`) | `نأسف لإبلاغك بأن طلب التسجيل الخاص بك لم تتم الموافقة عليه في الوقت الحالي.` (We regret to inform you that your registration application has not been approved at this time.) |
| **Reason Box** (gray `#f1f5f9`) | **سبب الرفض:** (Reason for rejection:) `{admin_reason}` |
| **Note** | `إذا كنت تعتقد أن هذا القرار تم بالخطأ أو لديك استفسار، يرجى التواصل مع فريق الدعم.` (If you believe this decision was made in error or have questions, please contact our support team.) |
| **Footer** | Standard footer |

#### 3.5.4 Email: Revision Requested (to Vendor)
**Trigger:** Admin requests edits
**Subject:** `مطلوب تعديلات على طلب التسجيل - Half Lens`
**Content:**

| Section | Content |
|---------|---------|
| **Header Title** | `مطلوب تعديلات على طلبك` (Edits Required on Your Application) |
| **Body** | `تمت مراجعة طلب التسجيل الخاص بك وهناك بعض البيانات التي تحتاج إلى تعديل قبل إتمام الموافقة.` (Your registration has been reviewed and some information needs to be updated before approval can be completed.) |
| **Notes Box** (yellow `#fef3c7`, border `#f59e0b`) | **ملاحظات المراجع:** (Reviewer Notes:) `{admin_notes}` |
| **CTA Button** (blue `#2563eb`) | `تسجيل الدخول وتعديل البيانات` (Log in and update your information) → links to vendor login |
| **Note** | `بعد إجراء التعديلات المطلوبة، اضغط على "إعادة تقديم الطلب" لإرسال طلبك مرة أخرى للمراجعة.` (After making the required changes, click "Resubmit Application" to send your application for review again.) |
| **Footer** | Standard footer |

#### 3.5.5 Email: Resubmission Confirmation (to Vendor)
**Trigger:** Vendor resubmits after edits
**Subject:** `تم إعادة تقديم طلب التسجيل - Half Lens`
**Content:**

| Section | Content |
|---------|---------|
| **Header Title** | `تم إعادة تقديم طلبك` (Your Application Has Been Resubmitted) |
| **Body** | `تم إعادة تقديم طلب التسجيل الخاص بك بنجاح وهو الآن قيد المراجعة مرة أخرى.` (Your registration application has been successfully resubmitted and is now under review again.) |
| **Info Box** | Same as registration received |
| **Footer** | Standard footer |

#### 3.5.6 Email: New Registration Notification (to Admin)
**Trigger:** Vendor completes registration or resubmits
**Subject:** `طلب تسجيل مورد جديد - Half Lens`
**Recipients:** All users with `super_admin` role
**Content:**

| Section | Content |
|---------|---------|
| **Header Title** | `طلب تسجيل مورد جديد` (New Vendor Registration Request) |
| **Body** | `تم استلام طلب تسجيل مورد جديد ويحتاج إلى مراجعتك.` (A new vendor registration request has been received and needs your review.) |
| **Info Box** (blue `#f1f5f9`) | **اسم المورد:** {vendor_name} / **نوع المورد:** {vendor_type} / **المدينة:** {city} / **تاريخ التقديم:** {date} |
| **CTA Button** (blue `#2563eb`) | `مراجعة الطلب` (Review Request) → links to admin panel vendors pending tab |
| **Footer** | Standard footer |

### 3.6 New Supabase Edge Function

#### `send-vendor-status-email`
A single Edge Function that handles all 6 email types above, well-structured internally:

```typescript
interface StatusEmailRequest {
  vendor_id: string;
  email_type: 'registration_received' | 'approved' | 'rejected' | 'revision_requested' | 'resubmitted' | 'admin_new_registration';
  reason?: string;  // Required for rejected and revision_requested
}
```

**Structure:**
- Shared base template function (header, footer, layout) — reuses exact Half Lens design
- Separate content builder per email type
- Fetches vendor data (name, email) from DB — returns clear error if vendor not found
- Uses the same SMTP configuration and Nodemailer setup as `send-otp-email`
- For `admin_new_registration`: fetches all `super_admin` user emails and sends to each

**Retry logic:**
- On SMTP failure, retry up to 3 times with exponential backoff (2s, 5s, 10s)
- If all 3 attempts fail, return `{ success: false, error: "email_failed" }` so the caller can warn the admin
- The calling code (admin actions) treats email failure as non-blocking: the status change succeeds, but admin sees a warning toast: "Vendor status updated but notification email failed to send. Please notify the vendor manually."

---

## 4. Implementation Plan

### Phase 1: Database & Backend
1. SQL migration: add CHECK constraint on `vendors.status`, create `vendor_approval_log` table with conditional CHECK, change key FKs from CASCADE to RESTRICT
2. RLS policies for admin on `vendor_approval_log`
3. New Edge Function: `send-vendor-status-email` with retry logic

### Phase 2: Registration Flow
4. Update `VendorRegistrationForm.tsx` — set status to `pending_approval`, delete draft on submit, send emails
5. Handle re-registration for rejected vendors (reset existing record)
6. Create "Registration Under Review" confirmation page

### Phase 3: Admin Panel
7. Add sub-tab navigation in `VendorsPage.tsx` (All Vendors / Pending Requests) with clean separation
8. Add in-app badge on Vendors sidebar item for pending count
9. Create `PendingVendorRequests.tsx` component — list view
10. Create `VendorRequestReview.tsx` component — detail view with 3 action buttons + optimistic lock
11. Implement approve/reject/request-edits logic with email sending + retry + admin warning on failure
12. Add vendor deletion protection (UI check + DB RESTRICT)
13. Add status change warnings for vendors with linked business records
14. Update stat cards to include pending count

### Phase 4: Vendor Portal
15. Update `send-otp-email` to gate login by status
16. Implement locked-down edit-only mode for `revision_requested` vendors
17. Add status banner and admin notes display
18. Add "Resubmit for Review" flow with email notifications

### Phase 5: Shared Utilities
19. Create state machine transition validator (shared helper)
20. Update existing status filters and badge components for new statuses

---

## 5. Technical Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Email delivery failures | Medium | 3x retry with backoff; admin warning toast on final failure; status change succeeds independently |
| Race condition: admin acts on stale data | Medium | Optimistic lock via `updated_at` check; admin prompted to refresh if data changed |
| Vendor edits wrong data during revision | Low | Admin notes should be specific; all changes logged in approval_log |
| SMTP rate limits (Brevo) | Low | Approval actions are low-frequency; well within free tier limits |
| Invalid status transitions | Low | State machine enforced in shared helper; CHECK constraint on DB |
| Accidental vendor deletion | Low | DB RESTRICT on business FKs + UI pre-check with friendly message |

---

## 6. Files to Create / Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXX_add_vendor_approval_flow.sql` | DB migration (status CHECK, approval_log table, FK changes) |
| `supabase/functions/send-vendor-status-email/index.ts` | Email Edge Function with 6 templates + retry |
| `src/components/admin/vendors/PendingVendorRequests.tsx` | Admin pending list view |
| `src/components/admin/vendors/VendorRequestReview.tsx` | Admin review detail view with 3 actions + optimistic lock |
| `src/components/vendor-registration/RegistrationPending.tsx` | Post-submit confirmation page |
| `src/components/vendor/RevisionBanner.tsx` | Vendor portal status banner + admin notes |
| `src/lib/vendorStatusMachine.ts` | State machine transition validator (shared helper) |

### Modified Files
| File | Change |
|------|--------|
| `src/components/vendor-registration/VendorRegistrationForm.tsx` | Set status to `pending_approval`, delete draft, send emails, handle re-registration for rejected vendors |
| `src/components/admin/vendors/VendorsPage.tsx` | Add sub-tabs (All Vendors excludes pending/rejected), pending count badge, deletion protection UI |
| `src/components/admin/vendors/VendorDetails.tsx` | Add approval actions for pending vendors, status change warnings for vendors with linked records |
| `supabase/functions/send-otp-email/index.ts` | Gate OTP by vendor status |
| `src/contexts/VendorContext.tsx` | Handle `revision_requested` state, locked-down edit-only mode |
| `src/components/vendor/VendorPortal.tsx` (or equivalent) | Show revision banner, restrict tabs for revision vendors, enable edit mode |
| Sidebar component | Add in-app badge for pending vendor count |

---

## 7. Resolved Design Decisions

These items were raised during adversarial review and resolved:

| # | Question | Decision |
|---|----------|----------|
| 1 | Admin notification on new registration? | Yes — both email to super_admins + in-app badge |
| 2 | Re-registration with same email? | Allowed for `rejected` vendors only — resets existing record, no duplicates |
| 3 | Portal access scope for revision vendors? | Locked-down edit-only mode — no dashboard/projects/invoices/equipment/documents |
| 4 | Race condition handling? | Optimistic lock via `updated_at` timestamp |
| 5 | Email failure handling? | 3x retry with backoff, then warn admin on final failure |
| 6 | RLS for vendor portal? | Application-level filtering only — vendor auth is custom, not Supabase Auth |
| 7 | Vendor deletion with linked records? | DB RESTRICT + UI check — block deletion, suggest deactivate/block instead |
| 8 | Status transition rules? | Explicit state machine with shared validator |
| 9 | All Vendors tab mixing? | Clean separation — All Vendors shows only active/inactive/blocked |
| 10 | Draft lifecycle? | Delete on successful submission and on rejection |
