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
5. Tasks numbered T001-T042 (expanded from T038 for better granularity)
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
  - **Reference**: data-model.md lines 8-42 for complete interface definitions
  - **Include**: FileMetadata interface for change detection
- [ ] T020 [P] Create execution types in src/types/execution.ts (BenchmarkRun, BenchmarkResult, RunConfiguration)
  - **Reference**: data-model.md lines 44-86 for execution models and RunStatus enum
  - **Include**: ExecutionError and ExecutionPhase enums from lines 87-105
- [ ] T021 [P] Create progress types in src/types/progress.ts (ProgressState, TimingEstimate)
  - **Reference**: data-model.md lines 107-130 for progress tracking models
  - **Include**: ProgressLevel interface and confidence calculations
- [ ] T022 [P] Create configuration types in src/types/config.ts (ModestBenchConfig, ReporterType)
  - **Reference**: data-model.md lines 132-169 for configuration management
  - **Include**: Environment info types from lines 87-105

### Core Engine Implementation (Sequential - Build Foundation First)
- [ ] T023a Create BenchmarkEngine class structure in src/core/engine.ts
  - **Reference**: contracts/core-api.md lines 5-30 for interface definition
  - **Implement**: Constructor with dependency injection for ConfigManager, FileLoader, ReporterRegistry
  - **Stub**: All interface methods (execute, validate, discover, registerReporter, getReporters)
- [ ] T023b Implement BenchmarkEngine.discover() method
  - **Reference**: contracts/core-api.md lines 18-19 for method signature
  - **Logic**: Use glob patterns from research.md lines 95-100 for file discovery
  - **Integration**: Call FileLoader for pattern matching and exclusions
- [ ] T023c Implement BenchmarkEngine.validate() method  
  - **Reference**: contracts/core-api.md lines 14-17 for validation interface
  - **Logic**: File structure validation from data-model.md lines 200-208
  - **Error Handling**: Return ValidationResult with specific error codes from contracts/cli-commands.md lines 85-95
- [ ] T023d Implement BenchmarkEngine.execute() method core flow
  - **Reference**: contracts/core-api.md lines 8-12 for execution signature
  - **Flow**: discovery → validation → progress init → file processing → reporting
  - **Integration**: Coordinate with ProgressManager and Reporter system
- [ ] T023e Implement BenchmarkEngine reporter registration methods
  - **Reference**: contracts/core-api.md lines 20-26 for reporter methods
  - **Integration**: Delegate to ReporterRegistry for actual storage and retrieval

### File System and Configuration (Parallel after Types)
- [ ] T024 [P] BenchmarkFileLoader class in src/core/loader.ts
  - **Reference**: contracts/core-api.md lines 45-70 for FileLoader interface
  - **File Discovery**: Implement glob pattern matching from research.md lines 95-100
  - **File Parsing**: Support the export patterns from contracts/cli-commands.md lines 155-185
  - **Validation**: File structure checks per data-model.md lines 200-208
- [ ] T025 [P] ConfigurationManager class in src/config/manager.ts
  - **Reference**: contracts/core-api.md lines 32-43 for ConfigurationManager interface
  - **Merging Logic**: CLI args > config file > defaults priority from research.md lines 75-85
  - **File Support**: JSON/YAML/JS/TS config files from contracts/cli-commands.md lines 130-150

### Reporter System (Parallel after Types)
- [ ] T026a [P] Base Reporter interface and ReporterRegistry in src/reporters/registry.ts
  - **Reference**: contracts/core-api.md lines 145-165 for Reporter interface and registry
  - **Implementation**: Plugin-based system from research.md lines 35-42
  - **Include**: Lifecycle hooks (onStart, onProgress, onFileStart, etc.)
- [ ] T026b [P] HumanReporter implementation in src/reporters/human.ts  
  - **Reference**: contracts/core-api.md lines 167-175 for HumanReporter interface
  - **Dependencies**: consola for colors, cli-progress for progress bars (research.md lines 27-31)
  - **Output**: Colorful tables and progress as shown in quickstart.md lines 295-305
  - **No Emojis**: Strict requirement from plan.md constraints
- [ ] T026c [P] JsonReporter implementation in src/reporters/json.ts
  - **Reference**: contracts/core-api.md lines 177-183 for JsonReporter interface  
  - **Output Format**: Match JSON structure from quickstart.md lines 307-325
  - **Streaming**: Support large datasets per data-model.md lines 244-248
- [ ] T026d [P] CsvReporter implementation in src/reporters/csv.ts
  - **Reference**: contracts/core-api.md lines 185-200 for CsvReporter interface
  - **Output Format**: Match CSV structure from quickstart.md lines 327-330
  - **Options**: Configurable delimiter/quote from interface

### CLI Interface (Sequential - Build on Core Engine)
- [ ] T030 CLI entry point with yargs configuration in src/cli/index.ts
  - **Reference**: contracts/cli-commands.md lines 1-15 for command overview
  - **Setup**: yargs with command routing, global options, help generation
  - **Integration**: Initialize BenchmarkEngine with proper dependency injection
- [ ] T031 Run command implementation in src/cli/commands/run.ts
  - **Reference**: contracts/cli-commands.md lines 7-35 for run command specification
  - **Arguments**: Pattern, reporters, output, iterations, timeout, etc.
  - **Flow**: Config merge → Engine.discover → Engine.validate → Engine.execute
  - **Exit Codes**: 0=success, 1=failures, 2=config error, 3=discovery error
- [ ] T032 History command implementation in src/cli/commands/history.ts
  - **Reference**: contracts/cli-commands.md lines 37-62 for history command specification
  - **Sub-commands**: list, show, compare, trends, clean with specific options
  - **Integration**: Use HistoryStorage for data retrieval and filtering
- [ ] T033 [P] Init command implementation in src/cli/commands/init.ts
  - **Reference**: contracts/cli-commands.md lines 64-82 for init command specification
  - **File Generation**: Create config files and optional example benchmarks
  - **Template Source**: Use examples from quickstart.md lines 10-50
- [ ] T034 [P] Validate command implementation in src/cli/commands/validate.ts
  - **Reference**: contracts/cli-commands.md lines 84-110 for validate command specification
  - **Validation**: File syntax, structure, config, dependencies, anti-patterns
  - **Integration**: Use BenchmarkEngine.validate() method

## Phase 3.4: Integration (Sequential - Depends on Core Components)
- [ ] T035a ProgressManager implementation in src/progress/manager.ts - Core Structure
  - **Reference**: contracts/core-api.md lines 75-95 for ProgressManager interface
  - **State Management**: Track files/suites/tasks progress per data-model.md lines 107-130
  - **Initialization**: Set up progress tracking for BenchmarkRun
- [ ] T035b ProgressManager ETA calculation and time estimation
  - **Reference**: contracts/core-api.md lines 97-110 for TimeEstimationEngine interface
  - **Algorithm**: Use both historical data and current patterns (from clarifications)
  - **Cache**: Load/save estimates per data-model.md lines 225-235
- [ ] T036a HistoryStorage implementation in src/storage/history.ts - Core Operations
  - **Reference**: contracts/core-api.md lines 47-73 for HistoryStorage interface
  - **File Structure**: Use layout from data-model.md lines 215-225 (.modestbench/ directory)
  - **Operations**: saveRun, loadRun, queryRuns with filtering
- [ ] T036b HistoryStorage cleanup and export functionality
  - **Reference**: contracts/core-api.md lines 60-73 for cleanup and export methods
  - **Retention**: Store indefinitely unless manually cleared (from clarifications)
  - **Export**: Support JSON/CSV formats for historical data
- [ ] T037 Error handling and validation throughout all components
  - **Reference**: contracts/cli-commands.md lines 85-95 for error codes and formats
  - **Integration**: ErrorManager from contracts/core-api.md lines 260-280
  - **Graceful Degradation**: Continue execution on individual failures per plan.md

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
  T019-T022 → Must complete before all other implementation (types are foundation)
  
  Core Engine (Sequential Build):
  T023a → Depends on T019-T022 (needs types)
  T023b → Depends on T023a (needs class structure)
  T023c → Depends on T023a (needs class structure)  
  T023d → Depends on T023b, T023c, T024, T025 (needs discovery, validation, config)
  T023e → Depends on T026a (needs ReporterRegistry)
  
  Support Systems (Parallel after types):
  T024, T025 → Depend on T019-T022, can run parallel to T023a-c
  T026a-d → Depend on T019-T022, can run parallel after types
  
  CLI Layer (Sequential after core):
  T030 → Depends on T023a-e, T026a-d (needs engine and reporters)
  T031, T032 → Depend on T030, T035a, T036a (needs CLI setup and core services)
  T033, T034 → Depend on T030, can run parallel to T031-T032
  
  Integration (Sequential after core):
  T035a → Depends on T019-T022 (needs types)
  T035b → Depends on T035a (needs progress manager structure)
  T036a → Depends on T019-T022 (needs types)
  T036b → Depends on T036a (needs storage structure)
  T037 → Depends on all previous tasks (integrates error handling across system)

Polish Phase (T038):
  T038 → Depends on all implementation tasks
```

## Implementation Data Flow Guide
```
1. File Discovery (T024): pattern → glob → file paths
2. Configuration (T025): CLI args + config file → merged config
3. Validation (T023c): file paths → parsed structures → validation results
4. Execution (T023d): validated files → benchmark runs → results
5. Progress Tracking (T035a-b): execution state → progress updates → ETA
6. Reporting (T026a-d): results + progress → formatted output
7. Storage (T036a-b): completed runs → historical data → persistence
```

## Parallel Example Groups
```bash
# Setup phase (all parallel after T001)
Task T002: "Initialize TypeScript project with package.json..."
Task T003: "Configure TypeScript compiler in config/tsconfig.json..."
Task T004: "Configure ESLint + @typescript-eslint in config/.eslintrc.js..."
Task T005: "Configure Prettier formatting in config/prettier.config.js..."

# Contract tests (all parallel after setup)
Task T006: "Contract test modestbench run command in tests/contract/test_run_command.test.ts..."
Task T007: "Contract test modestbench history command in tests/contract/test_history_command.test.ts..."
# ... (T008-T018 can all run in parallel)

# Type definitions (all parallel)
Task T019: "Create core types from data-model.md lines 8-42..."
Task T020: "Create execution types from data-model.md lines 44-86..."
Task T021: "Create progress types from data-model.md lines 107-130..."
Task T022: "Create configuration types from data-model.md lines 132-169..."

# Core engine (sequential build)
Task T023a: "Create BenchmarkEngine class structure per contracts/core-api.md lines 5-30..."
Task T023b: "Implement discover() method using glob patterns from research.md lines 95-100..."
Task T023c: "Implement validate() method with error codes from cli-commands.md lines 85-95..."

# Support systems (parallel after types, some parallel to core engine)
Task T024: "BenchmarkFileLoader with file discovery per contracts/core-api.md lines 45-70..."
Task T025: "ConfigurationManager with merging logic per contracts/core-api.md lines 32-43..."
Task T026a: "ReporterRegistry with plugin system per contracts/core-api.md lines 145-165..."
```

## Task Validation with Implementation References
- [x] All CLI commands have tests (T006-T009) AND implementations with references (T030-T034)
- [x] All API interfaces have tests (T010-T014) AND implementations with references (T023a-e, T024-T025, T035a-T036b)
- [x] All entities have TypeScript implementations with data-model.md references (T019-T022)
- [x] All user scenarios have integration tests with quickstart.md references (T015-T018)
- [x] Each implementation task includes specific file references and line numbers
- [x] Dependencies clearly show build order and data flow
- [x] Parallel tasks specify exactly which can run concurrently
- [x] TDD requirements satisfied with all tests before implementation

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