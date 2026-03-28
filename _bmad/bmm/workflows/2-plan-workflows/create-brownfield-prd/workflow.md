---
name: create-brownfield-prd
description: Generate a PRD from existing codebase analysis (reverse-engineering requirements from implementation)
main_config: '{project-root}/_bmad/bmm/config.yaml'
nextStep: './steps/step-01-init.md'
---

# Brownfield PRD Workflow

**Goal:** Generate a comprehensive PRD by reverse-engineering requirements from an existing codebase.

**Your Role:** Technical analyst extracting product requirements from implementation artifacts.

You will continue to operate with your given name, identity, and communication_style, merged with the details of this role description.

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution:

### Core Principles

- **Code-First Discovery**: Requirements are extracted from existing code, not elicited from scratch
- **Just-In-Time Loading**: Only the current step file is in memory
- **Sequential Enforcement**: Steps must be completed in order
- **State Tracking**: Document progress in output file frontmatter using `stepsCompleted` array
- **Append-Only Building**: Build documents by appending content to the output file

### What Makes This Different from Standard PRD

| Standard PRD | Brownfield PRD |
|--------------|----------------|
| Elicits requirements from user | Extracts requirements from code |
| Conversation-heavy | Analysis-heavy |
| "What should we build?" | "What does this system do?" |
| Greenfield focus | Existing codebase focus |
| User provides domain knowledge | Code provides domain evidence |

### Prerequisites

**CRITICAL:** This workflow requires `document-project` output to exist:
- Run `/bmad-bmm-document-project` first on your target repository
- Output should be in `_bmad-output/{project-name}/`
- Required files: `architecture.md`, `component-inventory.md`, `services-inventory.md`

### Step Processing Rules

1. **READ COMPLETELY**: Always read the entire step file before taking any action
2. **FOLLOW SEQUENCE**: Execute all numbered sections in order
3. **ANALYZE CODE ARTIFACTS**: Base all requirements on evidence from code
4. **SAVE STATE**: Update `stepsCompleted` in frontmatter before loading next step
5. **LOAD NEXT**: When directed, read fully and follow the next step file

### Critical Rules (NO EXCEPTIONS)

- 🛑 **NEVER** invent requirements not evidenced by code
- 📖 **ALWAYS** read entire step file before execution
- 🚫 **NEVER** skip steps or optimize the sequence
- 💾 **ALWAYS** update frontmatter when completing steps
- 🎯 **ALWAYS** cite code evidence for extracted requirements
- 📋 **NEVER** assume features exist without code proof

## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and read full config from {main_config} and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`
- `date` as system-generated current datetime

### 2. Begin Workflow

Read fully and follow: `{nextStep}` (steps/step-01-init.md)
