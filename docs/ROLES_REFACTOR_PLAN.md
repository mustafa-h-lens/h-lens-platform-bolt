# Plan: Simplify Roles to Super Admin + Project Manager

## Context
The system currently has 4 roles (`super_admin`, `admin`, `client`, `client_user`). We're simplifying to just 2: **`super_admin`** and **`project_manager`**. The `admin` role becomes `project_manager`, and `client`/`client_user` are removed entirely. Project Managers have limited access (no Settings, User Management, or Activity Log).

## Files to Modify

### 1. Type Definitions
- **`src/types/database.ts`** — Change role union to `'super_admin' | 'project_manager'`
- **`src/lib/supabaseClient.ts`** — Same change in 3 places (Row, Insert, Update types)
- **`src/contexts/AuthContext.tsx`** — Same change in UserProfile interface + signUp signatures

### 2. App Router — `src/App.tsx`
- Delete `ClientDashboard` import
- Delete `CLIENT_DASHBOARD` route constant
- Remove `/portal-client-hl` from `isAdminPath` check
- Replace role-conditional rendering with unconditional `<NewAdminDashboard />`

### 3. Sidebar — `src/components/shared/Sidebar.tsx`
- Replace `isAdmin` (admin || super_admin) with `isSuperAdmin` (super_admin only)
- Admin-only section (Activity, Settings, Users) guarded by `isSuperAdmin`
- Update `getRoleLabel`: `super_admin` → 'مدير عام', `project_manager` → 'مدير مشاريع'
- Remove `client` case

### 4. Dashboard Guards — `src/components/admin/NewAdminDashboard.tsx`
- Add `isSuperAdmin` check
- Redirect `project_manager` away from `users`, `settings`, `activity` pages if accessed directly

### 5. User Management — `src/components/admin/UserManagement.tsx`
- Update `getRoleText`: only `super_admin` + `project_manager`
- Update `getRoleColor`: only 2 roles
- Update role dropdown: only 2 options
- Default role for new users → `project_manager`

### 6. Project Modals
- **`src/components/admin/projects/CreateProjectModal.tsx`** — `.in('role', ['admin', 'super_admin'])` → `['project_manager', 'super_admin']`
- **`src/components/admin/projects/EditProjectModal.tsx`** — Same change

## Files to Delete
- `src/components/client/ClientDashboard.tsx`
- `src/components/client/ClientProjectDetails.tsx`
- `src/components/auth/ClientAuth.tsx`
- `src/components/auth/ClientLogin.tsx`
- `src/components/auth/ClientOTP.tsx`
- Remove empty `src/components/client/` directory

## Supabase Migration
Create `supabase/migrations/YYYYMMDDHHMMSS_simplify_roles.sql`:
1. Update existing `admin` users → `project_manager`
2. Deactivate `client`/`client_user` users, set role to `project_manager`
3. Drop and recreate role CHECK constraint
4. Update `is_admin()` function to check `('project_manager', 'super_admin')`
5. Update any inline RLS policies that hardcode `'admin'` instead of using `is_admin()`

## What We KEEP (client entities, not client roles)
- `src/components/admin/clients/*` — These manage client business entities from the admin panel

## Verification
1. `npx vite build` — no compile errors
2. Login as super_admin → sees all sidebar items
3. Login as project_manager → does NOT see Activity, Settings, Users
4. User Management shows only 2 role options
5. Direct navigation to restricted pages redirects project_manager to dashboard
