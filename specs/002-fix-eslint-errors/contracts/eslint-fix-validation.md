# ESLint Fix Validation Contract

## Overview

Contract for validating that ESLint error fixes maintain code quality and functionality.

## Operations

### validateFileFixing

**Purpose**: Ensure a single file's ESLint errors are properly fixed
**Input**:

```typescript
interface FileFixRequest {
  filePath: string; // Absolute path to file being fixed
  beforeErrorCount: number; // Number of errors before fixing
  afterErrorCount: number; // Number of errors after fixing
  testsPassed: boolean; // Whether tests pass after fixing
}
```

**Output**:

```typescript
interface FileFixResponse {
  status: 'success' | 'failed';
  remainingErrors: ESLintError[];
  functionalityPreserved: boolean;
  message: string;
}
```

**Contract**:

- MUST reduce error count (afterErrorCount < beforeErrorCount)
- MUST NOT break existing functionality (testsPassed === true)
- MUST NOT introduce new ESLint errors
- SHOULD preserve original code behavior

### validateTypeReplacement

**Purpose**: Ensure `any` type replacements are accurate and safe
**Input**:

```typescript
interface TypeReplacementRequest {
  filePath: string;
  originalType: 'any';
  replacementType: string;
  context: string; // Function/variable context
  requiresImport?: string; // Import statement if needed
}
```

**Output**:

```typescript
interface TypeReplacementResponse {
  valid: boolean;
  typeCompiles: boolean;
  runtimeSafe: boolean;
  suggestions?: string[];
  warnings?: string[];
}
```

**Contract**:

- MUST maintain TypeScript compilation
- MUST NOT change runtime behavior
- SHOULD use most specific type possible
- SHOULD reuse existing project types when available

### validateGlobalVariableTyping

**Purpose**: Ensure global variables in benchmark files are properly typed
**Input**:

```typescript
interface GlobalVariableRequest {
  filePath: string;
  variableName: string; // e.g., 'global', 'setTimeout', 'console'
  context: 'node' | 'browser' | 'test';
  usage: string; // How the variable is used
}
```

**Output**:

```typescript
interface GlobalVariableResponse {
  typeDeclaration: string; // Proper type declaration
  environmentConfig?: string; // ESLint environment setting
  importStatement?: string; // If import is needed
  valid: boolean;
}
```

**Contract**:

- MUST resolve `no-undef` errors
- MUST provide accurate types for the environment
- SHOULD use standard Node.js/browser type definitions
- MUST NOT change functional behavior

### validateFunctionStyleConversion

**Purpose**: Ensure function declaration to arrow function conversion is safe
**Input**:

```typescript
interface FunctionConversionRequest {
  filePath: string;
  originalFunction: string; // Function declaration code
  convertedFunction: string; // Arrow function code
  context: string; // Where function is used
}
```

**Output**:

```typescript
interface FunctionConversionResponse {
  safe: boolean;
  behaviorPreserved: boolean;
  hoistingIssues: boolean; // Whether conversion affects hoisting
  thisBindingIssues: boolean; // Whether 'this' binding changes
  warnings?: string[];
}
```

**Contract**:

- MUST preserve function behavior
- MUST NOT break hoisting dependencies
- MUST handle `this` binding correctly
- SHOULD improve code consistency

## Error Conditions

### FileFixing Errors

- `FILE_NOT_FOUND`: File path does not exist
- `NO_IMPROVEMENT`: Error count did not decrease
- `TESTS_FAILED`: Existing tests no longer pass
- `NEW_ERRORS`: New ESLint errors introduced

### Type Replacement Errors

- `COMPILATION_FAILED`: TypeScript compilation broken
- `INVALID_TYPE`: Replacement type is not valid TypeScript
- `RUNTIME_CHANGE`: Type change affects runtime behavior
- `IMPORT_MISSING`: Required import not provided

### Global Variable Errors

- `UNKNOWN_GLOBAL`: Variable not recognized for environment
- `WRONG_ENVIRONMENT`: Global not available in specified context
- `TYPE_MISMATCH`: Usage doesn't match provided type

### Function Conversion Errors

- `HOISTING_BROKEN`: Conversion breaks function hoisting
- `THIS_BINDING_CHANGED`: Arrow function changes `this` context
- `SCOPE_ISSUE`: Function scope incorrectly modified

## Success Criteria

### Overall Project Success

- All files return `validateFileFixing` with status 'success'
- `npx eslint .` returns exit code 0
- Full test suite passes
- No functional regressions detected

### File-Level Success

- Zero ESLint errors remaining in file
- All tests related to file continue passing
- TypeScript compilation succeeds
- Runtime behavior unchanged

### Type Safety Success

- No `any` types remain except where absolutely necessary
- All type replacements compile correctly
- IDE support and autocompletion improved
- Type errors caught at compile time
