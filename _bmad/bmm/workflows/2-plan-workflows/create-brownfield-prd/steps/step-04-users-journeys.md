---
name: 'step-04-users-journeys'
description: 'Extract user roles, permissions, and journey flows from auth and routing patterns'

nextStepFile: './step-05-data-model.md'
outputFile: '{planning_artifacts}/brownfield-prd.md'
---

# Step 4: User Roles & Journeys

**Progress: Step 4 of 7** - Next: Data Model

## STEP GOAL

Extract user types, roles, permissions, and journey flows from authentication patterns, guards, and routing structures.

## MANDATORY EXECUTION RULES

- 📖 Analyze auth patterns, guards, middleware, routing
- 🎯 Map roles to permissions and accessible features
- 📋 Trace user journeys through navigation flows
- ✅ Document access control patterns

## EXECUTION SEQUENCE

### 1. Extract User Roles

Search source documents for role evidence:

**Evidence Sources:**
- Auth guards and middleware
- Role/permission constants
- User type enums
- Access control lists
- Route guards

**For each role, extract:**
- Role identifier/name
- Description (inferred from name and access)
- Associated permissions
- Accessible modules/features

### 2. Build Role Matrix

Create comprehensive role documentation:

```markdown
## 2. User Roles & Permissions

### Extracted Roles

| Role | Description | Module Access | Evidence |
|------|-------------|---------------|----------|
| {{role}} | {{desc}} | {{modules}} | {{source}} |

### Permission Mapping

| Permission | Description | Roles with Access |
|------------|-------------|-------------------|
| {{perm}} | {{desc}} | {{roles}} |
```

### 3. Analyze Routing Structure

From architecture and component inventory, trace routes:

**Route Analysis:**
- Main navigation routes
- Feature module routes
- Protected vs public routes
- Route guards applied

**Build route map:**
```
/app
├── /dashboard (all authenticated)
├── /employees (HR roles)
│   ├── /list
│   ├── /create
│   └── /:id/edit
├── /attendance (HR, Employee)
└── /admin (Admin only)
```

### 4. Extract User Journeys

From routing and component flow, identify key journeys:

**Journey Detection:**
- Multi-step forms → Wizard journeys
- CRUD patterns → Management journeys
- Dashboard → entry points
- Sequential routes → Process flows

**For each journey:**
```markdown
### 4.X {{Journey Name}}

**Primary User:** {{role}}
**Entry Point:** {{route/trigger}}
**Purpose:** {{what_user_accomplishes}}

**Journey Steps:**
1. {{step}} → `{{component/route}}`
2. {{step}} → `{{component/route}}`
3. {{step}} → `{{component/route}}`

**Evidence:** Routing in {{source}}, components in {{source}}
```

### 5. Common Journey Patterns to Extract

**Authentication Journey:**
- Login flow
- Password reset
- Session management
- Multi-factor (if present)

**Onboarding Journey:**
- First-time user setup
- Profile completion
- Initial configuration

**Core Business Journeys:**
- Primary workflow (e.g., clock-in/out for attendance)
- Data entry workflows
- Approval workflows
- Reporting workflows

### 6. Write to PRD

Update Section 2 (Roles) and Section 4 (Journeys):

```markdown
## 2. User Roles & Permissions

{{role_content}}

---

## 4. User Journeys

{{journey_content}}
```

### 7. Present Findings

"**User Roles & Journeys Extracted**

**Roles Identified:** {{role_count}}
{{role_summary}}

**Journeys Mapped:** {{journey_count}}
{{journey_summary}}

**Access Control Pattern:** {{pattern_description}}

Does this accurately reflect your system's user model?

[C] Continue to Data Model (Step 5 of 7)
[E] Edit roles or journeys
[D] Show detailed breakdown"

### Menu Handling

- IF C: Save to PRD, add step to stepsCompleted, read fully and follow: `{nextStepFile}`
- IF E: Accept corrections, update content, redisplay menu
- IF D: Show full Section 2 and 4 content, redisplay menu

---

## SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- All roles extracted with evidence
- Permissions mapped to roles
- Key user journeys documented
- Route structure analyzed
- Access control patterns identified

### ❌ FAILURE:
- Inventing roles not in code
- Missing permission mapping
- Journeys without route evidence
- Not analyzing auth patterns
