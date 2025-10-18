# Plan Workflow - Generate Implementation Plan

**When to use**: After creating and clarifying a feature specification. This workflow generates design artifacts including architecture, data models, contracts, and a quickstart guide.

**User input context**: The user may provide additional implementation details or technical context that should be incorporated into the planning process.

## Execution Steps

### 1. Setup and Validation

Run `.specify/scripts/bash/setup-plan.sh --json` from the repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. All future file paths must be absolute.

**BEFORE proceeding**, inspect FEATURE_SPEC for a `## Clarifications` section with at least one `Session` subheading. If missing or clearly ambiguous areas remain (vague adjectives, unresolved critical choices), PAUSE and instruct the user to run the clarify workflow first to reduce rework. Only continue if: (a) Clarifications exist OR (b) an explicit user override is provided (e.g., "proceed without clarification"). Do not attempt to fabricate clarifications yourself.

### 2. Analyze Feature Specification

Read and analyze the feature specification to understand:

- The feature requirements and user stories
- Functional and non-functional requirements
- Success criteria and acceptance criteria
- Any technical constraints or dependencies mentioned

### 3. Load Constitution

Read the constitution at `.specify/memory/constitution.md` to understand constitutional requirements.

### 4. Execute Implementation Plan Template

- Load `.specify/templates/plan-template.md` (already copied to IMPL_PLAN path)
- Set Input path to FEATURE_SPEC
- Run the Execution Flow (main) function steps 1-9
- The template is self-contained and executable
- Follow error handling and gate checks as specified
- Let the template guide artifact generation in $SPECS_DIR:
  - Phase 0 generates research.md
  - Phase 1 generates data-model.md, contracts/, quickstart.md
  - Phase 2 generates tasks.md
- Incorporate user-provided details from the conversation into Technical Context
- Update Progress Tracking as you complete each phase

### 5. Verify Execution Completed

- Check Progress Tracking shows all phases complete
- Ensure all required artifacts were generated
- Confirm no ERROR states in execution

### 6. Report Results

Report results with branch name, file paths, and generated artifacts.

## Important Notes

- Use absolute paths with the repository root for all file operations to avoid path issues
- The plan template is self-contained and provides its own execution logic
- Respect the gate check that requires clarifications before proceeding
- All generated artifacts should align with the constitution

## Next Steps

After completing this workflow, recommend:

- Running the tasks workflow to generate actionable task breakdown
- Or reviewing generated artifacts if clarifications are needed
