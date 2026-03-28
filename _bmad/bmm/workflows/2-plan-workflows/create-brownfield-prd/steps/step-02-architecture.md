---
name: 'step-02-architecture'
description: 'Extract system overview and product context from architecture documentation'

nextStepFile: './step-03-features.md'
outputFile: '{planning_artifacts}/brownfield-prd.md'
---

# Step 2: Architecture Analysis

**Progress: Step 2 of 7** - Next: Feature Extraction

## STEP GOAL

Analyze the architecture documentation to extract:
- System purpose and problem domain
- Target users and business context
- Technology stack and constraints
- Architectural patterns

## MANDATORY EXECUTION RULES

- 📖 Base ALL content on evidence from loaded documents
- 🛑 NEVER invent information not in source docs
- 📋 Cite source document for each extraction
- ✅ Present findings for user validation

## EXECUTION SEQUENCE

### 1. Extract System Purpose

From `architecture.md`, identify:

**Questions to answer:**
- What is this system's primary purpose?
- What business problem does it solve?
- What domain does it operate in?

**Evidence sources:**
- README content if included
- High-level descriptions
- Module/application names and their purposes
- Business logic patterns

**Write to PRD Section 1.1 (System Purpose):**

```markdown
### 1.1 System Purpose

{{extracted_purpose}}

**Evidence:** Extracted from architecture.md - {{specific_section}}
```

### 2. Extract Target Users

From architecture documentation and component patterns, identify:

**Evidence sources:**
- Authentication/authorization patterns
- Role-based access mentions
- User-facing module names
- Permission structures

**Write to PRD Section 1.2 (Target Users):**

```markdown
### 1.2 Target Users

{{extracted_user_types}}

**Evidence:** Extracted from {{source_files}}
```

### 3. Extract Business Domain

Analyze naming patterns, data structures, and modules:

**Domain signals:**
- Module/feature names (HR, CRM, Accounting, etc.)
- Data entity names
- Business rule patterns
- Integration targets (government APIs, payment systems, etc.)

**Write to PRD Section 1.3 (Business Domain):**

```markdown
### 1.3 Business Domain

{{extracted_domain_description}}

**Domain Classification:** {{domain_type}}
**Complexity:** {{low|medium|high}} based on {{evidence}}
```

### 4. Extract Technology Stack

From architecture documentation:

**Gather:**
- Frontend framework and version
- Backend framework and version
- Database systems
- Key libraries and dependencies
- Build/deployment tools

**Write to PRD Section 8.1 (Technology Stack):**

| Layer | Technology | Version | Evidence |
|-------|------------|---------|----------|
| Frontend | {{tech}} | {{ver}} | architecture.md |
| Backend | {{tech}} | {{ver}} | architecture.md |
| Database | {{tech}} | {{ver}} | architecture.md |

### 5. Extract Architectural Patterns

Identify patterns from code structure:

**Common patterns to detect:**
- Monorepo vs multi-repo
- Microservices vs monolith
- Multi-tenancy approach
- State management patterns
- API design patterns (REST, GraphQL)
- Authentication patterns

**Write to PRD Section 8.2 (Architectural Patterns):**

```markdown
### 8.2 Architectural Patterns

**Pattern:** {{pattern_name}}
**Evidence:** {{where_observed}}
**Implication:** {{what_this_means_for_requirements}}
```

### 6. Generate Executive Summary

Based on all extracted information, draft the executive summary:

```markdown
## Executive Summary

{{project_name}} is a {{domain}} system built with {{tech_stack}} that {{primary_purpose}}.

**Key Capabilities:**
- {{capability_1}}
- {{capability_2}}
- {{capability_3}}

**Architecture:** {{architecture_summary}}

**Target Users:** {{user_summary}}

> This PRD documents the current implementation state of {{project_name}}, extracted from codebase analysis performed on {{date}}.
```

### 7. Present Findings for Validation

"**Architecture Analysis Complete**

I've extracted the following from your codebase:

**System Purpose:**
{{summary}}

**Business Domain:** {{domain}} ({{complexity}} complexity)

**Target Users:**
{{user_list}}

**Technology Stack:**
{{tech_summary}}

**Architectural Patterns:**
{{patterns_summary}}

Please review these findings. Are they accurate? Any corrections needed?

[A] Accept and Continue to Feature Extraction
[E] Edit - I'll make corrections
[C] Continue (same as Accept)"

### Menu Handling

- IF A or C: Update PRD sections, add step to stepsCompleted, read fully and follow: `{nextStepFile}`
- IF E: Let user provide corrections, update extractions, redisplay menu
- IF questions: Answer and redisplay menu

---

## SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- All PRD sections 1.x and 8.x populated with evidence
- Executive summary drafted
- User validated findings before proceeding
- Citations to source documents included

### ❌ FAILURE:
- Inventing information not in source documents
- Not citing evidence sources
- Proceeding without user validation
- Leaving sections with placeholder text
