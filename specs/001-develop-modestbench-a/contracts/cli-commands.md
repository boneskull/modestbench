# CLI Command Contracts

## Commands Overview

### `modestbench run` - Execute Benchmarks

**Purpose**: Execute benchmark files and display results in real-time

**Signature**:

```bash
modestbench run [pattern] [options]
```

**Arguments**:

- `pattern` (optional): Glob pattern for benchmark files (default: `**/*.bench.{js,ts}`)

**Options**:

- `--config, -c <file>`: Path to configuration file
- `--reporters, -r <types>`: Comma-separated list of reporters (human,json,csv)
- `--output, -o <dir>`: Output directory for reports
- `--iterations, -i <num>`: Number of iterations per benchmark
- `--time, -t <ms>`: Time budget per benchmark in milliseconds
- `--warmup, -w`: Enable warmup runs
- `--concurrent`: Run suites in parallel
- `--bail`: Stop on first benchmark failure
- `--exclude <patterns>`: Exclude patterns (comma-separated)
- `--timeout <ms>`: Timeout per benchmark
- `--quiet, -q`: Minimal output
- `--verbose, -v`: Detailed output

**Exit Codes**:

- `0`: All benchmarks completed successfully
- `1`: Benchmark failures occurred
- `2`: Configuration or validation error
- `3`: File discovery error

**Output Formats**:

- **Human**: Colorful progress bars, real-time results, summary tables
- **JSON**: Machine-readable structured data
- **CSV**: Spreadsheet-compatible tabular data

---

### `modestbench history` - View Historical Results

**Purpose**: Display and analyze historical benchmark results

**Signature**:

```bash
modestbench history [command] [options]
```

**Sub-commands**:

- `list`: Show list of previous runs
- `show <run-id>`: Display detailed results for specific run
- `compare <run-id1> <run-id2>`: Compare two runs
- `trends [pattern]`: Show performance trends over time
- `clean`: Remove old historical data

**Options**:

- `--limit, -l <num>`: Limit number of results (default: 10)
- `--since <date>`: Show results since date (ISO format)
- `--format, -f <type>`: Output format (table,json,csv)
- `--pattern <glob>`: Filter by benchmark pattern
- `--tags <tags>`: Filter by benchmark tags

**Exit Codes**:

- `0`: History operation completed successfully
- `1`: No matching results found
- `2`: Invalid date format or filter
- `3`: History data corruption detected

---

### `modestbench init` - Initialize Project

**Purpose**: Set up ModestBench configuration and example files

**Signature**:

```bash
modestbench init [options]
```

**Options**:

- `--config-type <type>`: Configuration format (json,yaml,js,ts)
- `--examples`: Create example benchmark files
- `--force`: Overwrite existing configuration

**Generated Files**:

- `modestbench.config.json` (or specified format)
- `benchmarks/example.bench.js` (if --examples specified)

**Exit Codes**:

- `0`: Initialization completed successfully
- `1`: Project already initialized (without --force)
- `2`: Permission error creating files

---

### `modestbench validate` - Validate Benchmark Files

**Purpose**: Check benchmark files for syntax and structure errors

**Signature**:

```bash
modestbench validate [pattern] [options]
```

**Arguments**:

- `pattern` (optional): Glob pattern for files to validate

**Options**:

- `--strict`: Strict validation mode
- `--fix`: Automatically fix common issues

**Validation Checks**:

- File syntax (JavaScript/TypeScript)
- Benchmark structure (suites, tasks)
- Configuration validity
- Dependency availability
- Performance anti-patterns

**Exit Codes**:

- `0`: All files valid
- `1`: Validation errors found
- `2`: File access errors

## Error Handling Contract

### Error Message Format

```typescript
interface ErrorMessage {
  type: 'error' | 'warning' | 'info';
  code: string; // Machine-readable error code
  message: string; // Human-readable description
  file?: string; // Source file (if applicable)
  line?: number; // Line number (if applicable)
  suggestion?: string; // Suggested fix
}
```

### Common Error Codes

- `BENCH_001`: Benchmark file syntax error
- `BENCH_002`: Invalid benchmark structure
- `BENCH_003`: Missing dependency
- `BENCH_004`: Timeout exceeded
- `BENCH_005`: Memory limit exceeded
- `CONFIG_001`: Invalid configuration file
- `CONFIG_002`: Missing required option
- `FILE_001`: File not found
- `FILE_002`: Permission denied
- `HIST_001`: History data corruption
- `HIST_002`: Disk space insufficient

### Progress Updates

```typescript
interface ProgressUpdate {
  phase: ExecutionPhase;
  files: ProgressLevel;
  suites: ProgressLevel;
  tasks: ProgressLevel;
  estimatedCompletion?: Date;
  currentItem?: string;
}
```

## Configuration File Contract

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "properties": {
    "pattern": {
      "type": "string",
      "default": "**/*.bench.{js,ts}"
    },
    "exclude": {
      "type": "array",
      "items": { "type": "string" }
    },
    "reporters": {
      "type": "array",
      "items": {
        "enum": ["human", "json", "csv", "silent"]
      },
      "default": ["human"]
    },
    "iterations": {
      "type": "integer",
      "minimum": 1
    },
    "time": {
      "type": "number",
      "minimum": 0
    },
    "warmup": {
      "type": "boolean",
      "default": true
    },
    "concurrent": {
      "type": "boolean",
      "default": false
    },
    "timeout": {
      "type": "number",
      "minimum": 100
    },
    "outputDir": {
      "type": "string"
    },
    "historyLimit": {
      "type": ["integer", "null"],
      "minimum": 1
    }
  },
  "type": "object"
}
```

### Environment Variable Overrides

- `MODESTBENCH_CONFIG`: Path to configuration file
- `MODESTBENCH_REPORTERS`: Comma-separated reporter list
- `MODESTBENCH_OUTPUT_DIR`: Output directory
- `MODESTBENCH_VERBOSE`: Enable verbose mode
- `MODESTBENCH_QUIET`: Enable quiet mode

## File Discovery Contract

### Benchmark File Structure

```typescript
// Expected export structure for benchmark files
export default {
  // File-level configuration (optional)
  config?: Partial<TinybenchConfig>;

  // Benchmark suites
  suites: {
    [suiteName: string]: {
      // Suite-level configuration (optional)
      config?: Partial<TinybenchConfig>;

      // Setup/teardown hooks (optional)
      setup?: () => void | Promise<void>;
      teardown?: () => void | Promise<void>;

      // Benchmark tasks
      benchmarks: {
        [taskName: string]: {
          fn: () => void | Promise<void>;
          config?: Partial<TinybenchConfig>;
          tags?: string[];
        }
      }
    }
  }
};
```

### Alternative Export Patterns

```typescript
// Function-based export
export default function defineBenchmarks() {
  return {
    suites: {
      /* ... */
    },
  };
}

// Builder pattern
import { suite, benchmark } from 'modestbench';

suite('Array Operations', () => {
  benchmark('push', () => {
    /* ... */
  });
  benchmark('unshift', () => {
    /* ... */
  });
});
```

## Reporter Interface Contract

### Base Reporter Interface

```typescript
interface Reporter {
  name: string;

  // Lifecycle hooks
  onStart(run: BenchmarkRun): void | Promise<void>;
  onProgress(update: ProgressUpdate): void | Promise<void>;
  onFileStart(file: BenchmarkFile): void | Promise<void>;
  onFileComplete(
    file: BenchmarkFile,
    results: BenchmarkResult[],
  ): void | Promise<void>;
  onSuiteStart(suite: BenchmarkSuite): void | Promise<void>;
  onSuiteComplete(
    suite: BenchmarkSuite,
    results: BenchmarkResult[],
  ): void | Promise<void>;
  onTaskStart(task: BenchmarkTask): void | Promise<void>;
  onTaskComplete(
    task: BenchmarkTask,
    result: BenchmarkResult,
  ): void | Promise<void>;
  onComplete(run: BenchmarkRun): void | Promise<void>;
  onError(error: ExecutionError): void | Promise<void>;
}
```

### Output Streams

- **stdout**: Primary output (results, progress)
- **stderr**: Errors, warnings, debug information
- **Files**: JSON/CSV output written to files when specified
