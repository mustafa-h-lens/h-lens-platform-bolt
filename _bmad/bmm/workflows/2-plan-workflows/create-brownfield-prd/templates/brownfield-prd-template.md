---
stepsCompleted: []
inputDocuments: []
workflowType: 'brownfield-prd'
sourceProject: ''
extractedAt: ''
---

# Product Requirements Document (Brownfield)

**Project:** {{project_name}}
**Source Repository:** {{source_project}}
**Extracted By:** {{user_name}}
**Date:** {{date}}

> This PRD was reverse-engineered from existing implementation. Requirements reflect current system behavior, not aspirational features.

---

## Executive Summary

<!-- Auto-generated summary of the system's purpose and capabilities -->

---

## 1. Product Overview

### 1.1 System Purpose

<!-- What problem does this system solve? (extracted from code patterns) -->

### 1.2 Target Users

<!-- Who uses this system? (extracted from auth/roles/permissions) -->

### 1.3 Business Domain

<!-- What domain does this operate in? (extracted from data models) -->

---

## 2. User Roles & Permissions

<!-- Extracted from authentication, authorization, guards, middleware -->

| Role | Description | Key Permissions |
|------|-------------|-----------------|

---

## 3. Core Features

<!-- Each feature extracted from modules/components with code evidence -->

### 3.1 [Feature Name]

**Code Evidence:** `path/to/module`

**Description:**

**Functional Requirements:**
- FR-001:
- FR-002:

---

## 4. User Journeys

<!-- Extracted from routing, navigation, workflows -->

### 4.1 [Journey Name]

**Entry Point:**
**Steps:**
1.
2.

---

## 5. Data Model

<!-- Extracted from models, schemas, database migrations -->

### 5.1 Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|

### 5.2 Relationships

<!-- Entity relationships extracted from foreign keys, relations -->

---

## 6. Integrations

<!-- External services, APIs, third-party systems -->

### 6.1 External APIs

| Integration | Purpose | Evidence |
|-------------|---------|----------|

### 6.2 Internal Services

<!-- Microservices, shared libraries -->

---

## 7. Non-Functional Requirements

<!-- Extracted from code patterns, not assumed -->

### 7.1 Performance

- NFR-PERF-001: [Observed caching patterns]
- NFR-PERF-002: [Observed pagination patterns]

### 7.2 Security

- NFR-SEC-001: [Observed auth patterns]
- NFR-SEC-002: [Observed validation patterns]

### 7.3 Localization

- NFR-L10N-001: [Observed i18n patterns]

---

## 8. Technical Constraints

<!-- Technology stack, architectural decisions -->

### 8.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|

### 8.2 Architectural Patterns

<!-- Patterns observed in the codebase -->

---

## 9. Appendix

### 9.1 Source Documents

<!-- List of document-project outputs used -->

### 9.2 Code Coverage

<!-- Which parts of the codebase were analyzed -->

### 9.3 Known Gaps

<!-- Areas where code didn't clearly indicate requirements -->
