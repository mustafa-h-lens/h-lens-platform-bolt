# Expenses Tab — Benchmarking & Implementation Scope

**Date:** 2026-03-07
**Industry:** Media Production (Video, Photography, Events)
**Vendors = Freelancers** (Videographers, Photographers, Editors, Sound Engineers, Lighting Techs, etc.)
**Sources:** Wrapbook, TalentDesk, Plutio, Invoice Ninja, Procore, Acumatica, Sage

---

## Industry Context

In media production, the expense model is fundamentally **freelancer-based**:
- Projects are short-term (event coverage, corporate video, campaign shoot)
- Crew is assembled per-project from a pool of freelancers
- Each freelancer has an agreed rate (daily/project-based)
- Payments are often split: advance before shoot + remainder after delivery
- Multiple freelancers per project (videographer + editor + sound + lighting)
- Speed of payment matters — freelancers prioritize clients who pay fast

**Key difference from construction/ERP:** No purchase orders, no retainage, no progress billing. Instead: **flat fees, day rates, milestone payments, and fast turnaround.**

---

## Industry Benchmarking

### Tier 1 — Core (must-have for media production cost tracking)

| Feature | Our Status | Industry Standard (Wrapbook, TalentDesk, Plutio) |
|---------|------------|---------------------------------------------------|
| Assign freelancer + agreed amount to project | Working | Baseline — every production tool has this |
| Edit freelancer assignment (amount, dates, notes) | Missing | Standard — rates change, scope changes |
| Payment recording (record each payment with date & method) | Missing | Core — advance + final payment is the norm |
| Auto-calculate remaining (`agreed - sum(payments)`) | Broken | Always auto-calculated |
| Auto-update status (pending/partial/paid/overdue) | Missing | Derived from payments + due date |
| Expense summary cards (total crew cost / paid / remaining) | Missing | Wrapbook shows real-time cost dashboard |
| Use project currency (not hardcoded SAR) | Broken | Multi-currency standard (TalentDesk: 55+ currencies) |

### Tier 2 — Important (differentiator in media production)

| Feature | Our Status | Industry Standard |
|---------|------------|-------------------|
| Payment history per freelancer (date, amount, method, notes) | Missing | Wrapbook: full payment timeline per crew member |
| Attach invoice document (freelancer's invoice PDF) | Missing | Standard — freelancers submit invoices |
| Budget vs Actual (quoted to client vs actual crew costs) | Missing | Core in Plutio, Wrapbook — profit visibility |
| Expense categories (crew type-based) | Missing | Wrapbook: above-the-line / below-the-line categories |
| Freelancer role on project (e.g., "مصور فيديو", "مونتير") | Missing | TalentDesk: role-based assignment |

### Tier 3 — Advanced (future roadmap)

| Feature | Industry Standard |
|---------|-------------------|
| Day rate calculator (days × daily rate = total) | Wrapbook, industry standard |
| Tax withholding tracking (زكاة/ضريبة) | Required for Saudi compliance |
| Automated payment reminders | TalentDesk, FreshBooks |
| Export crew costs to CSV/PDF | Standard |
| Cost comparison across projects (freelancer performance) | Advanced analytics |
| Freelancer self-service invoice submission | TalentDesk portal model |

---

## Approved Scope (Tier 1 + Selected Tier 2)

1. **Full CRUD on freelancer expenses** — edit amount, due date, role, notes
2. **Payment recording system** — new `expense_payments` table, record each payment (date, amount, method, notes) to support advance + final payment workflow
3. **Auto-derived status** — calculated from payments vs total and due date
4. **Expense summary cards** — total crew cost / paid / remaining at the top
5. **Attach invoice document** — freelancer's invoice PDF upload per expense
6. **Budget vs Actual card** — compare quoted items (revenue) vs crew costs (expenses) with profit margin
7. **Fix currency** — use project currency throughout
8. **Expense category** — media production roles dropdown (مصور فيديو / مصور فوتوغرافي / مونتير / مهندس صوت / إضاءة / مخرج / مساعد إنتاج / أخرى)

---

## Relationship: البنود (Items) ↔ المصروفات (Expenses)

### Current State
Items and Expenses are **completely disconnected**. They live in separate tables (`project_items` and `vendor_invoices`) with no foreign key or link between them.

### The Relationship in Media Production

```
البنود (Items) = WHAT WE SELL              المصروفات (Expenses) = WHAT WE PAY
────────────────────────────────           ──────────────────────────────────────
What we quote/bill the client              What we pay each freelancer
e.g., "تصوير فيديو ليوم واحد"              e.g., "أحمد المصور - 3,000 ر.س"
e.g., "مونتاج فيديو 3 دقائق"              e.g., "سارة المونتيرة - 2,000 ر.س"
project_items table                        vendor_invoices table
Sum = Project Revenue (إيرادات)             Sum = Project Cost (تكاليف الفريق)
```

**Real-world example:**
```
Project: "تصوير حملة إعلانية لشركة X"

البنود (ما نفوتره للعميل):                 المصروفات (ما ندفعه للفريلانسرز):
├── تصوير فيديو (يومين)    20,000 ر.س     ├── محمد - مصور فيديو      5,000 ر.س
├── مونتاج وإخراج          8,000 ر.س      ├── سارة - مونتيرة         3,000 ر.س
├── تصوير فوتوغرافي        5,000 ر.س      ├── خالد - مصور فوتو       2,500 ر.س
└── تصميم جرافيك           3,000 ر.س      ├── نورة - مصممة جرافيك    2,000 ر.س
                                           └── أحمد - مهندس صوت       1,500 ر.س
─────────────────────────                  ──────────────────────────────
إجمالي الإيرادات: 36,000 ر.س              إجمالي التكاليف: 14,000 ر.س

الربح = 36,000 - 14,000 = 22,000 ر.س
نسبة الربح = 61%
```

The Items tab answers: **"How much are we billing the client?"**
The Expenses tab answers: **"How much are we paying the crew?"**
The difference is: **"What's our profit margin on this production?"**

### How They Connect in This Implementation
- Both are scoped to a `project_id`
- The Budget vs Actual card on the expenses tab compares:
  - Items total (what we bill) vs Expenses total (what we pay crew)
  - Shows profit amount and margin percentage
- No direct line-item linking (e.g., "this videographer covers this item") — that's a Tier 3 feature

---

## User Journeys

### Journey 1: Production Manager Assigns Crew to a Project

```
1. Admin creates project "تصوير حملة إعلانية" → assigns client → adds items (billing side)
2. Admin opens Expenses tab → sees empty state with "تعيين فريلانسر" button
3. Admin clicks "تعيين فريلانسر" → modal opens:
   - Selects freelancer: "محمد أحمد" from dropdown
   - Selects role/category: "مصور فيديو"
   - Enters agreed amount: 5,000 ر.س
   - Sets due date: 2026-03-15 (after shoot)
   - Uploads freelancer's invoice PDF (optional at this stage)
   - Clicks "حفظ"
4. Repeats for each crew member (editor, photographer, sound engineer, etc.)
5. Expense table shows all assigned freelancers with their agreed amounts
6. Summary cards update:
   - إجمالي تكاليف الفريق: 14,000 ر.س
   - المدفوع: 0 ر.س
   - المتبقي: 14,000 ر.س
7. Budget vs Actual card shows:
   - إيرادات المشروع (البنود): 36,000 ر.س
   - تكاليف الفريق (المصروفات): 14,000 ر.س
   - الربح المتوقع: 22,000 ر.س (61%)
```

### Journey 2: Advance Payment Before Shoot Day

```
1. Shoot is tomorrow — videographer requests advance payment (common in freelancing)
2. Admin finds "محمد أحمد - مصور فيديو" row → clicks "تسجيل دفعة"
3. Payment modal opens:
   - Amount: 2,500 ر.س (50% advance)
   - Payment method: "تحويل بنكي"
   - Payment date: 2026-03-10
   - Notes: "دفعة مقدمة قبل التصوير"
   - Clicks "تسجيل"
4. Row updates:
   - المدفوع: 2,500 ر.س
   - المتبقي: 2,500 ر.س
   - Status: "جزئي" (partial) — orange badge
5. Summary cards update: المدفوع: 2,500 / المتبقي: 11,500
```

### Journey 3: Final Payment After Delivery

```
1. Videographer delivers final files
2. Admin clicks "تسجيل دفعة" on same row
3. Enters remaining 2,500 ر.س
4. Uploads freelancer's final invoice PDF
5. Row updates:
   - المدفوع: 5,000 ر.س
   - المتبقي: 0 ر.س
   - Status: "مدفوع" (paid) ✓ — green badge
6. Payment history shows 2 entries:
   - 2,500 ر.س — تحويل بنكي — 10 مارس — "دفعة مقدمة قبل التصوير"
   - 2,500 ر.س — تحويل بنكي — 18 مارس — "دفعة نهائية بعد التسليم"
```

### Journey 4: Admin Edits a Freelancer's Agreement

```
1. Scope changed — videographer will shoot an extra day
2. Admin clicks edit icon on the expense row
3. Edit modal opens with current data:
   - Can change: agreed amount (5,000 → 7,500), due date, role, notes
   - Can replace: invoice document
   - Cannot change: freelancer (must delete and recreate)
4. Amount changes → remaining auto-recalculates (7,500 - 2,500 already paid = 5,000 remaining)
5. Saves → row and summary cards update
6. Budget vs Actual card recalculates profit margin
```

### Journey 5: Overdue Freelancer Payment

```
1. Editor "سارة" has due_date = 2026-03-01, agreed = 3,000, paid = 0
2. Today is 2026-03-07 (past due)
3. Status auto-shows as "متأخر" (overdue) — red badge
4. Admin sees the red badge → prioritizes payment to maintain freelancer relationship
5. Records payment → status changes to "مدفوع"
```

### Journey 6: Production Manager Reviews Project Profitability

```
1. Admin opens Expenses tab on the project
2. At the top, sees Budget vs Actual card:
   ┌──────────────────────────────────────────────────────┐
   │  إيرادات المشروع (البنود)          36,000 ر.س       │
   │  تكاليف الفريق (المصروفات)         14,000 ر.س       │
   │  الربح المتوقع                      22,000 ر.س       │
   │  نسبة الربح                         61%    ✅        │
   └──────────────────────────────────────────────────────┘
3. Green indicator = healthy margin
4. If costs exceed 70% of revenue → yellow warning
5. If costs exceed revenue → red alert "المشروع يتجاوز الميزانية"
6. Admin can make informed pricing decisions for future similar projects
```

---

## Database Design (Planned)

### New Table: `expense_payments`
```
- id (uuid, PK)
- expense_id (uuid, FK → vendor_invoices)
- amount (decimal 15,2)
- payment_method (text: bank_transfer / cash / check)
- payment_date (date)
- notes (text, nullable)
- created_by (uuid, FK → users)
- created_at (timestamptz)
```

### Modified Table: `vendor_invoices`
```
Add columns:
- category (text: videographer / photographer / editor / sound_engineer / lighting / director / production_assistant / other)
- notes (text, nullable)
- invoice_file_url (text, nullable)

Deprecate (keep in DB but derive in frontend):
- amount_paid → derived from SUM(expense_payments.amount)
- amount_remaining → derived from amount_total - amount_paid
- status → derived from payments + due_date logic
```

### Expense Categories (Media Production)

| Value | Arabic Label | Description |
|-------|-------------|-------------|
| videographer | مصور فيديو | Videographer / Camera operator |
| photographer | مصور فوتوغرافي | Photographer |
| editor | مونتير | Video editor |
| sound_engineer | مهندس صوت | Sound engineer / Audio tech |
| lighting | إضاءة | Lighting technician |
| director | مخرج | Director |
| production_assistant | مساعد إنتاج | Production assistant |
| designer | مصمم جرافيك | Graphic designer / Motion graphics |
| presenter | مقدم | Presenter / Host |
| other | أخرى | Other |

### Status Derivation Logic
```
if amount_paid >= amount_total → "paid" (مدفوع)
else if amount_paid > 0 → "partial" (جزئي)
else if due_date < today → "overdue" (متأخر)
else → "pending" (معلق)
```

### Profit Margin Health Indicators
```
if expense_total / items_total <= 0.50 → Green ✅ (excellent margin)
if expense_total / items_total <= 0.70 → Yellow ⚠️ (acceptable margin)
if expense_total / items_total > 0.70 → Orange 🔶 (thin margin)
if expense_total > items_total → Red 🔴 (over budget)
```

---

## Sources
- [Wrapbook — Digital Production Payroll & Cost Tracking](https://www.wrapbook.com)
- [TalentDesk — Freelancer Management Platform](https://www.talentdesk.io)
- [Plutio — Project Management for Videographers](https://www.plutio.com/solutions/videographers/project-management)
- [Invoice Ninja — Video Production Budgeting](https://invoiceninja.com/how-to-budget-and-invoice-corporate-video-production/)
- [Wrapbook — Film Budgeting Software Comparison 2026](https://www.wrapbook.com/blog/best-film-budgeting-software)
- [Procore — Invoice Management](https://www.procore.com/invoice-management)
- [Acumatica — Project Cost Tracking](https://www.acumatica.com/cloud-erp-software/project-accounting/project-cost-tracking/)
- [Sage — Project Cost Management](https://www.sage.com/en-us/accounting-software/project-costing/)
