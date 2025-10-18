# Quickstart: Fix ESLint Errors

## Overview

This guide provides step-by-step instructions for fixing all ESLint errors in the ModestBench codebase to comply with stricter linting rules.

## Prerequisites

- Node.js and npm installed
- ESLint and TypeScript configured
- Existing test suite passing
- Git working directory clean

## Quick Start

### 1. Verify Current State

```bash
# Check current ESLint errors
npx eslint . --format=json > eslint-errors.json

# Count total errors
npx eslint . | grep "✖.*problem"

# Run tests to establish baseline
npm test
```

**Expected Output**: Should show 134+ ESLint errors across multiple files

### 2. Install Missing Type Packages

```bash
# Install common type packages that may be needed
npm install --save-dev @types/node

# Check if other @types packages are needed based on dependencies
npm list | grep -v "@types"
```

### 3. Fix Files Systematically

#### Start with TypeScript Configuration Issue

```bash
# Fix .wallaby.js configuration issue first
# Either update tsconfig to include it or add ESLint ignore
```

#### Fix Source Files (Highest Priority)

```bash
# Focus on src/ directory first as these are core files
npx eslint src/ --fix-dry-run
```

#### Fix Test Files

```bash
# Then address test files
npx eslint test/ --fix-dry-run
```

#### Fix Example Files

```bash
# Finally handle example/benchmark files
npx eslint examples/ --fix-dry-run
```

### 4. Common Fix Patterns

#### Replace `any` Types

```typescript
// Before
function process(data: any): any {
  return data.results;
}

// After
function process(data: { results: BenchmarkResult[] }): BenchmarkResult[] {
  return data.results;
}
```

#### Fix Global Variables in Benchmarks

```javascript
// Before - causes no-undef error
export default {
  benchmarks: {
    'test': { fn: () => global.testData }
  }
};

// After - properly typed
/// <reference types="node" />
export default {
  benchmarks: {
    'test': { fn: () => (global as any).testData }
  }
};
```

#### Convert to Arrow Functions

```javascript
// Before - func-style violation
function calculate() {
  return 42;
}

// After - arrow function
const calculate = () => {
  return 42;
};
```

#### Fix Unsafe Operations

```typescript
// Before - unsafe member access
function getName(obj: any) {
  return obj.name;
}

// After - proper typing
function getName(obj: { name: string }) {
  return obj.name;
}
```

### 5. Validation After Each File

```bash
# Check specific file
npx eslint src/cli/commands/history.ts

# Run related tests
npm test -- --grep "history"

# Check TypeScript compilation
npx tsc --noEmit
```

### 6. Final Validation

```bash
# Verify all errors are fixed
npx eslint .
echo $?  # Should output: 0

# Run complete test suite
npm test

# Check TypeScript compilation
npx tsc --noEmit

# Test example benchmarks still work
cd examples && npm run benchmarks
```

## File-by-File Checklist

### High Priority Files (Core Source)

- [ ] `src/cli/commands/history.ts` - 28 unsafe operations
- [ ] `src/cli/commands/init.ts` - 1 unsafe argument
- [ ] `src/types/index.ts` - Type definitions
- [ ] Other `src/` files as needed

### Medium Priority Files (Tests)

- [ ] `test/contract/test_benchmark_engine.test.ts` - Unsafe calls
- [ ] `test/contract/test_configuration_manager.test.ts` - Unsafe calls
- [ ] `test/contract/test_history_storage.test.ts` - Unsafe calls
- [ ] `test/contract/test_progress_manager.test.ts` - Unsafe calls
- [ ] `test/contract/test_reporters.test.ts` - Unsafe calls, unused vars
- [ ] `test/integration/test_history_viewing.test.ts` - Unsafe arguments
- [ ] `test/integration/test_reporters.test.ts` - Unused variables

### Lower Priority Files (Examples)

- [ ] `examples/benchmarks/advanced-operations.bench.js` - Global variables
- [ ] `examples/benchmarks/async-operations.bench.js` - setTimeout undefined
- [ ] `examples/benchmarks/performance-tips.bench.js` - Many global/unsafe issues
- [ ] `examples/scripts/check-performance.js` - Unsafe operations, global access

### Configuration Files

- [ ] `.wallaby.js` - TypeScript config parsing error

## Success Criteria

### ✅ Primary Success

- `npx eslint .` returns exit code 0
- No ESLint errors or warnings
- All existing tests pass
- TypeScript compilation succeeds

### ✅ Quality Gates

- No functional changes to behavior
- IDE support and autocompletion improved
- Type safety enhanced throughout codebase
- Example benchmarks continue to work correctly

### ✅ Documentation

- All type changes documented
- Complex type decisions explained
- Migration patterns recorded for future reference

## Troubleshooting

### Common Issues

**TypeScript Compilation Errors**

```bash
# Check specific compilation issues
npx tsc --noEmit --listFiles
```

**Test Failures After Type Changes**

```bash
# Run tests with verbose output
npm test -- --verbose

# Check if mocks need type updates
grep -r "any" test/ | grep -v node_modules
```

**Performance Regression in Benchmarks**

```bash
# Test benchmark functionality manually
cd examples
node benchmarks/array-operations.bench.js
```

**Remaining ESLint Errors**

```bash
# Get detailed error information
npx eslint . --format=json | jq '.[] | select(.errorCount > 0)'
```

## Rollback Plan

If issues arise:

1. Revert last change: `git checkout -- <file>`
2. Run tests to verify functionality restored
3. Re-examine the problematic fix approach
4. Try alternative typing strategy

## Next Steps After Completion

1. Update CI configuration to run ESLint checks
2. Add pre-commit hooks for ESLint validation
3. Consider enabling additional strict ESLint rules
4. Document new type patterns for future development
