# Research: Fix ESLint Errors

## Overview

Research findings for resolving ESLint errors in the ModestBench codebase after implementing stricter linting rules.

## Error Categories Analysis

### TypeScript Unsafe Operations

**Problem**: 134+ violations of `@typescript-eslint/no-unsafe-*` rules including:

- `no-unsafe-argument`: Passing `any` typed values to typed parameters
- `no-unsafe-assignment`: Assigning `any` values to typed variables
- `no-unsafe-call`: Calling functions on `any` typed values
- `no-unsafe-member-access`: Accessing properties on `any` typed values
- `no-unsafe-return`: Returning `any` values from typed functions

**Decision**: Replace `any` types with proper TypeScript types
**Rationale**:

- Maintains type safety guarantees
- Improves IDE support and developer experience
- Prevents runtime errors through compile-time checking
- Aligns with TypeScript best practices

**Alternatives considered**:

- Using `// @ts-ignore` comments - rejected due to ESLint rules forbidding them
- Using `// @ts-expect-error` - appropriate only for test code testing invalid arguments
- Disabling rules - rejected as it defeats the purpose of stricter linting

### Global Variables in Benchmark Files

**Problem**: `no-undef` errors for `global`, `setTimeout`, `console`, `process` in example benchmarks
**Decision**: Add proper type declarations and Node.js environment configuration
**Rationale**:

- Benchmark files need access to Node.js globals for performance testing
- Proper typing maintains ESLint compliance while preserving functionality
- Examples should demonstrate best practices

**Alternatives considered**:

- Using `/* global */` comments - acceptable but less maintainable
- Ignoring benchmark files - rejected as examples should be clean

### Function Style Violations

**Problem**: `func-style` rule violations requiring arrow functions
**Decision**: Convert function declarations to arrow functions where required
**Rationale**:

- Consistent code style across codebase
- Arrow functions have lexical `this` binding which can prevent bugs
- Aligns with modern JavaScript/TypeScript conventions

**Alternatives considered**:

- Disabling func-style rule - rejected as consistency is important
- Mixed usage - rejected for consistency

### TypeScript Configuration Issues

**Problem**: `.wallaby.js` not included in TypeScript configuration
**Decision**: Update TypeScript configuration or add ESLint ignore for Wallaby config
**Rationale**:

- Wallaby configuration files are development tools, not runtime code
- ESLint should not block development tooling setup

## Type Resolution Strategy

### Missing Type Packages

**Research**: Many dependencies lack built-in TypeScript types
**Decision**: Install corresponding `@types/*` packages from DefinitelyTyped
**Rationale**:

- DefinitelyTyped provides community-maintained type definitions
- Widely adopted standard in TypeScript ecosystem
- Maintains type safety without modifying dependencies

**Packages to investigate**:

- Node.js built-ins (already typed in modern Node)
- Third-party dependencies used in the project
- Test framework types

### Custom Type Definitions

**Decision**: Create custom type definitions for project-specific interfaces
**Rationale**:

- Some interfaces are specific to ModestBench domain
- Custom types provide better documentation and IDE support
- Enables gradual typing migration

## Implementation Approach

### File-by-File Strategy

**Decision**: Address errors systematically by file, creating tasks for each file with violations
**Rationale**:

- Enables parallel work on different files
- Easier to track progress and test changes
- Reduces risk of introducing new errors

### Testing Strategy

**Decision**: Run existing test suite after each file fix to ensure no functionality breaks
**Rationale**:

- Validates that type annotations don't change runtime behavior
- Catches any unintended side effects
- Maintains confidence in refactoring

### Validation Criteria

**Decision**: Success is defined as `npx eslint .` returning exit code 0
**Rationale**:

- Objective, measurable success criteria
- Ensures all violations are addressed
- Enables automated validation in CI

## Risk Assessment

### Low Risk Changes

- Adding type annotations to existing parameters
- Converting function declarations to arrow functions
- Adding missing import statements

### Medium Risk Changes

- Replacing `any` types with specific types (potential for incorrect assumptions)
- Modifying global variable handling in examples

### Mitigation Strategies

- Run full test suite after each change
- Review type annotations for correctness
- Test example benchmarks manually to ensure they still work
- Use gradual typing approach (start with loose types, tighten incrementally)

## Conclusion

The ESLint error fixes are primarily type safety improvements that will enhance code quality without changing functionality. The systematic, file-by-file approach with comprehensive testing should ensure safe completion of all fixes.
