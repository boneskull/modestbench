# Tasks Workflow - Generate Actionable Task Breakdown

**When to use**: After completing the plan workflow. This workflow generates a dependency-ordered, actionable task list based on available design artifacts.

**User input context**: The user may provide specific guidance on task organization or emphasis areas that should be incorporated into task generation.

## Execution Steps

### 1. Load Prerequisites

Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

### 2. Load and Analyze Design Documents

Load and analyze available design documents:

- Always read plan.md for tech stack and libraries
- IF EXISTS: Read data-model.md for entities
- IF EXISTS: Read contracts/ for API endpoints
- IF EXISTS: Read research.md for technical decisions
- IF EXISTS: Read quickstart.md for test scenarios

**Note**: Not all projects have all documents. For example:

- CLI tools might not have contracts/
- Simple libraries might not need data-model.md
- Generate tasks based on what's available

### 3. Generate Tasks Following Template

- Use `.specify/templates/tasks-template.md` as the base
- Replace example tasks with actual tasks based on:
  - **Setup tasks**: Project init, dependencies, linting
  - **Test tasks [P]**: One per contract, one per integration scenario
  - **Core tasks**: One per entity, service, CLI command, endpoint
  - **Integration tasks**: DB connections, middleware, logging
  - **Polish tasks [P]**: Unit tests, performance, docs

### 4. Task Generation Rules

- Each contract file → contract test task marked [P]
- Each entity in data-model → model creation task marked [P]
- Each endpoint → implementation task (not parallel if shared files)
- Each user story → integration test marked [P]
- Different files = can be parallel [P]
- Same file = sequential (no [P])

### 5. Order Tasks by Dependencies

- Setup before everything
- Tests before implementation (TDD)
- Models before services
- Services before endpoints
- Core before integration
- Everything before polish

### 6. Include Parallel Execution Examples

- Group [P] tasks that can run together
- Show actual task execution guidance

### 7. Create Tasks File

Create FEATURE_DIR/tasks.md with:

- Correct feature name from implementation plan
- Numbered tasks (T001, T002, etc.)
- Clear file paths for each task
- Dependency notes
- Parallel execution guidance

## Important Notes

- The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context
- User-provided context from the conversation should be incorporated into task prioritization or emphasis
- All file paths must be absolute
- Respect TDD principles: test tasks before implementation tasks

## Next Steps

After completing this workflow, recommend:

- Running the implement workflow to execute the generated tasks
- Or running the analyze workflow to validate consistency across artifacts
