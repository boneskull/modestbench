# Tasks: ModestBench Framework

**Input**: Design documents from `/specs/001-develop-modestbench-a/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript + tinybench + yargs + consola + cli-progress tech stack
2. Load optional design documents:
   → data-model.md: Extract entities → TypeScript interface tasks
   → contracts/: CLI commands & Core API → contract test tasks
   → research.md: Extract tech decisions → setup tasks
   → quickstart.md: Extract user scenarios → integration test tasks
3. Generate tasks by category:
   → Setup: TypeScript project, dependencies, linting/formatting
   → Tests: CLI contract tests, API contract tests, integration tests
   → Core: Type definitions, core engine, reporters, CLI commands
   → Integration: Progress tracking, storage, configuration
   → Polish: unit tests, performance validation, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Tasks numbered T001-T038
6. All CLI commands and API interfaces have contract tests
7. All entities have TypeScript implementations
8. All user scenarios have integration tests
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Single TypeScript CLI package structure as defined in plan.md:
- `src/` for all source code
- `tests/` for all test files
- `config/` for build configuration

## Phase 3.1: Setup
- [ ] T001 Create project structure with src/, tests/, config/ directories
- [ ] T002 Initialize TypeScript project with package.json and dependencies (tinybench, yargs, consola, cli-progress)
- [ ] T003 [P] Configure TypeScript compiler in config/tsconfig.json with strict mode
- [ ] T004 [P] Configure ESLint + @typescript-eslint in config/.eslintrc.js
- [ ] T005 [P] Configure Prettier formatting in config/prettier.config.js

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests for CLI Commands
- [ ] T006 [P] Contract test `modestbench run` command in tests/contract/test_run_command.test.ts
- [ ] T007 [P] Contract test `modestbench history` command in tests/contract/test_history_command.test.ts
- [ ] T008 [P] Contract test `modestbench init` command in tests/contract/test_init_command.test.ts
- [ ] T009 [P] Contract test `modestbench validate` command in tests/contract/test_validate_command.test.ts

### Contract Tests for Core API
- [ ] T010 [P] Contract test BenchmarkEngine interface in tests/contract/test_benchmark_engine.test.ts
- [ ] T011 [P] Contract test ConfigurationManager interface in tests/contract/test_configuration_manager.test.ts
- [ ] T012 [P] Contract test HistoryStorage interface in tests/contract/test_history_storage.test.ts
- [ ] T013 [P] Contract test ProgressManager interface in tests/contract/test_progress_manager.test.ts
- [ ] T014 [P] Contract test Reporter interfaces in tests/contract/test_reporters.test.ts

### Integration Tests from User Scenarios
- [ ] T015 [P] Integration test benchmark file execution with progress tracking in tests/integration/test_run_benchmarks.test.ts
- [ ] T016 [P] Integration test historical results viewing and trends in tests/integration/test_history_viewing.test.ts
- [ ] T017 [P] Integration test configuration file and CLI argument merging in tests/integration/test_configuration.test.ts
- [ ] T018 [P] Integration test multiple reporter output formats in tests/integration/test_reporters.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### TypeScript Type Definitions
- [ ] T019 [P] Create core types in src/types/benchmark.ts (BenchmarkFile, BenchmarkSuite, BenchmarkTask)
- [ ] T020 [P] Create execution types in src/types/execution.ts (BenchmarkRun, BenchmarkResult, RunConfiguration)
- [ ] T021 [P] Create progress types in src/types/progress.ts (ProgressState, TimingEstimate)
- [ ] T022 [P] Create configuration types in src/types/config.ts (ModestBenchConfig, ReporterType)

### Core Engine Implementation
- [ ] T023 BenchmarkEngine class in src/core/engine.ts implementing execution flow
- [ ] T024 [P] BenchmarkFileLoader class in src/core/loader.ts for file discovery and loading
- [ ] T025 [P] ConfigurationManager class in src/config/manager.ts for config merging and validation

### Reporter System
- [ ] T026 [P] Base Reporter interface and registry in src/reporters/registry.ts
- [ ] T027 [P] HumanReporter implementation in src/reporters/human.ts with consola and cli-progress
- [ ] T028 [P] JsonReporter implementation in src/reporters/json.ts
- [ ] T029 [P] CsvReporter implementation in src/reporters/csv.ts

### CLI Interface
- [ ] T030 CLI entry point with yargs configuration in src/cli/index.ts
- [ ] T031 Run command implementation in src/cli/commands/run.ts
- [ ] T032 History command implementation in src/cli/commands/history.ts
- [ ] T033 [P] Init command implementation in src/cli/commands/init.ts
- [ ] T034 [P] Validate command implementation in src/cli/commands/validate.ts

## Phase 3.4: Integration
- [ ] T035 ProgressManager implementation in src/progress/manager.ts with ETA calculation
- [ ] T036 HistoryStorage implementation in src/storage/history.ts with local filesystem
- [ ] T037 Error handling and validation throughout all components

## Phase 3.5: Polish
- [ ] T038 [P] Create example benchmark files and documentation as specified in quickstart.md

## Dependencies
```
Setup Phase (T001-T005):
  No dependencies - can run in any order

Test Phase (T006-T018):
  T006-T018 → Depend on T001-T005 (project structure)
  All [P] tasks can run in parallel after setup

Implementation Phase (T019-T037):
  T019-T022 → Must complete before T023-T037 (types before implementation)
  T023 → Depends on T019-T022 (engine needs types)
  T024-T025 → Depend on T019-T022, can run parallel to T023
  T026-T029 → Depend on T019-T022, can run parallel after types
  T030-T034 → Depend on T023-T029 (CLI needs engine and reporters)
  T035-T037 → Depend on T023-T025 (integration needs core components)

Polish Phase (T038):
  T038 → Depends on all implementation tasks
```

## Parallel Example Groups
```bash
# Setup phase (all parallel after T001)
Task T002: "Initialize TypeScript project..."
Task T003: "Configure TypeScript compiler..."
Task T004: "Configure ESLint..."
Task T005: "Configure Prettier..."

# Contract tests (all parallel after setup)
Task T006: "Contract test modestbench run command..."
Task T007: "Contract test modestbench history command..."
Task T008: "Contract test modestbench init command..."
# ... (T009-T018 can all run in parallel)

# Type definitions (all parallel)
Task T019: "Create core types..."
Task T020: "Create execution types..."
Task T021: "Create progress types..."
Task T022: "Create configuration types..."

# Reporter implementations (all parallel after types)
Task T026: "Base Reporter interface..."
Task T027: "HumanReporter implementation..."
Task T028: "JsonReporter implementation..."
Task T029: "CsvReporter implementation..."
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify all tests fail before implementing (TDD requirement)
- Each task should take 15-30 minutes to complete
- Commit after each task completion
- TypeScript compilation must pass before runtime tests

## Task Generation Rules Applied
1. **From contracts/cli-commands.md**: Generated T006-T009 (CLI command tests) and T030-T034 (CLI implementations)
2. **From contracts/core-api.md**: Generated T010-T014 (API contract tests) and T023-T025, T035-T036 (API implementations)
3. **From data-model.md**: Generated T019-T022 (TypeScript type definitions for all entities)
4. **From quickstart.md**: Generated T015-T018 (integration tests for user scenarios) and T038 (examples)
5. **TDD Ordering**: All test tasks (T006-T018) before implementation tasks (T019-T037)
6. **Dependency Management**: Types before implementations, core before CLI, integration after core

## Validation Checklist
- [x] All CLI commands have corresponding tests (T006-T009 → T030-T034)
- [x] All API interfaces have contract tests (T010-T014 → T023-T025, T035-T036)
- [x] All entities have TypeScript implementations (T019-T022)
- [x] All user scenarios have integration tests (T015-T018)
- [x] Tests come before implementation (T006-T018 → T019-T037)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] Dependencies clearly documented
- [x] Constitutional TDD requirements satisfied