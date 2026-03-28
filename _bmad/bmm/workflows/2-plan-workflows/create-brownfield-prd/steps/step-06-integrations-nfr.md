---
name: 'step-06-integrations-nfr'
description: 'Extract external integrations and non-functional requirements from code patterns'

nextStepFile: './step-07-complete.md'
outputFile: '{planning_artifacts}/brownfield-prd.md'
---

# Step 6: Integrations & Non-Functional Requirements

**Progress: Step 6 of 7** - Next: Complete & Polish

## STEP GOAL

Extract external integrations and observe code patterns that indicate non-functional requirements.

## MANDATORY EXECUTION RULES

- 📖 Identify all external service integrations
- 🎯 Extract NFRs from observed code patterns (not assumed)
- 📋 Document technical constraints
- ✅ Only document what's evidenced in code

## EXECUTION SEQUENCE

### 1. Extract External Integrations

From architecture and services documentation:

**Integration Signals:**
- HTTP client services
- API endpoint configurations
- SDK/library imports
- Webhook handlers
- Message queue connections

**For each integration:**
```markdown
### 6.1 External APIs

| Integration | Purpose | Type | Evidence |
|-------------|---------|------|----------|
| {{name}} | {{purpose}} | {{REST/GraphQL/SDK}} | {{service_file}} |

#### {{Integration Name}}

**Purpose:** {{what_it_does}}
**Type:** {{API/SDK/Webhook}}
**Evidence:** `{{service_path}}`

**Observed Endpoints/Operations:**
- {{endpoint/operation}}
```

### 2. Identify Internal Service Integrations

For microservice or modular architectures:

**Internal Integration Types:**
- Shared libraries
- Cross-module service calls
- Event bus communications
- Shared state stores

**Document:**
```markdown
### 6.2 Internal Services

| Service | Consumer Modules | Purpose |
|---------|------------------|---------|
| {{shared_lib}} | {{modules}} | {{purpose}} |
```

### 3. Extract Non-Functional Requirements from Patterns

**CRITICAL: Only document NFRs evidenced by code, not assumed.**

#### 3.1 Performance Patterns

**Look for:**
- Caching implementations
- Pagination patterns
- Lazy loading
- Debouncing/throttling
- Query optimization hints

**Write:**
```markdown
### 7.1 Performance

- **NFR-PERF-001:** {{observed_pattern}}
  - *Evidence:* {{where_observed}}
```

#### 3.2 Security Patterns

**Look for:**
- Authentication mechanisms
- Authorization guards
- Input validation
- CSRF protection
- XSS prevention
- Rate limiting

**Write:**
```markdown
### 7.2 Security

- **NFR-SEC-001:** {{observed_pattern}}
  - *Evidence:* {{where_observed}}
```

#### 3.3 Localization Patterns

**Look for:**
- i18n/l10n libraries
- Translation files
- RTL support
- Date/number formatting
- Timezone handling

**Write:**
```markdown
### 7.3 Localization

- **NFR-L10N-001:** {{observed_pattern}}
  - *Evidence:* {{where_observed}}
```

#### 3.4 Accessibility Patterns

**Look for:**
- ARIA attributes
- Keyboard navigation
- Screen reader support
- Focus management

**Write:**
```markdown
### 7.4 Accessibility

- **NFR-A11Y-001:** {{observed_pattern}}
  - *Evidence:* {{where_observed}}
```

#### 3.5 Reliability Patterns

**Look for:**
- Error boundaries
- Retry logic
- Fallback behaviors
- Offline support
- Health checks

**Write:**
```markdown
### 7.5 Reliability

- **NFR-REL-001:** {{observed_pattern}}
  - *Evidence:* {{where_observed}}
```

### 4. Document Technical Constraints

From technology stack analysis:

```markdown
## 8. Technical Constraints

### 8.1 Technology Stack

(Already populated in Step 2)

### 8.2 Architectural Patterns

(Already populated in Step 2)

### 8.3 Development Constraints

| Constraint | Description | Evidence |
|------------|-------------|----------|
| {{constraint}} | {{desc}} | {{source}} |
```

### 5. Write to PRD

Update Sections 6 and 7:

```markdown
## 6. Integrations

### 6.1 External APIs
{{external_integrations}}

### 6.2 Internal Services
{{internal_integrations}}

---

## 7. Non-Functional Requirements

### 7.1 Performance
{{perf_nfrs}}

### 7.2 Security
{{sec_nfrs}}

### 7.3 Localization
{{l10n_nfrs}}

### 7.4 Accessibility
{{a11y_nfrs}}

### 7.5 Reliability
{{rel_nfrs}}
```

### 6. Present Findings

"**Integrations & NFRs Extracted**

**External Integrations:** {{count}}
{{integration_summary}}

**Non-Functional Requirements:**
- Performance: {{count}} patterns observed
- Security: {{count}} patterns observed
- Localization: {{count}} patterns observed
- Reliability: {{count}} patterns observed

These NFRs reflect observed code patterns, not assumptions.

[C] Continue to Complete & Polish (Step 7 of 7)
[E] Edit integrations or NFRs
[D] Show detailed breakdown"

### Menu Handling

- IF C: Save to PRD, add step to stepsCompleted, read fully and follow: `{nextStepFile}`
- IF E: Accept corrections, update content, redisplay menu
- IF D: Show full Sections 6 and 7, redisplay menu

---

## SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- All external integrations documented
- NFRs extracted from observed patterns only
- Evidence cited for every NFR
- No assumed/invented requirements

### ❌ FAILURE:
- Inventing integrations not in code
- Assuming NFRs without evidence
- Missing security patterns
- Not documenting technical constraints
