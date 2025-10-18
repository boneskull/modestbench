# Implement Workflow - Execute Task Plan

**When to use**: After generating the tasks.md file. This workflow executes the implementation plan by processing and executing all tasks in dependency order.

**User input context**: The user may provide specific guidance on which tasks to focus on, skip, or execute in a particular order.

## Execution Steps

### 1. Load Prerequisites

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

### 2. Load and Analyze Implementation Context

- **REQUIRED**: Read tasks.md for the complete task list and execution plan
- **REQUIRED**: Read plan.md for tech stack, architecture, and file structure
- **IF EXISTS**: Read data-model.md for entities and relationships
- **IF EXISTS**: Read contracts/ for API specifications and test requirements
- **IF EXISTS**: Read research.md for technical decisions and constraints
- **IF EXISTS**: Read quickstart.md for integration scenarios

### 3. Parse Tasks Structure

Parse tasks.md structure and extract:

- **Task phases**: Setup, Tests, Core, Integration, Polish
- **Task dependencies**: Sequential vs parallel execution rules
- **Task details**: ID, description, file paths, parallel markers [P]
- **Execution flow**: Order and dependency requirements

### 4. Execute Implementation

Execute implementation following the task plan:

- **Phase-by-phase execution**: Complete each phase before moving to the next
- **Respect dependencies**: Run sequential tasks in order, parallel tasks [P] can run together
- **Follow TDD approach**: Execute test tasks before their corresponding implementation tasks
- **File-based coordination**: Tasks affecting the same files must run sequentially
- **Validation checkpoints**: Verify each phase completion before proceeding

### 5. Implementation Execution Rules

- **Setup first**: Initialize project structure, dependencies, configuration
- **Tests before code**: Write tests for contracts, entities, and integration scenarios
- **Core development**: Implement models, services, CLI commands, endpoints
- **Integration work**: Database connections, middleware, logging, external services
- **Polish and validation**: Unit tests, performance optimization, documentation

### 6. Progress Tracking and Error Handling

- Report progress after each completed task
- Halt execution if any non-parallel task fails
- For parallel tasks [P], continue with successful tasks, report failed ones
- Provide clear error messages with context for debugging
- Suggest next steps if implementation cannot proceed
- **IMPORTANT**: For completed tasks, make sure to mark the task off as [X] in the tasks file

### 7. Completion Validation

- Verify all required tasks are completed
- Check that implemented features match the original specification
- Validate that tests pass and coverage meets requirements
- Confirm the implementation follows the technical plan
- Report final status with summary of completed work

## Important Notes

- This workflow assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running the tasks workflow first to regenerate the task list
- User-provided context from the conversation may prioritize certain tasks or modify execution order
- All file paths must be absolute
- Mark tasks as complete [X] in tasks.md as they are finished
- Follow TDD: write tests before implementation

## Next Steps

After completing this workflow, recommend:

- Running the analyze workflow to validate implementation consistency
- Or addressing any failed tasks before proceeding
