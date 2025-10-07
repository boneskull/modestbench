
# Implementation Plan: ModestBench Framework

**Branch**: `001-develop-modestbench-a` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-develop-modestbench-a/spec.md`

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
ModestBench Framework: A TypeScript CLI tool that wraps tinybench to provide structured, consistent benchmark execution with hierarchical organization (files → suites → tasks), real-time progress tracking, historical result storage, and multiple output formats (human-readable, JSON, CSV).

## Technical Context
**Language/Version**: TypeScript (Node.js 18+)
**Primary Dependencies**: tinybench (benchmark engine), yargs (CLI), consola (logging/colors), ora or cli-progress (progress indicators)
**Storage**: Local filesystem (JSON/CSV files for historical data)
**Testing**: node:test runner (describe/it), bupkis (assertions)
**Target Platform**: Node.js CLI tool (cross-platform)
**Project Type**: single (CLI package)
**Performance Goals**: Handle 1000+ benchmarks efficiently, <2s startup time, real-time progress updates
**Constraints**: No emojis in output, support all tinybench configuration options, TypeScript strict mode
**Scale/Scope**: Support large benchmark suites, indefinite historical data storage, extensible reporter system

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Phase 1 Re-evaluation:**
**Code Quality Standards**: ✅ ESLint + typescript-eslint specified, Prettier for formatting, TypeScript strict mode
**Test-Driven Development**: ✅ node:test + bupkis specified, contract tests defined in contracts/, 90% coverage target
**User Experience Consistency**: ✅ CLI contracts specify consistent error handling, JSON/CSV formats, help documentation
**Performance Requirements**: ✅ <2s startup, 1000+ benchmarks, progress tracking with ETA, performance validation in quickstart
**Continuous Integration**: ✅ Quality gates through TypeScript compilation, linting, testing, CI/CD examples in quickstart

**POST-DESIGN STATUS**: ✅ ALL CONSTITUTIONAL REQUIREMENTS SATISFIED

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
├── cli/              # CLI entry point and command handling
├── core/             # Core benchmark execution engine
├── reporters/        # Output formatters (human, JSON, CSV)
├── storage/          # Historical data persistence
├── progress/         # Progress tracking and estimation
├── config/           # Configuration management
└── types/            # TypeScript type definitions

tests/
├── contract/         # API contract tests
├── integration/      # End-to-end CLI tests
└── unit/             # Component unit tests

config/
├── .eslintrc.js
├── prettier.config.js
└── tsconfig.json
```

**Structure Decision**: Single TypeScript CLI package with modular architecture. Each major component (CLI, core engine, reporters, storage, progress tracking) is separated for testability and extensibility. Reporter system uses plugin pattern for easy addition of new output formats.

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
*Prerequisites: research.md complete*

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

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Extract from contracts/cli-commands.md → CLI command implementation tasks
- Extract from contracts/core-api.md → API interface implementation tasks
- Extract from data-model.md → TypeScript type definitions and classes
- Extract from quickstart.md → example benchmark files and documentation

**Specific Task Categories**:
1. **Setup Tasks**: Project structure, TypeScript config, package.json, dependencies
2. **Test Tasks**: Contract tests for CLI commands, API interfaces, file structure validation
3. **Core Implementation**: 
   - BenchmarkEngine, ConfigurationManager, FileLoader
   - ProgressManager, TimeEstimationEngine, ReporterRegistry
   - HumanReporter, JsonReporter, CsvReporter
4. **CLI Implementation**: yargs command setup, argument parsing, error handling
5. **Integration Tasks**: End-to-end CLI tests, performance validation
6. **Documentation**: README, API docs, usage examples

**TDD Ordering Strategy**:
- Setup tasks first (T001-T003)
- Contract tests before implementation (T004-T015 → T016-T030)
- Core interfaces before implementations
- CLI commands after core engine
- Integration tests after individual components
- Documentation and examples last

**Parallel Execution Markers [P]**:
- Type definitions (different files)
- Reporter implementations (independent)
- Contract tests (separate test files)
- Documentation tasks

**Estimated Output**: 35-40 numbered, ordered tasks following constitutional TDD requirements

**Dependencies**:
- TypeScript compilation gates before runtime tests
- Core API implementations before CLI layer
- File structure validation before benchmark loading
- Progress tracking before reporter integration

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

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
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
