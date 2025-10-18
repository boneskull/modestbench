# Implementation Plan: Fix ESLint Errors

**Branch**: `002-fix-eslint-errors` | **Date**: October 14, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fix-eslint-errors/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Fix all ESLint errors in the ModestBench codebase to comply with stricter linting rules. Primary issues include TypeScript unsafe operations, improper use of `any` types, global variable usage in benchmark files, func-style violations requiring arrow functions, and TypeScript configuration issues. The technical approach involves proper type annotations, finding/installing @types packages for dependencies, converting function declarations to arrow functions, and handling global variables appropriately in different contexts.

## Technical Context

**Language/Version**: TypeScript 5.x, JavaScript ES2022
**Primary Dependencies**: ESLint 8.x, @typescript-eslint/eslint-plugin, Node.js globals, DefinitelyTyped packages
**Storage**: N/A (code quality improvement)
**Testing**: Node.js test runner, existing test suite integrity
**Target Platform**: Node.js development environment
**Project Type**: single (TypeScript/JavaScript library with CLI and examples)
**Performance Goals**: No performance impact, maintain existing benchmarking accuracy
**Constraints**: Zero functional changes, maintain API compatibility, all tests must continue passing
**Scale/Scope**: ~20-30 files with ESLint errors, 134+ individual violations including TypeScript unsafe operations, global variable usage, func-style violations

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Code Quality Standards**: ✅ ESLint configuration already stricter, task is to fix violations to maintain quality standards. Design ensures proper typing and linting compliance.
**Test-Driven Development**: ✅ Existing tests must continue passing, no new features requiring new tests. Validation contracts ensure test preservation.
**User Experience Consistency**: ✅ No user-facing changes, internal code quality improvement only. Quickstart guide maintains consistent developer experience.
**Performance Requirements**: ✅ No performance impact expected, benchmarking functionality preserved. Contracts validate benchmark accuracy.
**Continuous Integration**: ✅ Goal is to ensure CI passes ESLint checks, fixing current blocking issues. Success criteria explicitly require `npx eslint .` exit code 0.

**Post-Design Review**: All constitutional requirements remain satisfied. The design approach maintains code quality through systematic file-by-file fixes, preserves existing functionality through comprehensive validation, and ensures CI pipeline success.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
src/
├── cli/
│   ├── index.ts
│   └── commands/
│       ├── history.ts        # TypeScript unsafe operations
│       ├── init.ts          # TypeScript unsafe argument
│       ├── run.ts
│       └── validate.ts
├── config/
│   └── manager.ts
├── core/
│   ├── engine.ts
│   ├── error-manager.ts
│   ├── index.ts
│   └── loader.ts
├── progress/
│   ├── index.ts
│   └── manager.ts
├── reporters/
│   ├── csv.ts
│   ├── human.ts
│   ├── index.ts
│   ├── json.ts
│   └── registry.ts
├── storage/
│   ├── history.ts
│   └── index.ts
└── types/
    ├── cli.ts
    ├── core.ts
    ├── index.ts
    ├── interfaces.ts
    └── utility.ts

test/
├── contract/                 # TypeScript unsafe call operations
├── integration/             # TypeScript unsafe argument operations
└── unit/

examples/
├── benchmarks/              # Global variable issues, setTimeout undefined
└── scripts/                 # TypeScript unsafe operations

.wallaby.js                  # TypeScript configuration parsing error
```

**Structure Decision**: Single project structure with TypeScript source files and JavaScript benchmark examples. ESLint errors are distributed across source files (TypeScript strict mode violations), test files (unsafe operations in contract tests), and example files (global variable usage).

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate one task per file containing ESLint errors (systematic file-by-file approach)
- Prioritize tasks: Configuration issues → Source files → Test files → Example files
- Each file task includes: error analysis, type fixing, validation, and testing
- Group related files where beneficial (e.g., all contract tests together)

**Ordering Strategy**:

- Priority 1: Configuration fixes (.wallaby.js, TypeScript config)
- Priority 2: Core source files (src/cli/, src/core/, src/types/)
- Priority 3: Test files (contract and integration tests)
- Priority 4: Example/benchmark files
- Mark [P] for files that can be fixed in parallel (independent files)
- Sequential for files with dependencies

**File-Specific Task Categories**:

1. **TypeScript Source Files**: Focus on unsafe operations, proper typing, arrow functions
2. **Test Contract Files**: Fix unsafe calls while maintaining test assertions
3. **Example Benchmark Files**: Handle global variables, setTimeout, Node.js environment
4. **Configuration Files**: Resolve TypeScript parsing and ESLint config issues

**Validation Strategy Per Task**:

- Run ESLint on specific file to verify error reduction
- Execute related tests to ensure functionality preservation
- TypeScript compilation check for source files
- Manual execution test for benchmark files

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md covering all files with ESLint violations

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No constitutional violations requiring justification_

No complexity deviations identified. The approach follows standard practices:

- Single project structure (no additional projects needed)
- Direct file fixes without architectural changes
- Standard TypeScript typing practices
- Established ESLint error resolution patterns

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
