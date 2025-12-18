import type { z } from 'zod';

import type {
  jsonReporterConfigSchema,
  ModestBenchConfig,
  ModestBenchConfigInput,
  reporterConfigSchema,
} from '../config/schema.js';
// Budget-related types
import type {
  AbsoluteBudget,
  BaselineReference,
  BaselineStorage,
  BaselineSummaryData,
  Budget,
  BudgetResult,
  BudgetSummary,
  BudgetViolation,
  RelativeBudget,
  RunId,
  TaskId,
} from './budgets.js';

/**
 * Benchmark file structure after parsing
 */
export interface BenchmarkFile {
  /** Raw file content */
  readonly content: string;
  /** Parsed exports from the file */
  readonly exports: unknown;
  /** Absolute path to the file */
  readonly filePath: string;
  /** File metadata */
  readonly metadata: FileMetadata;
}

/**
 * Represents a complete benchmark run across multiple files
 */
export interface BenchmarkRun {
  /** Budget evaluation summary (if budgets configured) */
  readonly budgetSummary?: BudgetSummary;
  /** CI/CD information if available */
  readonly ci?: CiInfo;
  /** Configuration used for this run */
  readonly config: ModestBenchConfig;
  /** Total execution time for the entire run in milliseconds */
  readonly duration: number;
  /** Timestamp when run completed */
  readonly endTime: Date;
  /** Environment information */
  readonly environment: EnvironmentInfo;
  /** Results from all benchmark files */
  readonly files: readonly FileResult[];
  /** Git information if available */
  readonly git?: GitInfo;
  /** Unique identifier for this run */
  readonly id: RunId;
  /** Custom run-level metadata */
  readonly metadata?: Record<string, unknown>;
  /** Timestamp when run started */
  readonly startTime: Date;
  /** Summary statistics across all results */
  readonly summary: RunSummary;
  /** Run-level tags */
  readonly tags?: string[];
}

export type {
  AbsoluteBudget,
  BaselineReference,
  BaselineStorage,
  BaselineSummaryData,
  Budget,
  BudgetResult,
  BudgetSummary,
  BudgetViolation,
  RelativeBudget,
  RunId,
  TaskId,
};

export type { ModestBenchConfig, ModestBenchConfigInput };

// Re-export schema-derived types
export type {
  BenchmarkDefinition,
  BenchmarkDefinitionInput,
  BenchmarkSuite,
  BenchmarkSuiteInput,
  BenchmarkTask,
  BenchmarkTaskInput,
} from '../config/benchmark-schema.js';

/**
 * CI/CD environment information
 */
export interface CiInfo {
  /** Branch being built */
  readonly branch?: string;
  /** Build/job number */
  readonly buildNumber?: string;
  /** Build URL */
  readonly buildUrl?: string;
  /** Commit being built */
  readonly commit?: string;
  /** Name of the CI provider */
  readonly provider: string;
  /** Pull request number */
  readonly pullRequest?: string;
}

/**
 * ModestBench Core Types
 *
 * Defines the fundamental data structures used throughout the ModestBench
 * system. These types represent benchmark results, metadata, configuration, and
 * system state.
 *
 * Note: BenchmarkDefinition, BenchmarkSuite, and BenchmarkTask types are
 * derived from Zod schemas and re-exported from benchmark-schema.ts for type
 * safety and consistency.
 */

// Re-export identifier helper functions
export { createRunId, createTaskId } from '../utils/identifiers.js';

/**
 * CPU information
 */
export interface CpuInfo {
  /** Number of CPU cores */
  readonly cores: number;
  /** CPU model name */
  readonly model: string;
  /** CPU speed in MHz */
  readonly speed: number;
}

export type Engine = 'accurate' | 'tinybench';

/**
 * Environment information captured during benchmark execution
 */
export interface EnvironmentInfo {
  /** Operating system architecture */
  readonly arch: string;
  /** Available memory at start of run */
  readonly availableMemory: number;
  /** CPU information */
  readonly cpu: CpuInfo;
  /** Environment variables related to benchmarking */
  readonly env: Record<string, string>;
  /** Hostname where benchmarks were executed */
  readonly hostname: string;
  /** Memory information */
  readonly memory: MemoryInfo;
  /** Node.js version */
  readonly nodeVersion: string;
  /** Operating system platform */
  readonly platform: string;
}

/**
 * Context information for errors
 */
export interface ErrorContext {
  /** File being processed when error occurred */
  readonly file?: string;
  /** Additional context data */
  readonly metadata?: Record<string, unknown>;
  /** Execution phase where error occurred */
  readonly phase: ExecutionPhase;
  /** Suite being executed when error occurred */
  readonly suite?: string;
  /** Task being executed when error occurred */
  readonly task?: string;
  /** Timestamp when error occurred */
  readonly timestamp: Date;
}

/**
 * Error statistics for tracking
 */
export interface ErrorStats {
  /** Errors grouped by execution phase */
  readonly byPhase: Record<ExecutionPhase, number>;
  /** Errors grouped by error type */
  readonly byType: Record<string, number>;
  /** First error timestamp */
  readonly firstError?: Date;
  /** Last error timestamp */
  readonly lastError?: Date;
  /** Recent errors (limited list) */
  readonly recent: readonly ExecutionError[];
  /** Total number of errors */
  readonly total: number;
}

/**
 * Structured execution error with context
 */
export interface ExecutionError {
  /** Error code for programmatic handling */
  readonly code: string;
  /** Error context information */
  readonly context: ErrorContext;
  /** Human-readable error message */
  readonly message: string;
  /** Original error object */
  readonly originalError: Error;
  /** Timestamp when error was processed */
  readonly processedAt: Date;
  /** Whether the error is recoverable */
  readonly recoverable: boolean;
  /** Stack trace */
  readonly stack?: string;
}

/**
 * Execution phases for error context
 */
export type ExecutionPhase =
  | 'cleanup'
  | 'discovery'
  | 'execution'
  | 'loading'
  | 'reporting'
  | 'setup'
  | 'teardown'
  | 'validation';

/**
 * File metadata for change detection and validation
 */
export interface FileMetadata {
  /** Names of all exports in the file */
  readonly exportNames: string[];
  /** Whether the file has a default export */
  readonly hasDefaultExport: boolean;
  /** File modification time */
  readonly mtime: Date;
  /** File size in bytes */
  readonly size: number;
}

/**
 * Represents results from a benchmark file (collection of suites)
 */
export interface FileResult {
  /** File-level configuration that was applied */
  readonly config?: Partial<ModestBenchConfig> | undefined;
  /** Total execution time for the file in milliseconds */
  readonly duration: number;
  /** Timestamp when file execution completed */
  readonly endTime: Date;
  /** Any file-level errors */
  readonly error?: Error;
  /** Absolute path to the benchmark file */
  readonly filePath: string;
  /** Timestamp when file execution started */
  readonly startTime: Date;
  /** Results from all suites in the file */
  readonly suites: readonly SuiteResult[];
}

/**
 * Git repository information
 */
export interface GitInfo {
  /** Author of the commit */
  readonly author: string;
  /** Current branch name */
  readonly branch: string;
  /** Current commit hash */
  readonly commit: string;
  /** Whether working directory has uncommitted changes */
  readonly dirty: boolean;
  /** Commit message */
  readonly message: string;
  /** List of modified files */
  readonly modifiedFiles: string[];
  /** Remote origin URL */
  readonly remoteUrl?: string;
  /** Commit timestamp */
  readonly timestamp: Date;
}

/**
 * Configuration options for the JSON reporter
 */
export type JsonReporterConfig = z.infer<typeof jsonReporterConfigSchema>;

/**
 * Memory information
 */
export interface MemoryInfo {
  /** Free system memory in bytes */
  readonly free: number;
  /** Total system memory in bytes */
  readonly total: number;
  /** Used system memory in bytes */
  readonly used: number;
}

/**
 * Reporter-specific configuration
 *
 * Provides typed configuration for known reporters. Unknown reporter configs
 * are allowed via index signature.
 */
export type ReporterConfig = z.infer<typeof reporterConfigSchema>;

/**
 * Summary statistics for a benchmark run
 */
export interface RunSummary {
  /** Number of tasks that failed */
  readonly failedTasks: number;
  /** Fastest task result */
  readonly fastest: null | TaskResult;
  /** Overall mean execution time across all tasks */
  readonly overallMean: number;
  /** Number of tasks that passed */
  readonly passedTasks: number;
  /** Slowest task result */
  readonly slowest: null | TaskResult;
  /** Total number of files executed */
  readonly totalFiles: number;
  /** Total number of operations performed */
  readonly totalOperations: number;
  /** Total number of suites executed */
  readonly totalSuites: number;
  /** Total number of tasks executed */
  readonly totalTasks: number;
}

/**
 * Represents results from a benchmark suite (collection of tasks)
 */
export interface SuiteResult {
  /** Suite-level configuration that was applied */
  readonly config?: Partial<ModestBenchConfig>;
  /** Total execution time for the suite in milliseconds */
  readonly duration: number;
  /** Timestamp when suite execution completed */
  readonly endTime: Date;
  /** Any suite-level errors */
  readonly error?: Error;
  /** Custom metadata for the suite */
  readonly metadata?: Record<string, unknown>;
  /** Name of the benchmark suite */
  readonly name: string;
  /** Timestamp when suite execution started */
  readonly startTime: Date;
  /** Suite-specific tags */
  readonly tags?: string[];
  /** Results for all tasks in the suite */
  readonly tasks: readonly TaskResult[];
}

/**
 * Represents a single benchmark task execution result
 */
export interface TaskResult {
  /** Whether the task was aborted (via Ctrl+C or signal) */
  readonly aborted?: boolean;
  /** Coefficient of variation (stdDev/mean × 100) */
  readonly cv: number;
  /** Any error that occurred during execution */
  readonly error?: Error;
  /** Number of iterations executed */
  readonly iterations: number;
  /** Margin of error as a percentage */
  readonly marginOfError: number;
  /** Maximum execution time in nanoseconds */
  readonly max: number;
  /** Mean execution time in nanoseconds */
  readonly mean: number;
  /** Custom metadata associated with the task */
  readonly metadata?: Record<string, unknown>;
  /** Minimum execution time in nanoseconds */
  readonly min: number;
  /** Unique identifier for the task */
  readonly name: string;
  /** Operations per second (calculated from mean) */
  readonly opsPerSecond: number;
  /** 95th percentile execution time in nanoseconds */
  readonly p95: number;
  /** 99th percentile execution time in nanoseconds */
  readonly p99: number;
  /** Standard deviation of execution times in nanoseconds */
  readonly stdDev: number;
  /** Task-specific tags for filtering and grouping */
  readonly tags?: string[];
  /** Statistical variance of execution times */
  readonly variance: number;
}

/**
 * Threshold configuration for performance assertions
 *
 * TODO: Derive from thresholdConfigSchema via z.infer (see #15)
 */
export interface ThresholdConfig {
  /** Maximum allowed margin of error percentage */
  readonly maxMarginOfError?: number;
  /** Maximum allowed mean execution time in nanoseconds */
  readonly maxMean?: number;
  /** Maximum allowed 95th percentile time */
  readonly maxP95?: number;
  /** Maximum allowed 99th percentile time */
  readonly maxP99?: number;
  /** Maximum allowed standard deviation */
  readonly maxStdDev?: number;
  /** Minimum required operations per second */
  readonly minOpsPerSecond?: number;
}
