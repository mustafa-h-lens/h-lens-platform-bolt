---
name: 'step-03-features'
description: 'Extract core features from component and service inventories'

nextStepFile: './step-04-users-journeys.md'
outputFile: '{planning_artifacts}/brownfield-prd.md'
---

# Step 3: Feature Extraction

**Progress: Step 3 of 7** - Next: User Roles & Journeys

## STEP GOAL

Extract functional requirements from the component and service inventories, transforming implementation details into product requirements.

## MANDATORY EXECUTION RULES

- 📖 Analyze component-inventory.md and services-inventory.md
- 🎯 Transform code modules into product features
- 📋 Generate FR-XXX requirement IDs for each feature
- ✅ Group related functionality into feature areas

## EXECUTION SEQUENCE

### 1. Analyze Component Inventory

Read `component-inventory.md` and categorize components:

**Component Categories:**
- **Pages/Views**: User-facing screens → Major Features
- **Forms**: Data entry → Feature sub-requirements
- **Lists/Tables**: Data display → Feature sub-requirements
- **Dialogs/Modals**: Interactions → Feature behaviors
- **Shared/Common**: Reusable → Cross-cutting capabilities

**For each major module/application, extract:**
- Module name and purpose
- Key components within
- Apparent functionality

### 2. Analyze Service Inventory

Read `services-inventory.md` and identify:

**Service Patterns:**
- **CRUD Services**: Core entity management
- **Business Logic Services**: Complex operations
- **Integration Services**: External system connections
- **Utility Services**: Supporting functionality

**For each service, extract:**
- What business operation it performs
- What data it manages
- What rules it enforces

### 3. Map Components to Features

Create a feature map connecting code to capabilities:

| Feature Area | Components | Services | Description |
|--------------|------------|----------|-------------|
| {{feature}} | {{comp_list}} | {{svc_list}} | {{what_it_does}} |

### 4. Generate Functional Requirements

For each feature area, generate requirements:

**Requirement Format:**
```markdown
### 3.X {{Feature Name}}

**Code Evidence:**
- Components: `{{component_paths}}`
- Services: `{{service_paths}}`

**Description:**
{{what_this_feature_does_for_users}}

**Functional Requirements:**

- **FR-{{AREA}}-001:** The system shall {{requirement}}
  - *Evidence:* {{component/service that implements this}}

- **FR-{{AREA}}-002:** The system shall {{requirement}}
  - *Evidence:* {{component/service that implements this}}
```

### 5. Identify Feature Groupings

Organize features into logical groups based on:

**Grouping Criteria:**
- Same module/application
- Same business domain
- Same user workflow
- Shared data entities

**Example Groups:**
- Employee Management (profiles, onboarding, offboarding)
- Time & Attendance (clock-in, schedules, timesheets)
- Payroll Processing (calculations, submissions, reports)

### 6. Write Features to PRD

Write all extracted features to Section 3:

```markdown
## 3. Core Features

### 3.1 {{Feature Group Name}}

#### 3.1.1 {{Feature Name}}

**Code Evidence:** `{{module_path}}`

**Description:**
{{feature_description}}

**Functional Requirements:**
- FR-{{ID}}-001: {{requirement}}
- FR-{{ID}}-002: {{requirement}}

---

### 3.2 {{Next Feature Group}}
...
```

### 7. Generate Feature Summary Statistics

Count and summarize:

- Total feature areas: {{count}}
- Total functional requirements: {{count}}
- Features per application/module

### 8. Present Features for Validation

"**Feature Extraction Complete**

I've extracted **{{feature_count}} feature areas** with **{{fr_count}} functional requirements** from your codebase.

**Feature Summary:**

| Feature Area | Requirements | Source Module |
|--------------|--------------|---------------|
{{feature_table}}

**Sample Requirements:**
{{show 3-5 example FRs}}

Would you like to review the full feature list, or shall we continue?

[R] Review full feature list
[C] Continue to User Roles & Journeys (Step 4 of 7)
[E] Edit - Add/remove/modify features"

### Menu Handling

- IF R: Display full Section 3 content, then redisplay menu
- IF C: Save features to PRD, add step to stepsCompleted, read fully and follow: `{nextStepFile}`
- IF E: Let user provide modifications, update features, redisplay menu

---

## SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- All components mapped to features
- All services mapped to requirements
- FR-XXX IDs assigned systematically
- Evidence cited for each requirement
- Features organized into logical groups

### ❌ FAILURE:
- Listing components without extracting requirements
- Missing evidence citations
- Unorganized feature dump
- Inventing features not in code
