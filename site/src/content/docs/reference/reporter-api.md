---
title: Reporter Plugin API Reference
description: Complete type reference for modestbench reporter plugins
---

This is the complete API reference for building third-party reporter plugins. For a practical guide with examples, see [Build a Custom Reporter](/guides/custom-reporters/).

## Plugin Export Patterns

A reporter plugin module must have a **default export** that matches one of these patterns:

```typescript
// Pattern 1: Plain Reporter object
export default reporter satisfies Reporter;

// Pattern 2: Factory function (sync or async)
export default createReporter satisfies ReporterFactory;

// Pattern 3: Class constructor
export default MyReporter satisfies ReporterClass;
```

## Types

### `Reporter`

The core interface that all reporters must implement.

```typescript
interface Reporter {
  // Required methods
  onStart(run: BenchmarkRun): Promise<void> | void;
  onEnd(run: BenchmarkRun): Promise<void> | void;
  onError(error: Error): Promise<void> | void;
  onTaskResult(result: TaskResult): Promise<void> | void;

  // Optional methods
  onFileStart?(file: string): Promise<void> | void;
  onFileEnd?(result: FileResult): Promise<void> | void;
  onSuiteStart?(suite: string): Promise<void> | void;
  onSuiteEnd?(result: SuiteResult): Promise<void> | void;
  onSuiteInit?(
    suite: string,
    taskNames: readonly string[],
  ): Promise<void> | void;
  onTaskStart?(task: string): Promise<void> | void;
  onProgress?(state: ProgressState): Promise<void> | void;
  onBudgetResult?(summary: BudgetSummary): Promise<void> | void;
}
```

### `ReporterFactory`

A function that creates a `Reporter` instance. Receives `options` and `context`. Use the generic type parameter to define your options shape, if needed.

```typescript
type ReporterFactory<
  TOptions extends Record<string, unknown> = Record<string, unknown>,
> = (
  options: TOptions,
  context: ReporterContext,
) => Reporter | Promise<Reporter>;
```

**Example with typed options:**

```typescript
interface SlackReporterOptions {
  webhookUrl: string;
  channel?: string;
}

const createReporter: ReporterFactory<SlackReporterOptions> = (
  options,
  context,
) => {
  // options.webhookUrl is typed as string
  // options.channel is typed as string | undefined
};
```

### `ReporterClass`

A class constructor for reporters. Use the generic type parameter to define your options shape.

```typescript
interface ReporterClass<
  TOptions extends Record<string, unknown> = Record<string, unknown>,
> {
  new (options?: TOptions, context?: ReporterContext): Reporter;
}
```

### `ReporterContext`

Context object provided to factory functions and class constructors.

```typescript
interface ReporterContext {
  /** ModestBench version string (e.g., "0.6.0") */
  readonly version: string;

  /** Plugin API version for compatibility checks (currently 1) */
  readonly pluginApiVersion: number;

  /** Logger for reporter output */
  readonly logger: Logger;

  /** Formatting utility functions */
  readonly utils: ReporterUtils;
}
```

### `Logger`

Logging interface for reporter output. Use this instead of `console` methods to ensure output respects the user's verbosity settings.

```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
}
```

### `ReporterUtils`

Utility functions for consistent formatting of benchmark data.

```typescript
interface ReporterUtils {
  /**
   * Format bytes in human-readable format
   *
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., "1.5 GB", "256 MB", "1.0 KB")
   */
  formatBytes(bytes: number): string;

  /**
   * Format duration in human-readable format
   *
   * @param nanoseconds - Duration in nanoseconds
   * @returns Formatted string (e.g., "1.23ms", "456.78μs", "1.00s")
   */
  formatDuration(nanoseconds: number): string;

  /**
   * Format operations per second with SI prefix
   *
   * @param opsPerSecond - Operations per second
   * @returns Formatted string (e.g., "1.2M ops/sec", "456K ops/sec")
   */
  formatOpsPerSecond(opsPerSecond: number): string;

  /**
   * Format percentage value
   *
   * @param value - Percentage value
   * @returns Formatted string (e.g., "12.34%")
   */
  formatPercentage(value: number): string;
}
```

### `ReporterPlugin`

Union type representing all valid reporter plugin exports.

```typescript
type ReporterPlugin = Reporter | ReporterClass | ReporterFactory;
```

## Method Parameters

### `BenchmarkRun`

Complete benchmark run information passed to `onStart` and `onEnd`.

```typescript
interface BenchmarkRun {
  /** Unique run identifier */
  id: string;

  /** Run start timestamp (ISO 8601) */
  startTime: string;

  /** Run end timestamp (ISO 8601), undefined until run completes */
  endTime?: string;

  /** Total duration in nanoseconds */
  duration: number;

  /** Run status */
  status: 'running' | 'completed' | 'failed' | 'interrupted';

  /** Environment information */
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpu: { model: string; cores: number; speed: number };
    memory: { total: number; totalGB: number };
  };

  /** Configuration used for this run */
  config: ModestBenchConfig;

  /** All benchmark files */
  files: BenchmarkFile[];

  /** Summary statistics */
  summary: {
    totalFiles: number;
    totalSuites: number;
    totalTasks: number;
    passedTasks: number;
    failedTasks: number;
    skippedTasks: number;
  };
}
```

### `TaskResult`

Individual benchmark task result passed to `onTaskResult`.

```typescript
interface TaskResult {
  /** Task name */
  name: string;

  /** Task status */
  status: 'passed' | 'failed' | 'skipped';

  /** Operations per second (throughput) */
  opsPerSecond: number;

  /** Mean execution time in nanoseconds */
  mean: number;

  /** Minimum execution time in nanoseconds */
  min: number;

  /** Maximum execution time in nanoseconds */
  max: number;

  /** Standard deviation in nanoseconds */
  stdDev: number;

  /** Variance */
  variance: number;

  /** 95th percentile in nanoseconds */
  p95: number;

  /** 99th percentile in nanoseconds */
  p99: number;

  /** Margin of error percentage */
  marginOfError: number;

  /** Number of iterations completed */
  iterations: number;

  /** Tags assigned to this task */
  tags: string[];

  /** Error message if status is 'failed' */
  error?: string;
}
```

### `FileResult`

File completion result passed to `onFileEnd`.

```typescript
interface FileResult {
  /** File path */
  file: string;

  /** File status */
  status: 'passed' | 'failed' | 'skipped';

  /** Total tasks in file */
  totalTasks: number;

  /** Passed tasks */
  passedTasks: number;

  /** Failed tasks */
  failedTasks: number;

  /** Skipped tasks */
  skippedTasks: number;

  /** File execution duration in nanoseconds */
  duration: number;
}
```

### `SuiteResult`

Suite completion result passed to `onSuiteEnd`.

```typescript
interface SuiteResult {
  /** Suite name */
  name: string;

  /** Suite status */
  status: 'passed' | 'failed' | 'skipped';

  /** Total tasks in suite */
  totalTasks: number;

  /** Passed tasks */
  passedTasks: number;

  /** Failed tasks */
  failedTasks: number;

  /** Skipped tasks */
  skippedTasks: number;

  /** Suite execution duration in nanoseconds */
  duration: number;
}
```

### `ProgressState`

Progress update passed to `onProgress`.

```typescript
interface ProgressState {
  /** Current task name */
  task: string;

  /** Current iteration number */
  iteration: number;

  /** Total iterations planned */
  totalIterations: number;

  /** Progress percentage (0-100) */
  percentage: number;

  /** Elapsed time in nanoseconds */
  elapsed: number;
}
```

### `BudgetSummary`

Budget evaluation result passed to `onBudgetResult`.

```typescript
interface BudgetSummary {
  /** Overall budget status */
  status: 'passed' | 'failed';

  /** Number of budgets checked */
  totalBudgets: number;

  /** Number of budgets that passed */
  passedBudgets: number;

  /** Number of budgets that failed */
  failedBudgets: number;

  /** Individual budget results */
  results: BudgetResult[];
}

interface BudgetResult {
  /** Task identifier */
  taskId: string;

  /** Budget type */
  type: 'absolute' | 'relative';

  /** Whether budget passed */
  passed: boolean;

  /** Actual measured value */
  actual: number;

  /** Budget threshold value */
  threshold: number;

  /** Human-readable message */
  message: string;
}
```

## Error Classes

### `ReporterLoadError`

Thrown when a reporter module cannot be loaded.

```typescript
class ReporterLoadError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_LOAD_FAILED';

  /** The specifier (file path or package name) that failed to load */
  readonly specifier: string;
}
```

Common causes:

- File not found
- Syntax error in module
- Invalid module format
- Constructor threw an error
- Factory function threw an error

### ReporterValidationError

Thrown when a loaded module doesn't implement the Reporter interface.

```typescript
class ReporterValidationError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_INVALID';

  /** The specifier of the invalid reporter */
  readonly specifier: string;

  /** Methods that are missing from the reporter */
  readonly missingMethods: string[];
}
```

## Utility Function Details

### `formatDuration`

Formats nanoseconds to human-readable duration.

| Input Range         | Output Format | Example    |
| ------------------- | ------------- | ---------- |
| < 1,000 ns          | `X.XXns`      | `500.00ns` |
| < 1,000,000 ns      | `X.XXμs`      | `123.45μs` |
| < 1,000,000,000 ns  | `X.XXms`      | `1.23ms`   |
| >= 1,000,000,000 ns | `X.XXs`       | `1.50s`    |

### `formatOpsPerSecond`

Formats operations per second with SI prefix.

| Input Range      | Output Format   | Example           |
| ---------------- | --------------- | ----------------- |
| < 1,000          | `X.XX ops/sec`  | `500.00 ops/sec`  |
| < 1,000,000      | `X.XXK ops/sec` | `123.45K ops/sec` |
| < 1,000,000,000  | `X.XXM ops/sec` | `1.23M ops/sec`   |
| >= 1,000,000,000 | `X.XXB ops/sec` | `1.50B ops/sec`   |

### `formatBytes`

Formats bytes to human-readable size.

| Input Range          | Output Format | Example    |
| -------------------- | ------------- | ---------- |
| < 1,024              | `X.X B`       | `512.0 B`  |
| < 1,048,576          | `X.X KB`      | `1.5 KB`   |
| < 1,073,741,824      | `X.X MB`      | `256.0 MB` |
| < 1,099,511,627,776  | `X.X GB`      | `1.5 GB`   |
| >= 1,099,511,627,776 | `X.X TB`      | `2.5 TB`   |

### `formatPercentage`

Formats a number as a percentage with 2 decimal places.

| Input    | Output    |
| -------- | --------- |
| `0`      | `0.00%`   |
| `12.345` | `12.35%`  |
| `100`    | `100.00%` |
| `-5.5`   | `-5.50%`  |

## Lifecycle Sequence

Methods are called in this order during a benchmark run:

```text
onStart(run)
├── onFileStart(file)
│   ├── onSuiteInit(suite, taskNames)
│   ├── onSuiteStart(suite)
│   │   ├── onTaskStart(task)
│   │   │   └── onProgress(state)  [multiple times]
│   │   ├── onTaskResult(result)
│   │   └── [repeat for each task]
│   ├── onSuiteEnd(result)
│   └── [repeat for each suite]
├── onFileEnd(result)
├── [repeat for each file]
├── onBudgetResult(summary)  [if budgets configured]
└── onEnd(run)

onError(error)  [can occur at any point]
```

## Configuration

Configure reporters in `modestbench.config.json`:

```json
{
  "reporterConfig": {
    "./my-reporter.ts": {
      "verbose": true,
      "outputFormat": "markdown"
    },
    "@flibbertigibbet/modestbench-reporter-wazit": {
      "path": "/foo/bar/",
      "site": "example.com"
    }
  },
  "reporters": [
    "human",
    "./my-reporter.ts",
    "@flibbertigibbet/modestbench-reporter-wazit"
  ]
}
```

The `options` parameter in factory functions and constructors receives the corresponding `reporterConfig` entry.

## Specifier Resolution

Reporter specifiers are resolved as follows:

1. **Built-in names** (`human`, `json`, `csv`, `simple`, `nyan`) → Load built-in reporter
2. **Starts with `.` or `/`** → Resolve as file path relative to the current working directory
3. **Absolute path** → Use directly
4. **Otherwise** → Use Node.js' module resolution algorithm

## Package Conventions

When publishing a reporter package to npm:

- Use `modestbench-reporter-*` for unscoped packages
- Use `@scope/modestbench-reporter-*` for scoped packages
- Add the `modestbench-plugin` keyword
- Add modestbench as a peer dependency

Example:

```json
{
  "name": "modestbench-reporter-wazit",
  "keywords": ["modestbench-plugin"],
  "peerDependencies": {
    "modestbench": ">=0.6.0"
  }
}
```

If you are a smartypants and want to actually test your reporter, you'll probably want to add a `devDependencies` entry for `modestbench`, too.

## See Also

- [Build a Custom Reporter](/guides/custom-reporters/) - Practical guide with examples
- [Output Formats](/guides/output/) - Built-in reporter documentation
