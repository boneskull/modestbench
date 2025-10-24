---
title: Error Reference
description: Complete reference for ModestBench error codes and error handling
---

## Overview

ModestBench uses a comprehensive custom error system that provides clear, actionable error messages with unique error codes and documentation links. All ModestBench errors:

- Have a unique `ERR_MB_*` error code
- Include a link to this documentation page
- Support error cause chaining for debugging
- Provide structured information for programmatic handling

## Error Format

When ModestBench encounters an error, it displays:

```text
ErrorClassName [ERR_MB_ERROR_CODE]: Human-readable error message
See: https://boneskull.github.io/modestbench/reference/errors#errorclassname
```

## Error Categories

- [Configuration Errors](#config-errors) - Issues with configuration files
- [File Errors](#file-errors) - Problems with benchmark file access
- [Validation Errors](#validation-errors) - Benchmark structure validation issues
- [Execution Errors](#execution-errors) - Runtime benchmark execution failures
- [Storage Errors](#storage-errors) - History storage and database issues
- [Reporter Errors](#reporter-errors) - Output reporter problems
- [CLI Errors](#cli-errors) - Command-line interface errors

---

## Config Errors

### ConfigValidationError

**Code:** `ERR_MB_CONFIG_VALIDATION_FAILED`

**Description:** Configuration file failed validation against the schema.

**Common Causes:**

- Invalid option types (e.g., string instead of number)
- Unrecognized configuration keys
- Missing required fields
- Values outside allowed ranges

**How to Fix:**

- Check the [configuration guide](/guides/configuration) for valid options
- Use the `init` command to generate a valid config file
- Validate JSON/YAML syntax
- Review error details for specific validation failures

**Example:**

```bash
$ modestbench run --config invalid.json
ConfigValidationError [ERR_MB_CONFIG_VALIDATION_FAILED]: iterations must be a
  positive number
See: https://boneskull.github.io/modestbench/reference/errors#configvalidationerror
```

---

### ConfigNotFoundError

**Code:** `ERR_MB_CONFIG_NOT_FOUND`

**Description:** The specified configuration file could not be found.

**Common Causes:**

- Incorrect file path provided
- Config file doesn't exist at expected location
- Typo in filename

**How to Fix:**

- Verify the file path is correct
- Use absolute paths or paths relative to current directory
- Run `modestbench init` to create a config file
- Check if file is in one of the default locations (see configuration guide)

**Example:**

```bash
$ modestbench run --config /path/to/missing.json
ConfigNotFoundError [ERR_MB_CONFIG_NOT_FOUND]: Configuration file not found:
  /path/to/missing.json
See: https://boneskull.github.io/modestbench/reference/errors#confignotfounderror
```

---

### ConfigLoadError

**Code:** `ERR_MB_CONFIG_LOAD_FAILED`

**Description:** Failed to load or parse the configuration file.

**Common Causes:**

- Invalid JSON or YAML syntax
- File permission issues
- Corrupted file
- TypeScript/JavaScript config has syntax errors

**How to Fix:**

- Validate JSON/YAML syntax using a linter
- Check file permissions
- For JS/TS configs, ensure they export a valid config object
- Review the error's cause chain for underlying issues

**Example:**

```bash
$ modestbench run
ConfigLoadError [ERR_MB_CONFIG_LOAD_FAILED]: Failed to parse
  modestbench.config.json: Unexpected token } in JSON
See: https://boneskull.github.io/modestbench/reference/errors#configloaderror
```

---

### UnsupportedConfigFormatError

**Code:** `ERR_MB_CONFIG_UNSUPPORTED_FORMAT`

**Description:** Configuration file format is not supported.

**Common Causes:**

- Using unsupported file extension
- Attempting to use a format that's not installed

**How to Fix:**

- Use supported formats: `.json`, `.yaml`, `.yml`, `.js`, `.mjs`, `.ts`, `.mts`
- Ensure file extension matches file contents
- For TypeScript configs, ensure `tsx` is available

**Example:**

```bash
$ modestbench run --config config.toml
UnsupportedConfigFormatError [ERR_MB_CONFIG_UNSUPPORTED_FORMAT]:
  Configuration format .toml is not supported
See: https://boneskull.github.io/modestbench/reference/errors#unsupportedconfigformaterror
```

---

## File Errors

### FileNotFoundError

**Code:** `ERR_MB_FILE_NOT_FOUND`

**Description:** A benchmark file could not be found.

**Common Causes:**

- Incorrect file path
- File was moved or deleted
- Glob pattern doesn't match any files

**How to Fix:**

- Verify the file exists at the specified path
- Check glob patterns for typos
- Use `--verbose` to see file discovery process
- Ensure file extensions match expected patterns

**Example:**

```bash
$ modestbench run benchmarks/missing.bench.js
FileNotFoundError [ERR_MB_FILE_NOT_FOUND]: Benchmark file not found:
  benchmarks/missing.bench.js
See: https://boneskull.github.io/modestbench/reference/errors#filenotfounderror
```

---

### FileDiscoveryError

**Code:** `ERR_MB_FILE_DISCOVERY_FAILED`

**Description:** Failed to discover benchmark files matching the provided patterns.

**Common Causes:**

- No files match the glob pattern
- Invalid glob pattern syntax
- Directory doesn't exist
- Permission issues reading directory

**How to Fix:**

- Verify glob patterns are correct
- Check that benchmark files exist
- Use more specific patterns
- Ensure proper file naming (`.bench.{js,ts,mjs,cjs}`)

**Example:**

```bash
$ modestbench run "nonexistent/**/*.bench.js"
FileDiscoveryError [ERR_MB_FILE_DISCOVERY_FAILED]: No benchmark files found
  matching pattern: nonexistent/**/*.bench.js
See: https://boneskull.github.io/modestbench/reference/errors#filediscoveryerror
```

---

### FileLoadError

**Code:** `ERR_MB_FILE_LOAD_FAILED`

**Description:** Failed to load a benchmark file.

**Common Causes:**

- Syntax errors in benchmark file
- Import/require errors
- Missing dependencies
- Module resolution issues

**How to Fix:**

- Check the benchmark file for syntax errors
- Ensure all imports are valid
- Install missing dependencies
- Verify module paths are correct
- Review the error's cause chain for details

**Example:**

```bash
$ modestbench run
FileLoadError [ERR_MB_FILE_LOAD_FAILED]: Failed to load
  benchmarks/example.bench.js: Cannot find module 'missing-package'
See: https://boneskull.github.io/modestbench/reference/errors#fileloaderror
```

---

### UnsupportedFileExtensionError

**Code:** `ERR_MB_FILE_UNSUPPORTED_EXTENSION`

**Description:** Benchmark file has an unsupported file extension.

**Common Causes:**

- Using unsupported file type
- Typo in file extension
- Attempting to run non-benchmark files

**How to Fix:**

- Use supported extensions: `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`
- Ensure files match the pattern `*.bench.{js,ts,mjs,cjs,etc}`
- For TypeScript, ensure `tsx` is available for execution

**Example:**

```bash
$ modestbench run benchmark.txt
UnsupportedFileExtensionError [ERR_MB_FILE_UNSUPPORTED_EXTENSION]: File
  extension .txt is not supported for benchmarks
See: https://boneskull.github.io/modestbench/reference/errors#unsupportedfileextensionerror
```

---

### FilePermissionError

**Code:** `ERR_MB_FILE_PERMISSION_DENIED`

**Description:** Permission denied when accessing a file.

**Common Causes:**

- Insufficient file permissions
- File owned by different user
- Directory permissions prevent access

**How to Fix:**

- Check file permissions with `ls -l`
- Ensure read permissions are granted
- Run with appropriate user permissions
- Check parent directory permissions

**Example:**

```bash
$ modestbench run protected.bench.js
FilePermissionError [ERR_MB_FILE_PERMISSION_DENIED]: Permission denied:
  protected.bench.js
See: https://boneskull.github.io/modestbench/reference/errors#filepermissionerror
```

---

## Validation Errors

### SchemaValidationError

**Code:** `ERR_MB_VALIDATION_SCHEMA_FAILED`

**Description:** Configuration or benchmark structure failed schema validation.

**Common Causes:**

- Invalid benchmark definition structure
- Missing required fields in suite/task definitions
- Type mismatches in benchmark options

**How to Fix:**

- Review the [getting started guide](/getting-started) for proper structure
- Ensure `describe()` and `bench()` are used correctly
- Provide required fields (name, function)
- Check that option types match expected values

**Example:**

```javascript
// ❌ Invalid - missing task function
describe('My Suite', () => {
  bench('Task without function'); // SchemaValidationError
});

// ✅ Valid
describe('My Suite', () => {
  bench('Task with function', () => {
    // benchmark code
  });
});
```

---

### StructureValidationError

**Code:** `ERR_MB_VALIDATION_STRUCTURE_INVALID`

**Description:** Benchmark file structure is invalid or malformed.

**Common Causes:**

- Missing required exports
- Invalid benchmark hierarchy
- Incorrect use of `describe()` and `bench()`
- Empty benchmark files

**How to Fix:**

- Ensure file exports benchmark definitions
- Follow proper nesting: files → suites → tasks
- Don't nest `describe()` blocks
- Include at least one benchmark task

**Example:**

```javascript
// ❌ Invalid - nested describe blocks
describe('Outer', () => {
  describe('Inner', () => { // StructureValidationError
    bench('task', () => {});
  });
});

// ✅ Valid - flat suite structure
describe('Suite 1', () => {
  bench('task 1', () => {});
});

describe('Suite 2', () => {
  bench('task 2', () => {});
});
```

---

### TypeValidationError

**Code:** `ERR_MB_VALIDATION_TYPE_FAILED`

**Description:** A value has an incorrect type.

**Common Causes:**

- Passing wrong type to configuration option
- Invalid benchmark function signature
- Incorrect option types in `bench()` or `describe()`

**How to Fix:**

- Check type requirements in documentation
- Ensure benchmark functions are synchronous or return promises
- Verify option values match expected types
- Use TypeScript for type checking during development

**Example:**

```javascript
// ❌ Invalid - iterations must be number
bench('task', () => {}, { iterations: '100' }); // TypeValidationError

// ✅ Valid
bench('task', () => {}, { iterations: 100 });
```

---

## Execution Errors

### BenchmarkExecutionError

**Code:** `ERR_MB_EXECUTION_BENCHMARK_FAILED`

**Description:** A benchmark failed during execution.

**Common Causes:**

- Unhandled exception in benchmark code
- Async errors not properly caught
- Timing or resource issues
- Test/assertion failures in benchmark

**How to Fix:**

- Add error handling to benchmark code
- Ensure async operations are properly awaited
- Check for resource leaks
- Review benchmark logic for bugs
- Use `--bail` to stop on first failure for debugging

**Example:**

```javascript
// ❌ Throws during execution
bench('failing task', () => {
  throw new Error('Something went wrong'); // BenchmarkExecutionError
});

// ✅ Better - handle errors appropriately
bench('safe task', () => {
  try {
    riskyOperation();
  } catch (err) {
    // Handle expected errors
  }
});
```

---

### TaskExecutionError

**Code:** `ERR_MB_EXECUTION_TASK_FAILED`

**Description:** A specific benchmark task failed to execute.

**Common Causes:**

- Runtime error in task function
- Uncaught promise rejection
- Invalid return value
- Resource exhaustion

**How to Fix:**

- Debug the specific task function
- Check for proper error handling
- Ensure promises are resolved/rejected correctly
- Verify resource availability (memory, file handles)

---

### SetupError

**Code:** `ERR_MB_EXECUTION_SETUP_FAILED`

**Description:** A setup function failed during execution.

**Common Causes:**

- Error in `beforeAll` or `beforeEach` function
- Failed initialization
- Resource not available
- Async setup not properly awaited

**How to Fix:**

- Add error handling to setup functions
- Ensure resources are available
- Check async operations are awaited
- Verify setup code runs successfully in isolation

**Example:**

```javascript
describe('suite', {
  beforeAll: async () => {
    await database.connect(); // SetupError if fails
  }
}, () => {
  bench('task', () => {});
});
```

---

### TeardownError

**Code:** `ERR_MB_EXECUTION_TEARDOWN_FAILED`

**Description:** A teardown function failed during cleanup.

**Common Causes:**

- Error in `afterAll` or `afterEach` function
- Failed cleanup operations
- Resource already closed
- Async teardown not properly awaited

**How to Fix:**

- Add error handling to teardown functions
- Check resources exist before cleanup
- Ensure idempotent cleanup
- Verify async operations are awaited

**Example:**

```javascript
describe('suite', {
  afterAll: async () => {
    await database.disconnect(); // TeardownError if fails
  }
}, () => {
  bench('task', () => {});
});
```

---

### TimeoutError

**Code:** `ERR_MB_EXECUTION_TIMEOUT`

**Description:** Benchmark execution exceeded the timeout limit.

**Common Causes:**

- Benchmark takes too long to run
- Infinite loop in benchmark code
- Blocking operations
- Resource contention

**How to Fix:**

- Increase timeout with `--timeout` flag
- Optimize benchmark code
- Check for infinite loops
- Avoid blocking I/O operations
- Use async operations appropriately

**Example:**

```bash
# Increase timeout to 60 seconds
$ modestbench run --timeout 60000
```

---

### OperationTooFastError

**Code:** `ERR_MB_EXECUTION_TOO_FAST`

**Description:** The benchmarked operation completes too quickly to measure accurately.

**Common Causes:**

- Operation takes less than 1 nanosecond
- Empty benchmark function
- Compiler optimizing away the code
- Function not doing actual work

**How to Fix:**

- Ensure benchmark does meaningful work
- Avoid trivial operations
- Use return values to prevent dead code elimination
- Batch multiple operations if needed
- Switch to accurate engine with `--engine accurate`

**Example:**

```javascript
// ❌ Too fast - might be optimized away
bench('empty', () => {}); // OperationTooFastError

// ✅ Does actual work
let result;
bench('meaningful', () => {
  result = complexCalculation();
});
```

---

## Storage Errors

### StorageError

**Code:** `ERR_MB_STORAGE_FAILED`

**Description:** General storage operation failure.

**Common Causes:**

- Database access error
- File system issues
- Permission problems
- Disk I/O errors

**How to Fix:**

- Check file system permissions
- Ensure sufficient disk space
- Verify storage directory exists
- Check for file system errors

---

### StorageCorruptionError

**Code:** `ERR_MB_STORAGE_CORRUPTION`

**Description:** Stored benchmark history data is corrupted.

**Common Causes:**

- Incomplete write operations
- Invalid JSON in storage files
- File system corruption
- Manual file editing introduced errors

**How to Fix:**

- Clean history with `modestbench history clean`
- Delete corrupted storage files manually
- Restore from backup if available
- Re-run benchmarks to rebuild history

**Example:**

```bash
# Clean all history
$ modestbench history clean --max-runs 0 --confirm
```

---

### StorageSpaceError

**Code:** `ERR_MB_STORAGE_INSUFFICIENT_SPACE`

**Description:** Insufficient disk space for storage operations.

**Common Causes:**

- Disk full
- Quota exceeded
- Too many stored benchmark runs

**How to Fix:**

- Free up disk space
- Clean old benchmark history
- Use `--max-runs` to limit stored runs
- Configure storage cleanup policies

**Example:**

```bash
# Keep only latest 50 runs
$ modestbench history clean --max-runs 50 --confirm
```

---

### StorageIndexError

**Code:** `ERR_MB_STORAGE_INDEX_CORRUPTION`

**Description:** The storage index is corrupted or invalid.

**Common Causes:**

- Incomplete write operations
- Concurrent access issues
- Manual index file editing

**How to Fix:**

- Rebuild index by cleaning and re-running benchmarks
- Delete index file (will be rebuilt automatically)
- Avoid manual editing of storage files

---

### UnsupportedExportFormatError

**Code:** `ERR_MB_STORAGE_EXPORT_UNSUPPORTED`

**Description:** Attempted to export history in an unsupported format.

**Common Causes:**

- Invalid format specified in export command
- Typo in format name

**How to Fix:**

- Use supported export formats: `human`, `json`, `csv`
- Check command documentation for format options

**Example:**

```bash
# ❌ Invalid format
$ modestbench history export --format xml

# ✅ Valid format
$ modestbench history export --format json
```

---

## Reporter Errors

### ReporterAlreadyRegisteredError

**Code:** `ERR_MB_REPORTER_ALREADY_REGISTERED`

**Description:** Attempted to register a reporter with a name that's already in use.

**Common Causes:**

- Registering same reporter twice
- Name collision with built-in reporter
- Configuration error

**How to Fix:**

- Use unique reporter names
- Check existing reporters before registration
- Unregister old reporter before re-registering

**Example:**

```javascript
// ❌ Duplicate registration
engine.registerReporter('custom', new MyReporter());
engine.registerReporter('custom', new MyReporter()); // Error!

// ✅ Use unique names
engine.registerReporter('custom-1', new MyReporter());
engine.registerReporter('custom-2', new MyReporter());
```

---

### UnknownReporterError

**Code:** `ERR_MB_REPORTER_UNKNOWN`

**Description:** Requested reporter is not registered.

**Common Causes:**

- Typo in reporter name
- Reporter not registered
- Using non-existent reporter name

**How to Fix:**

- Check available reporters: `human`, `json`, `csv`, `simple`
- Verify reporter name spelling
- Register custom reporters before use

**Example:**

```bash
# ❌ Unknown reporter
$ modestbench run --reporters unknownreporter

# ✅ Valid reporter
$ modestbench run --reporters json,csv
```

---

### ReporterOutputError

**Code:** `ERR_MB_REPORTER_OUTPUT_FAILED`

**Description:** Reporter failed to write output.

**Common Causes:**

- File system permission errors
- Invalid output path
- Disk full
- Reporter implementation error

**How to Fix:**

- Check output directory permissions
- Ensure output directory exists
- Verify sufficient disk space
- Check reporter configuration

---

## CLI Errors

### InvalidArgumentError

**Code:** `ERR_MB_CLI_INVALID_ARGUMENT`

**Description:** An invalid command-line argument was provided.

**Common Causes:**

- Argument value outside valid range
- Incompatible option combination
- Required argument missing

**How to Fix:**

- Check command help: `modestbench <command> --help`
- Verify argument values are within valid ranges
- Review [CLI guide](/guides/cli) for usage

**Example:**

```bash
# ❌ Invalid iteration count
$ modestbench run --iterations -5

# ✅ Valid iteration count
$ modestbench run --iterations 1000
```

---

### InvalidDateFormatError

**Code:** `ERR_MB_CLI_INVALID_DATE_FORMAT`

**Description:** Date string could not be parsed.

**Common Causes:**

- Invalid date format
- Unrecognized relative date expression
- Typo in date string

**How to Fix:**

- Use ISO 8601 format: `2024-01-15`
- Use relative expressions: `1 week ago`, `2 days ago`
- Check date string for typos

**Example:**

```bash
# ❌ Invalid date
$ modestbench history list --since "bad date"

# ✅ Valid dates
$ modestbench history list --since "2024-01-15"
$ modestbench history list --since "1 week ago"
```

---

### UnknownError

**Code:** `ERR_MB_UNKNOWN`

**Description:** An unexpected error occurred that ModestBench doesn't specifically handle.

**Common Causes:**

- Third-party library errors
- Unexpected system errors
- Runtime environment issues
- Bugs in ModestBench or dependencies

**How to Fix:**

- Check the full error message and stack trace
- Enable debug mode: `DEBUG=* modestbench run`
- Report issue on GitHub with full error details
- Check for known issues in the issue tracker

**Example:**
When you see an `UnknownError`, it includes the original error:

```text
UnknownError [ERR_MB_UNKNOWN]: An unexpected error occurred: [original message]
See: https://boneskull.github.io/modestbench/reference/errors#unknownerror

Original error:
[full stack trace of the underlying error]
```

---

## Programmatic Error Handling

When using ModestBench programmatically, you can catch specific error types:

```typescript
import {
  ConfigLoadError,
  FileDiscoveryError,
  BenchmarkExecutionError,
  ModestBenchError
} from 'modestbench';

try {
  await engine.run(patterns);
} catch (error) {
  if (error instanceof ConfigLoadError) {
    // Handle configuration errors
  } else if (error instanceof FileDiscoveryError) {
    // Handle file discovery errors
  } else if (error instanceof BenchmarkExecutionError) {
    // Handle execution errors
  } else if (error instanceof ModestBenchError) {
    // Handle any other ModestBench error
    console.error(error.code); // ERR_MB_*
    console.error(error.getDocUrl()); // Link to this page
  } else {
    // Handle unexpected errors
    throw error;
  }
}
```

## Error Properties

All ModestBench errors provide:

- `name` - The error class name
- `code` - Unique error code (`ERR_MB_*`)
- `message` - Human-readable description
- `cause` - Original error (if wrapping another error)
- `stack` - Stack trace
- `getDocUrl()` - Method returning URL to this page
- `toString()` - Formatted error with code and documentation link

---

## Getting Help

If you encounter an error not covered here or need additional help:

1. Check the [guides](/guides/cli) for usage examples
2. Search [GitHub issues](https://github.com/boneskull/modestbench/issues)
3. Open a new issue with error details
4. Join the community discussions
