---
name: 'step-01-init'
description: 'Initialize brownfield PRD workflow by locating and validating document-project output'

nextStepFile: './step-02-architecture.md'
outputFile: '{planning_artifacts}/brownfield-prd.md'
prdTemplate: '../templates/brownfield-prd-template.md'
bmadOutput: '{project-root}/_bmad-output'
---

# Step 1: Initialize Brownfield PRD

**Progress: Step 1 of 7** - Next: Architecture Analysis

## STEP GOAL

Locate and validate the document-project output, then initialize the PRD document structure.

## MANDATORY EXECUTION RULES

- 📖 Read the complete step file before taking any action
- 🛑 FAIL if no document-project output exists
- 💾 Initialize document structure before proceeding
- ✅ Speak in configured `{communication_language}`

## EXECUTION SEQUENCE

### 1. Discover Available Project Documentation

Search for document-project outputs:

```
{bmadOutput}/*/
```

**Required files for each project:**
- `architecture.md` - System architecture overview
- `component-inventory.md` - Component/module listing
- `services-inventory.md` - Service layer documentation
- `index.md` - Documentation index

**Optional enrichment files:**
- `development-guide.md` - Development patterns
- `project-scan-report.json` - Raw scan data

### 2. Present Available Projects

If multiple projects found:

"I found document-project output for the following repositories:

**Available Projects:**
{{list projects with their paths}}

Which project would you like to generate a brownfield PRD for?"

If single project found:

"I found documentation for **{{project_name}}** at `{{path}}`.

Shall I generate a brownfield PRD for this project?"

If no projects found:

"❌ **No document-project output found.**

You need to run `/bmad-bmm-document-project` first on your target repository.

This workflow requires the analysis output from document-project to extract requirements from code."

**STOP WORKFLOW if no projects found.**

### 3. Validate Selected Project

Once user selects a project, validate required files exist:

**Validation Checklist:**
- [ ] `architecture.md` exists and has content
- [ ] `component-inventory.md` exists and has content
- [ ] `services-inventory.md` exists and has content

Report validation status:

"**Validating {{project_name}} documentation...**

✅ architecture.md - {{size}} bytes
✅ component-inventory.md - {{size}} bytes
✅ services-inventory.md - {{size}} bytes

Documentation is complete. Ready to extract requirements."

### 4. Load Source Documents

Load all available documentation files into context:

- Read `architecture.md` completely
- Read `component-inventory.md` completely
- Read `services-inventory.md` completely
- Read `index.md` if exists
- Read `development-guide.md` if exists

Track loaded files in memory for subsequent steps.

### 5. Initialize PRD Document

**Document Setup:**

- Copy template from `{prdTemplate}` to `{outputFile}`
- Update frontmatter:
  - `sourceProject`: path to document-project output
  - `extractedAt`: current datetime
  - `inputDocuments`: list of loaded files
  - `stepsCompleted`: ['step-01-init']

### 6. Present Initialization Summary

"**Brownfield PRD Initialized**

**Source Project:** {{project_name}}
**Documentation Path:** {{source_path}}

**Loaded Documents:**
{{list loaded documents with sizes}}

**Output File:** `{outputFile}`

I'm ready to analyze the codebase and extract requirements.

[C] Continue to Architecture Analysis (Step 2 of 7)"

### Menu Handling

- IF C: Update frontmatter with stepsCompleted, then read fully and follow: `{nextStepFile}`
- IF user asks questions: Answer and redisplay menu

---

## SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Document-project output located and validated
- All required files loaded into context
- PRD document initialized with proper frontmatter
- User confirmed project selection

### ❌ FAILURE:
- Proceeding without document-project output
- Not validating required files exist
- Not loading source documents into context
- Proceeding without user confirmation
