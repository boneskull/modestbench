# Data Model: Fix ESLint Errors

## Overview

This feature focuses on code quality improvement rather than data modeling. However, there are some important entities related to the ESLint error fixing process.

## Entities

### ESLint Error

**Purpose**: Represents a single linting violation that needs to be fixed
**Fields**:

- `ruleId`: string - The ESLint rule that was violated (e.g., "@typescript-eslint/no-unsafe-argument")
- `severity`: number - Error severity level (1=warning, 2=error)
- `message`: string - Human-readable description of the violation
- `filePath`: string - Absolute path to the file containing the error
- `line`: number - Line number where the error occurs
- `column`: number - Column number where the error occurs
- `nodeType`: string - AST node type where error occurs
- `messageId`: string - Identifier for the specific error message
- `fixable`: boolean - Whether ESLint can auto-fix this error

**Validation Rules**:

- filePath must be an existing file in the project
- line and column must be positive integers
- severity must be 1 or 2
- ruleId must be a valid ESLint rule identifier

### File Fix Status

**Purpose**: Tracks the status of ESLint fixes for each file
**Fields**:

- `filePath`: string - Absolute path to the file
- `errorCount`: number - Total number of errors in the file
- `warningCount`: number - Total number of warnings in the file
- `fixedCount`: number - Number of errors that have been fixed
- `status`: enum - 'pending' | 'in-progress' | 'completed' | 'failed'
- `lastModified`: Date - When the file was last modified
- `testsPassing`: boolean - Whether tests pass after fixes

**Validation Rules**:

- errorCount and warningCount must be non-negative
- fixedCount cannot exceed errorCount
- status must be one of the defined enum values

### Type Definition

**Purpose**: Represents proper TypeScript type information to replace `any` usage
**Fields**:

- `originalType`: string - The original type (usually 'any')
- `replacementType`: string - The proper TypeScript type
- `importRequired`: string | null - Import statement needed for the type
- `confidence`: enum - 'high' | 'medium' | 'low' - Confidence in type correctness
- `context`: string - Description of where this type is used

**Validation Rules**:

- replacementType must be valid TypeScript syntax
- confidence must be one of the defined enum values
- importRequired must be valid import syntax if provided

## Relationships

### ESLint Error → File Fix Status

- **Type**: Many-to-One
- **Description**: Multiple errors can exist in a single file
- **Constraints**: All errors for a file must be resolved before file status becomes 'completed'

### Type Definition → ESLint Error

- **Type**: One-to-Many
- **Description**: A single type definition can resolve multiple unsafe type errors
- **Constraints**: Type definitions should be reusable across similar contexts

## State Transitions

### File Fix Status Lifecycle

```
pending → in-progress → completed
    ↓         ↓            ↓
  failed ← failed ←   failed
```

**Transitions**:

- `pending → in-progress`: When developer starts fixing errors in the file
- `in-progress → completed`: When all errors are fixed and tests pass
- `in-progress → failed`: When fixes break functionality or introduce new errors
- `completed → failed`: When regression testing reveals issues
- `failed → in-progress`: When developer resumes fixing the file

## Constraints

### Global Constraints

- Total error count across all files must reach zero for successful completion
- No file can have status 'completed' with errorCount > 0
- All tests must continue passing throughout the fix process
- No functional changes are allowed, only type safety improvements

### File-Level Constraints

- Files with TypeScript errors must maintain TypeScript compilation success
- Example benchmark files must continue to execute correctly
- Test files must maintain their testing assertions

## Validation

### Success Criteria

- `npx eslint .` returns exit code 0
- All existing tests continue to pass
- No runtime behavior changes
- All files have status 'completed'

### Quality Gates

- Each file fix must be validated independently
- Type annotations must be accurate, not just syntactically correct
- Global variable usage must be properly typed for the intended environment
