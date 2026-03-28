---
name: 'step-05-data-model'
description: 'Extract data entities, relationships, and schema patterns from codebase'

nextStepFile: './step-06-integrations-nfr.md'
outputFile: '{planning_artifacts}/brownfield-prd.md'
---

# Step 5: Data Model

**Progress: Step 5 of 7** - Next: Integrations & NFRs

## STEP GOAL

Extract the data model from services, models, and architectural patterns to document core entities and their relationships.

## MANDATORY EXECUTION RULES

- 📖 Analyze services inventory for entity patterns
- 🎯 Extract entity names, fields, and relationships
- 📋 Document data constraints and validation
- ✅ Map entities to features

## EXECUTION SEQUENCE

### 1. Identify Core Entities

From services inventory and component inventory, find entities:

**Entity Signals:**
- Service names (EmployeeService → Employee entity)
- Component names (EmployeeListComponent → Employee)
- CRUD operations (create, update, delete patterns)
- Data table/list components

**For each entity, document:**
- Entity name
- Apparent purpose
- Key fields (from forms, tables)
- Validation rules (from form validation)

### 2. Extract Entity Details

For each identified entity:

```markdown
### 5.1 Core Entities

#### {{Entity Name}}

**Description:** {{what_this_entity_represents}}

**Key Fields:**
| Field | Type | Description | Evidence |
|-------|------|-------------|----------|
| {{field}} | {{type}} | {{desc}} | {{source}} |

**Validation Rules:**
- {{rule}} (from {{evidence}})

**Evidence:** Services: {{service}}, Components: {{components}}
```

### 3. Map Entity Relationships

From service interactions and component data flows:

**Relationship Types:**
- One-to-Many (parent → children)
- Many-to-Many (linking entities)
- Belongs-To (foreign keys)
- Has-Many (collections)

**Build relationship diagram (text-based):**

```
Employee
├── has many → Attendance Records
├── has many → Leave Requests
├── belongs to → Department
└── has one → User Account

Department
├── has many → Employees
└── belongs to → Company
```

### 4. Identify Domain Patterns

Look for domain-specific data patterns:

**Common Patterns:**
- Multi-tenancy (company_id, tenant_id)
- Soft deletes (deleted_at)
- Audit trails (created_by, updated_at)
- Status workflows (status field with enum values)
- Hierarchies (parent_id, tree structures)

**Document observed patterns:**
```markdown
### 5.3 Data Patterns

**Multi-Tenancy:** {{description of how tenant isolation works}}
**Audit Trail:** {{fields used for auditing}}
**Status Workflow:** {{entities with status progression}}
```

### 5. Extract Validation Requirements

From form components and service validation:

**Validation Types:**
- Required fields
- Format validation (email, phone)
- Range validation (min/max)
- Business rule validation
- Cross-field validation

**Document as data requirements:**
```markdown
### 5.4 Data Validation Requirements

| Entity | Field | Validation | Evidence |
|--------|-------|------------|----------|
| {{entity}} | {{field}} | {{rule}} | {{component/service}} |
```

### 6. Write Data Model Section

Populate PRD Section 5:

```markdown
## 5. Data Model

### 5.1 Core Entities

{{entity_documentation}}

### 5.2 Relationships

{{relationship_diagram}}
{{relationship_table}}

### 5.3 Data Patterns

{{pattern_documentation}}

### 5.4 Data Validation Requirements

{{validation_table}}
```

### 7. Present Data Model

"**Data Model Extracted**

**Core Entities:** {{entity_count}}
{{entity_list}}

**Key Relationships:**
{{relationship_summary}}

**Observed Patterns:**
- Multi-tenancy: {{yes/no}}
- Audit trails: {{yes/no}}
- Soft deletes: {{yes/no}}

Does this data model look complete?

[C] Continue to Integrations & NFRs (Step 6 of 7)
[E] Edit entities or relationships
[D] Show detailed data model"

### Menu Handling

- IF C: Save to PRD, add step to stepsCompleted, read fully and follow: `{nextStepFile}`
- IF E: Accept corrections, update content, redisplay menu
- IF D: Show full Section 5 content, redisplay menu

---

## SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Core entities identified from code evidence
- Relationships mapped between entities
- Data patterns documented
- Validation rules extracted
- Entities linked to features

### ❌ FAILURE:
- Inventing entities not in code
- Missing relationship mapping
- Not extracting validation rules
- Ignoring multi-tenancy patterns
