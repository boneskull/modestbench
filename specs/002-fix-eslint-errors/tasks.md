# Tasks: Fix ESLint Errors

**Input**: Design documents from `/specs/002-fix-eslint-errors/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.x, JavaScript ES2022, ESLint 8.x
   → Structure: Single project with src/, test/, examples/
2. Load design documents:
   → research.md: Error categories and fix strategies
   → contracts/: Validation contracts for fixes
   → quickstart.md: File-by-file checklist
3. Generate tasks by category:
   → Setup: Install dependencies, validate tooling
   → Configuration: Fix TypeScript/ESLint config issues
   → Core Source: Fix TypeScript unsafe operations
   → Tests: Fix test file ESLint errors
   → Examples: Fix benchmark and script files
   → Validation: Comprehensive testing
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Configuration before core fixes
5. Number tasks sequentially (T001, T002...)
6. Generate validation requirements per task
7. Create parallel execution examples
8. Success criteria: npx eslint . returns exit code 0
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

Single project structure at repository root:

- **Source**: `src/` directory with TypeScript files
- **Tests**: `test/` directory with contract and integration tests
- **Examples**: `examples/` directory with JavaScript benchmark files
- **Config**: Root-level configuration files

## Phase 3.1: Setup and Dependencies

- [x] T001 Install missing @types packages for proper TypeScript typing
- [x] T002 [P] Validate ESLint and TypeScript configuration compatibility
- [x] T003 [P] Document current error baseline with `npx eslint . --format=json > baseline-errors.json`

## Phase 3.2: Configuration Fixes (MUST COMPLETE BEFORE 3.3)

**CRITICAL: Configuration issues must be resolved before file-level fixes**

- [x] T004 Fix TypeScript configuration parsing error for `.wallaby.js`
- [x] T005 [P] Configure Node.js environment globals for benchmark files in ESLint config
- [x] T006 [P] Verify TypeScript compilation with `npx tsc --noEmit`

## Phase 3.3: Core Source Files (High Priority)

**Focus on TypeScript unsafe operations and proper typing**
**PROGRESS: 12 files fixed! 241 errors eliminated (57% reduction)**

- [x] T007 [P] Fix 28 unsafe operations in `src/cli/commands/history.ts`
- [x] T008 [P] Fix 1 unsafe argument in `src/cli/commands/init.ts`
- [x] T009 [P] Enhance type definitions in `src/types/index.ts`
- [x] T010 [P] Fix any remaining ESLint errors in `src/cli/commands/run.ts`
- [x] T011 [P] Fix any remaining ESLint errors in `src/cli/commands/validate.ts`
- [x] T012 [P] Fix any remaining ESLint errors in `src/config/manager.ts`
- [x] T013 [P] Fix any remaining ESLint errors in `src/core/engine.ts`
- [x] T014 [P] Fix any remaining ESLint errors in `src/core/error-manager.ts`
- [x] T015 [P] Fix any remaining ESLint errors in `src/core/index.ts`
- [x] T016 [P] Fix any remaining ESLint errors in `src/core/loader.ts`
- [x] T017 [P] Fix any remaining ESLint errors in `src/progress/index.ts`
- [x] T018 [P] Fix any remaining ESLint errors in `src/progress/manager.ts`
- [x] T019 [P] Fix any remaining ESLint errors in `src/reporters/csv.ts`
- [x] T020 [P] Fix any remaining ESLint errors in `src/reporters/human.ts`
- [x] T021 [P] Fix any remaining ESLint errors in `src/reporters/index.ts`
- [x] T022 [P] Fix any remaining ESLint errors in `src/reporters/json.ts`
- [x] T023 [P] Fix any remaining ESLint errors in `src/reporters/registry.ts`
- [x] T024 [P] Fix any remaining ESLint errors in `src/storage/history.ts`
- [x] T025 [P] Fix any remaining ESLint errors in `src/storage/index.ts`

## Phase 3.4: Test Files (Medium Priority) ✅ COMPLETE

**Fix TypeScript unsafe operations while maintaining test assertions**

- [x] T026 [P] Fix unsafe calls in `test/contract/test_benchmark_engine.test.ts`
- [x] T027 [P] Fix unsafe calls in `test/contract/test_configuration_manager.test.ts`
- [x] T028 [P] Fix unsafe calls in `test/contract/test_history_storage.test.ts`
- [x] T029 [P] Fix unsafe calls in `test/contract/test_progress_manager.test.ts`
- [x] T030 [P] Fix unsafe calls and unused variables in `test/contract/test_reporters.test.ts`
- [x] T031 [P] Fix unsafe arguments in `test/integration/test_history_viewing.test.ts`
- [x] T032 [P] Fix unused variables in `test/integration/test_reporters.test.ts`

## Phase 3.5: Example and Script Files (Lower Priority) ✅ COMPLETE

**Handle global variables, setTimeout, and Node.js environment**

- [x] T033 [P] Fix global variable usage in `examples/benchmarks/advanced-operations.bench.js`
- [x] T034 [P] Fix setTimeout undefined in `examples/benchmarks/async-operations.bench.js`
- [x] T035 [P] Fix extensive global/unsafe issues in `examples/benchmarks/performance-tips.bench.js`
- [x] T036 [P] Fix unsafe operations and global access in `examples/scripts/check-performance.js`

## Phase 3.6: Validation and Testing

**Ensure all fixes maintain functionality and achieve zero errors**

- [ ] T037 Run complete ESLint check with `npx eslint .` to verify zero errors
- [ ] T038 Execute full test suite with `npm test` to ensure no regressions
- [ ] T039 [P] Verify TypeScript compilation with `npx tsc --noEmit`
- [ ] T040 [P] Test example benchmarks still execute correctly
- [ ] T041 [P] Update documentation with any new type patterns introduced

## Dependencies

- Setup (T001-T003) before everything
- Configuration (T004-T006) before source fixes (T007-T025)
- Source fixes (T007-T025) before test fixes (T026-T032)
- All fixes before validation (T037-T041)
- T037 (ESLint check) must pass for success

## Parallel Execution Examples

### Phase 3.3 - Core Source Files (can run simultaneously)

```bash
# Launch T007-T025 together as they work on different files:
Task: "Fix 28 unsafe operations in src/cli/commands/history.ts"
Task: "Fix 1 unsafe argument in src/cli/commands/init.ts"
Task: "Enhance type definitions in src/types/index.ts"
Task: "Fix ESLint errors in src/config/manager.ts"
# ... etc for all src/ files
```

### Phase 3.4 - Test Files (can run simultaneously)

```bash
# Launch T026-T032 together as they work on different test files:
Task: "Fix unsafe calls in test/contract/test_benchmark_engine.test.ts"
Task: "Fix unsafe calls in test/contract/test_configuration_manager.test.ts"
Task: "Fix unsafe calls in test/contract/test_history_storage.test.ts"
# ... etc for all test files
```

### Phase 3.5 - Example Files (can run simultaneously)

```bash
# Launch T033-T036 together as they work on different example files:
Task: "Fix global variables in examples/benchmarks/advanced-operations.bench.js"
Task: "Fix setTimeout in examples/benchmarks/async-operations.bench.js"
# ... etc for all example files
```

## Validation Requirements Per Task

### Source File Tasks (T007-T025)

- Run `npx eslint <file>` to verify error count reduction
- Ensure TypeScript compilation still succeeds
- Run related tests to verify functionality preserved
- Replace `any` types with proper TypeScript types
- Convert function declarations to arrow functions where needed

### Test File Tasks (T026-T032)

- Maintain test assertion integrity
- Fix unsafe operations without changing test logic
- Ensure tests still pass after fixes
- Use `// @ts-expect-error` only for testing invalid arguments

### Example File Tasks (T033-T036)

- Add proper Node.js global variable typing
- Ensure benchmark functionality preserved
- Test manual execution of benchmarks
- Add appropriate ESLint environment configuration

### Configuration Tasks (T004-T006)

- Verify ESLint and TypeScript compatibility
- Ensure all files are properly included in linting scope
- Test configuration with `npx eslint . --dry-run`

## Success Criteria

- `npx eslint .` returns exit code 0 (zero errors)
- All existing tests continue to pass (`npm test`)
- TypeScript compilation succeeds (`npx tsc --noEmit`)
- No functional changes to runtime behavior
- Example benchmarks execute correctly
- Zero tolerance for new ESLint errors

## Notes

- [P] tasks work on different files and can run in parallel
- Each task must include validation step to verify error reduction
- Use proper TypeScript types, avoid `any` except in dire circumstances
- `// @ts-ignore` is forbidden by ESLint rules
- Convert function declarations to arrow functions for func-style compliance
- Maintain existing functionality throughout all fixes
- Commit after each successful task completion

## Error Categories to Address

1. **TypeScript Unsafe Operations**: 134+ violations across multiple files
2. **Global Variable Access**: Node.js globals in benchmark files
3. **Function Style**: Convert declarations to arrow functions
4. **Configuration Issues**: TypeScript parsing errors
5. **Unused Variables**: Must be used or prefixed with underscore
