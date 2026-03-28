---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-09-functional']
classification:
  projectType: saas_b2b
  domain: b2b_operations
  complexity: medium-high
  projectContext: brownfield
inputDocuments:
  - '_bmad-output/planning-artifacts/research/technical-vendor-approval-flow-research-2026-03-14.md'
  - 'docs/BUSINESS_SUMMARY.md'
  - 'docs/ROLES_REFACTOR_PLAN.md'
  - 'docs/ADMIN_PANEL_ISSUES.md'
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 0
  projectDocs: 3
workflowType: 'prd'
---

# Product Requirements Document - H-Lens

**Author:** Zaghloul-product
**Date:** 2026-03-26

## Executive Summary

The H-Lens platform currently enforces access control through two hardcoded roles (`super_admin` and `project_manager`), with permission logic embedded directly in UI components, navigation guards, and Supabase RLS policies. As the team grows and operational needs diversify, this rigid model forces a binary choice: full access or limited access — with no way to tailor permissions to actual job responsibilities without code changes.

This PRD defines a **Dynamic Roles & Permissions module** that replaces hardcoded role checks with a configurable RBAC system. Super admins will create custom roles from the admin dashboard, toggle module-level access per role (e.g., "Accountant" can access Expenses and Invoices but not Vendors or Settings), and assign those roles to users — all without developer involvement. The existing `super_admin` role remains as a built-in unrestricted role that cannot be modified or deleted.

**Target users:** Super admins managing team access in a growing B2B project/vendor management operation.

### What Makes This Special

The core insight is that access control should be an admin operation, not a developer task. Today, adding a new access pattern requires modifying source code, redeploying, and updating database policies. The dynamic module turns this into a 2-minute UI task: create role, toggle modules, assign to user. Module-level granularity is the right starting point — simple to manage, powerful enough for real-world team structures.

## Project Classification

- **Project Type:** SaaS B2B platform (brownfield feature addition)
- **Domain:** B2B Operations / Project & Vendor Management
- **Complexity:** Medium-High
- **Project Context:** Brownfield — adding a new RBAC module to an existing production system with active users, requiring migration from hardcoded roles to dynamic roles without service disruption

## Functional Requirements

### Role Management

- **FR1:** Super admin can create a new custom role with a name and optional description
- **FR2:** Super admin can edit an existing custom role's name, description, and permissions
- **FR3:** Super admin can delete a custom role (only if no users are currently assigned to it)
- **FR4:** Super admin can view a list of all roles with their assigned user count
- **FR5:** System provides a built-in `super_admin` role that cannot be edited, deleted, or have its permissions restricted
- **FR6:** Super admin can duplicate an existing role as a starting point for a new role

### Permission Assignment

- **FR7:** Super admin can toggle module-level access on/off per role for each dashboard module:
  - Dashboard (home)
  - Clients
  - Vendors
  - Projects
  - Expenses
  - Suggestions
  - Reports
  - Activity Log
  - Settings
  - User Management
- **FR8:** System enforces that the `super_admin` built-in role always has all modules enabled
- **FR9:** System enforces that only `super_admin` role can access the User Management and Roles & Permissions modules (non-delegatable)

### User-Role Assignment

- **FR10:** Super admin can assign a role to a user when creating a new user
- **FR11:** Super admin can change a user's assigned role from the user management interface
- **FR12:** Each user has exactly one role at a time
- **FR13:** Super admin can view which role is assigned to each user in the user list

### Access Enforcement

- **FR14:** System hides navigation sidebar items for modules the user's role does not have access to
- **FR15:** System blocks direct URL/hash navigation to modules the user's role does not have access to (redirect to dashboard)
- **FR16:** System displays an appropriate message or redirects when a user attempts to access a restricted module
- **FR17:** Permission changes to a role take effect on the user's next page load (no logout required)

### Migration & Backward Compatibility

- **FR18:** System migrates existing `super_admin` users to the built-in `super_admin` role automatically
- **FR19:** System migrates existing `project_manager` users to a pre-created "Project Manager" role with the current permission set
- **FR20:** System preserves all existing user accounts and their active/inactive status during migration
