---
name: 'step-07-complete'
description: 'Finalize the brownfield PRD with appendix and quality review'

outputFile: '{planning_artifacts}/brownfield-prd.md'
---

# Step 7: Complete & Polish

**Progress: Step 7 of 7** - Final Step

## STEP GOAL

Finalize the brownfield PRD by completing the appendix, performing a quality review, and generating summary statistics.

## MANDATORY EXECUTION RULES

- 📖 Review all sections for completeness
- 🎯 Ensure all evidence citations are present
- 📋 Complete appendix with source tracking
- ✅ Generate final statistics

## EXECUTION SEQUENCE

### 1. Complete Appendix

#### 9.1 Source Documents

List all document-project outputs used:

```markdown
### 9.1 Source Documents

| Document | Path | Purpose |
|----------|------|---------|
| architecture.md | {{path}} | System overview and tech stack |
| component-inventory.md | {{path}} | Feature extraction |
| services-inventory.md | {{path}} | Service layer analysis |
| development-guide.md | {{path}} | Pattern documentation |
```

#### 9.2 Code Coverage

Document what was analyzed:

```markdown
### 9.2 Code Coverage

**Analyzed:**
- Applications: {{list}}
- Libraries: {{list}}
- Services: {{count}}
- Components: {{count}}

**Not Analyzed (if any):**
- {{areas not covered and why}}
```

#### 9.3 Known Gaps

Document areas where code didn't clearly indicate requirements:

```markdown
### 9.3 Known Gaps

| Area | Gap Description | Recommendation |
|------|-----------------|----------------|
| {{area}} | {{what's unclear}} | {{suggested action}} |
```

### 2. Generate PRD Statistics

Count all requirements and document:

```markdown
## PRD Statistics

| Metric | Count |
|--------|-------|
| Feature Areas | {{count}} |
| Functional Requirements (FR-*) | {{count}} |
| Non-Functional Requirements (NFR-*) | {{count}} |
| User Roles | {{count}} |
| User Journeys | {{count}} |
| Core Entities | {{count}} |
| External Integrations | {{count}} |
```

### 3. Quality Review Checklist

Verify each section:

**Section Completeness:**
- [ ] Executive Summary - Captures system essence
- [ ] Section 1 (Overview) - Purpose, users, domain documented
- [ ] Section 2 (Roles) - All roles with permissions
- [ ] Section 3 (Features) - FR-* IDs for all features
- [ ] Section 4 (Journeys) - Key user flows documented
- [ ] Section 5 (Data Model) - Entities and relationships
- [ ] Section 6 (Integrations) - All external systems
- [ ] Section 7 (NFRs) - Evidence-based only
- [ ] Section 8 (Constraints) - Tech stack and patterns
- [ ] Section 9 (Appendix) - Sources documented

**Quality Criteria:**
- [ ] Every requirement has evidence citation
- [ ] No placeholder text remaining
- [ ] Consistent requirement ID format
- [ ] No invented/assumed requirements

### 4. Update Final Frontmatter

```yaml
---
stepsCompleted: ['step-01-init', 'step-02-architecture', 'step-03-features', 'step-04-users-journeys', 'step-05-data-model', 'step-06-integrations-nfr', 'step-07-complete']
workflowType: 'brownfield-prd'
sourceProject: '{{path}}'
extractedAt: '{{datetime}}'
inputDocuments: [{{list}}]
completedAt: '{{datetime}}'
statistics:
  featureAreas: {{count}}
  functionalRequirements: {{count}}
  nonFunctionalRequirements: {{count}}
  userRoles: {{count}}
  userJourneys: {{count}}
  coreEntities: {{count}}
  externalIntegrations: {{count}}
---
```

### 5. Present Completion Summary

"**🎉 Brownfield PRD Complete!**

**Output File:** `{outputFile}`

**PRD Statistics:**
| Metric | Count |
|--------|-------|
| Feature Areas | {{count}} |
| Functional Requirements | {{count}} |
| Non-Functional Requirements | {{count}} |
| User Roles | {{count}} |
| User Journeys | {{count}} |
| Core Entities | {{count}} |
| External Integrations | {{count}} |

**Quality Check:** ✅ All sections complete with evidence

**Source:** Extracted from `{{source_project}}` documentation

---

**What's Next?**

Your brownfield PRD documents the current state of your system. You can use it to:

1. **Gap Analysis** - Compare against desired features
2. **Technical Debt** - Identify areas needing improvement
3. **Onboarding** - Help new team members understand the system
4. **Planning** - Base new feature PRDs on this foundation

Would you like me to show any section in detail, or is there anything you'd like to adjust?"

### 6. Final Actions

- Save completed PRD to `{outputFile}`
- Report completion to user
- Offer to show any section in detail

---

## SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- All sections complete and populated
- Appendix documents sources
- Statistics generated
- Quality checklist passed
- Frontmatter finalized

### ❌ FAILURE:
- Sections with placeholder text
- Missing evidence citations
- Incomplete appendix
- Statistics not generated
- Premature completion declaration
