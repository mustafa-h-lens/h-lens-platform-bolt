# البنود والمصروفات — Current Scope

## Project Items (بنود المشروع) — Fully Implemented

**CRUD:** Create, Read, Update, Delete all working.

| Feature | Status |
|---------|--------|
| Add item (name, qty, price, category, description, notes) | Working |
| Edit item | Working |
| Delete item (with confirmation) | Working |
| View item details modal | Working |
| Auto-calculated total per item (`qty × price` — DB generated column) | Working |
| Auto-calculated project total (trigger updates `projects.total_price`) | Working |
| Category assignment (dropdown from `item_categories`) | Working |
| Category management (CRUD in Settings) | Working |
| Service Items master catalog (in Settings) | Working |

**DB Tables:** `project_items`, `item_categories`, `service_items`

**Fields:**

| Field | DB Type | UI Type | Arabic Label | Required | Editable |
|-------|---------|---------|-------------|----------|----------|
| name | text | Text Input | اسم البند | Yes | Yes |
| description | text | Textarea | الوصف | No | Yes |
| quantity | decimal | Number | الكمية | Yes | Yes |
| unit_price | decimal | Number | السعر | Yes | Yes |
| total_price | decimal | Display | الإجمالي | Auto (qty × price) | No |
| category_id | uuid | Dropdown | التصنيف | No | Yes |
| notes | text | Textarea | ملاحظات | No | Yes |
| currency | text | Hidden | - | Auto (from project) | No |

---

## Vendor Invoices/Expenses (المصروفات) — Partially Implemented

**CRUD:** Create and Delete only. No Edit. No payment tracking.

### What Works

| Feature | Status |
|---------|--------|
| Assign vendor to project (vendor, amount, due date) | Working |
| View vendor invoices table | Working |
| Delete vendor invoice (with confirmation) | Working |

### What's Missing or Broken

| Feature | Status | Details |
|---------|--------|---------|
| Edit invoice | Missing | No edit button or form exists |
| Record payments / update amount_paid | Missing | No UI to track payments |
| Auto-calculate amount_remaining | Broken | Set once on create, never recalculated |
| Auto-update status (pending → overdue) | Missing | No trigger based on due_date |
| Currency | Broken | Hardcoded to SAR, ignores project currency |
| tax_included field | Dead code | In form state but never saved to DB |
| Expense summary totals | Missing | No total/paid/remaining across all expenses |
| Search/filter expenses | Missing | No search or filter functionality |
| Link invoices to project items | Missing | Items and expenses are completely disconnected |
| Payment history / installments | Missing | No way to record partial payments over time |
| Attach invoice documents | Missing | No file upload for invoice PDFs |
| Export | Missing | No CSV/PDF export |

**DB Table:** `vendor_invoices` (no triggers, no auto-calculations, overly permissive RLS)

**Fields:**

| Field | DB Type | UI Type | Arabic Label | Required | Editable |
|-------|---------|---------|-------------|----------|----------|
| vendor_id | uuid | Dropdown | اختر المورد | Yes | No (create only) |
| vendor_name | text | Display | اسم المورد | From join | Readonly |
| field | text | Text Input | المجال | No | No (auto-filled, not saved) |
| amount_total | decimal | Number | المبلغ | Yes | No (create only) |
| amount_paid | decimal | Display | المدفوع | Auto (0) | No UI to update |
| amount_remaining | decimal | Display | المتبقي | Auto | No UI to update |
| status | text | Badge | الحالة | Auto (pending) | No UI to update |
| due_date | date | Date Input | تاريخ الاستحقاق | No | No (create only) |

**Status Values:**

| Value | Arabic | Color |
|-------|--------|-------|
| paid | مدفوع | Green |
| partial | جزئي | Orange |
| overdue | متأخر | Red |
| pending | معلق | Default |

---

## Key Gap: No Relationship Between Items and Expenses

The two systems are **completely disconnected**. There is no foreign key or link between `project_items` and `vendor_invoices`. This means:

- Cannot track which vendor provides which items
- Cannot compare item costs vs vendor invoices
- Cannot reconcile project budget at the line-item level
- Items and expenses are two independent lists under the same project

---

## File References

**Components:**
- `src/components/admin/project-tabs/ProjectItems.tsx`
- `src/components/admin/project-tabs/ProjectExpenses.tsx`
- `src/components/admin/AddItemModal.tsx`
- `src/components/admin/ItemCategoriesManagement.tsx`
- `src/components/admin/ServiceItemsCatalog.tsx`

**Migrations:**
- `supabase/migrations/20251226180840_add_comprehensive_project_management.sql` (core schema)
- `supabase/migrations/20251226205619_add_item_categories_and_notes.sql` (categories)
- `supabase/migrations/20260109164316_add_vendors_system.sql` (vendor invoices)
