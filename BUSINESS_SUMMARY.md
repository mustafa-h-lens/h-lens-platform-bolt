# Business Summary — Vendors Management System

## What it is
A **B2B Project & Vendor Management Platform** for companies that execute projects using external vendors/suppliers. Arabic-first (RTL), tailored for the Saudi market (SAR currency, Saudi banks, Arabic UI).

## User Roles

| Role | Access | Can do |
|------|--------|--------|
| **Admin / Super Admin** | Full dashboard | Create projects, manage clients/vendors/users, invoicing, settings, activity logs |
| **Client** | Client portal (`/client`) | View their projects, track invoices & payment status (read-only) |
| **Vendor** | Vendor portal (`/vendor-portal`) | Manage profile, view assigned projects, manage equipment inventory, upload documents, view invoices |

## Core Business Modules

### 1. Project Management
Full lifecycle: `request → quoted → invoiced → po_issued → in_progress → completed/cancelled`. Each project has items, invoices, expenses, assigned vendors, and files. Tracks profitability (price vs cost).

**Project Detail Tabs:**
- Basic Info — project metadata, client, manager, status
- Items/Services — line items being delivered
- Invoices — linked invoices for payment
- Expenses — project costs tracking
- Vendors — suppliers/vendors assigned to project
- Files — project documents and attachments

### 2. Vendor Management
Vendor registration & onboarding, specialization fields (hierarchical categories), rate cards, equipment inventory (linked to a system catalog with brands/categories), financial data (bank accounts, IBAN, tax), and document management.

**Vendor Portal Tabs (self-service):**
- Profile — personal info, financial data, banking details
- Projects — view assigned projects and their status
- Invoices & Payments — view invoices and payment status
- Equipment — catalog their equipment with conditions and quantities
- Documents — upload and manage certifications, licenses, etc.

### 3. Client Management
Client profiles, project association, invoice tracking per client.

**Client Portal:**
- View all assigned projects with status
- Track invoices and payment status
- Access project details and timelines

### 4. Financial / Invoicing
Multi-currency invoices linked to projects, payment status tracking (paid/unpaid/partial), revenue analytics, expense tracking, PO settings.

**Key Metrics:**
- Total revenue collected
- Invoice count and status distribution
- Project profitability (margin %, cost %, profit trending)
- Per-client revenue

### 5. Settings & Configuration
- Item/service catalog (with images, names in English/Arabic)
- Equipment categories & brands
- Bank management (30+ Saudi banks supported)
- Purchase Order templates and settings
- Legal pages (terms & conditions, privacy policy)
- Project status customization
- Vendor field definitions (specialization areas)
- AI document extraction (beta)

### 6. Activity Log
Global audit trail across projects, vendors, and system events with filters, search, and pagination.

## Security & Access Control
- Role-based access (admin, super_admin, client)
- Vendor token-based authentication with expiry
- Client isolation (can only see own projects/invoices)
- Admin-only features (settings, user management, vendor management)
- Row Level Security (RLS) on all database tables
- Activity logging for audit trail

## Tech Stack
- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS + custom theme system (light/dark mode)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Routing:** Custom router implementation
- **State:** React Context API
- **Icons:** Lucide React
- **Language:** Arabic-first (RTL), with English fallbacks
