/**
 * ModestBench Core Types
 *
 * Defines the fundamental data structures used throughout the ModestBench system.
 * These types represent benchmark results, metadata, configuration, and system state.
 */

/**
 * Represents a single benchmark task execution result
 */
export interface TaskResult {
  /** Unique identifier for the task */
  readonly name: string;
  /** Mean execution time in nanoseconds */
  readonly mean: number;
  /** Standard deviation of execution times in nanoseconds */
  readonly stdDev: number;
  /** Minimum execution time in nanoseconds */
  readonly min: number;
  /** Maximum execution time in nanoseconds */
  readonly max: number;
  /** Number of iterations executed */
  readonly iterations: number;
  /** Operations per second (calculated from mean) */
  readonly opsPerSecond: number;
  /** Margin of error as a percentage */
  readonly marginOfError: number;
  /** Statistical variance of execution times */
  readonly variance: number;
  /** 95th percentile execution time in nanoseconds */
  readonly p95: number;
  /** 99th percentile execution time in nanoseconds */
  readonly p99: number;
  /** Any error that occurred during execution */
  readonly error?: Error;
  /** Custom metadata associated with the task */
  readonly metadata?: Record<string, unknown>;
  /** Task-specific tags for filtering and grouping */
  readonly tags?: string[];
}

/**
 * Represents results from a benchmark suite (collection of tasks)
 */
export interface SuiteResult {
  /** Name of the benchmark suite */
  readonly name: string;
  /** Results for all tasks in the suite */
  readonly tasks: readonly TaskResult[];
  /** Total execution time for the suite in milliseconds */
  readonly duration: number;
  /** Timestamp when suite execution started */
  readonly startTime: Date;
  /** Timestamp when suite execution completed */
  readonly endTime: Date;
  /** Suite-level configuration that was applied */
  readonly config?: Partial<ModestBenchConfig>;
  /** Custom metadata for the suite */
  readonly metadata?: Record<string, unknown>;
  /** Suite-specific tags */
  readonly tags?: string[];
  /** Any suite-level errors */
  readonly error?: Error;
}

/**
 * Represents results from a benchmark file (collection of suites)
 */
export interface FileResult {
  /** Absolute path to the benchmark file */
  readonly filePath: string;
  /** Results from all suites in the file */
  readonly suites: readonly SuiteResult[];
  /** Total execution time for the file in milliseconds */
  readonly duration: number;
  /** Timestamp when file execution started */
  readonly startTime: Date;
  /** Timestamp when file execution completed */
  readonly endTime: Date;
  /** File-level configuration that was applied */
  readonly config?: Partial<ModestBenchConfig>;
  /** Any file-level errors */
  readonly error?: Error;
}

/**
 * Represents a complete benchmark run across multiple files
 */
export interface BenchmarkRun {
  /** Unique identifier for this run */
  readonly id: string;
  /** Results from all benchmark files */
  readonly files: readonly FileResult[];
  /** Total execution time for the entire run in milliseconds */
  readonly duration: number;
  /** Timestamp when run started */
  readonly startTime: Date;
  /** Timestamp when run completed */
  readonly endTime: Date;
  /** Configuration used for this run */
  readonly config: ModestBenchConfig;
  /** Environment information */
  readonly environment: EnvironmentInfo;
  /** Git information if available */
  readonly git?: GitInfo;
  /** CI/CD information if available */
  readonly ci?: CiInfo;
  /** Custom run-level metadata */
  readonly metadata?: Record<string, unknown>;
  /** Run-level tags */
  readonly tags?: string[];
  /** Summary statistics across all results */
  readonly summary: RunSummary;
}

/**
 * Summary statistics for a benchmark run
 */
export interface RunSummary {
  /** Total number of files executed */
  readonly totalFiles: number;
  /** Total number of suites executed */
  readonly totalSuites: number;
  /** Total number of tasks executed */
  readonly totalTasks: number;
  /** Number of tasks that failed */
  readonly failedTasks: number;
  /** Number of tasks that passed */
  readonly passedTasks: number;
  /** Fastest task result */
  readonly fastest: TaskResult | null;
  /** Slowest task result */
  readonly slowest: TaskResult | null;
  /** Overall mean execution time across all tasks */
  readonly overallMean: number;
  /** Total number of operations performed */
  readonly totalOperations: number;
}

/**
 * Environment information captured during benchmark execution
 */
export interface EnvironmentInfo {
  /** Node.js version */
  readonly nodeVersion: string;
  /** Operating system platform */
  readonly platform: string;
  /** Operating system architecture */
  readonly arch: string;
  /** CPU information */
  readonly cpu: CpuInfo;
  /** Memory information */
  readonly memory: MemoryInfo;
  /** Available memory at start of run */
  readonly availableMemory: number;
  /** Hostname where benchmarks were executed */
  readonly hostname: string;
  /** Environment variables related to benchmarking */
  readonly env: Record<string, string>;
}

/**
 * CPU information
 */
export interface CpuInfo {
  /** CPU model name */
  readonly model: string;
  /** Number of CPU cores */
  readonly cores: number;
  /** CPU speed in MHz */
  readonly speed: number;
}

/**
 * Memory information
 */
export interface MemoryInfo {
  /** Total system memory in bytes */
  readonly total: number;
  /** Free system memory in bytes */
  readonly free: number;
  /** Used system memory in bytes */
  readonly used: number;
}

/**
 * Git repository information
 */
export interface GitInfo {
  /** Current branch name */
  readonly branch: string;
  /** Current commit hash */
  readonly commit: string;
  /** Commit message */
  readonly message: string;
  /** Author of the commit */
  readonly author: string;
  /** Commit timestamp */
  readonly timestamp: Date;
  /** Whether working directory has uncommitted changes */
  readonly dirty: boolean;
  /** List of modified files */
  readonly modifiedFiles: string[];
  /** Remote origin URL */
  readonly remoteUrl?: string;
}

/**
 * CI/CD environment information
 */
export interface CiInfo {
  /** Name of the CI provider */
  readonly provider: string;
  /** Build/job number */
  readonly buildNumber?: string;
  /** Build URL */
  readonly buildUrl?: string;
  /** Pull request number */
  readonly pullRequest?: string;
  /** Branch being built */
  readonly branch?: string;
  /** Commit being built */
  readonly commit?: string;
}

/**
 * Benchmark configuration
 */
export interface ModestBenchConfig {
  /** Default number of iterations per task */
  readonly iterations: number;
  /** Maximum time to spend on each task in milliseconds */
  readonly time: number;
  /** Number of warmup iterations before measurement */
  readonly warmup: number;
  /** Whether to run suites concurrently */
  readonly concurrent: boolean;
  /** Timeout for individual tasks in milliseconds */
  readonly timeout: number;
  /** Whether to stop on first failure */
  readonly bail: boolean;
  /** Pattern for discovering benchmark files */
  readonly pattern: string;
  /** Patterns to exclude from discovery */
  readonly exclude: string[];
  /** Output directory for reports */
  readonly outputDir: string;
  /** Reporters to use for output */
  readonly reporters: string[];
  /** Whether to run in quiet mode */
  readonly quiet: boolean;
  /** Whether to run in verbose mode */
  readonly verbose: boolean;
  /** Tags to include (if empty, include all) */
  readonly tags: string[];
  /** Configuration for specific reporters */
  readonly reporterConfig: Record<string, unknown>;
  /** Custom metadata to attach to runs */
  readonly metadata: Record<string, unknown>;
  /** Threshold configuration for performance assertions */
  readonly thresholds: ThresholdConfig;
}

/**
 * Threshold configuration for performance assertions
 */
export interface ThresholdConfig {
  /** Maximum allowed mean execution time in nanoseconds */
  readonly maxMean?: number;
  /** Maximum allowed standard deviation */
  readonly maxStdDev?: number;
  /** Minimum required operations per second */
  readonly minOpsPerSecond?: number;
  /** Maximum allowed margin of error percentage */
  readonly maxMarginOfError?: number;
  /** Maximum allowed 95th percentile time */
  readonly maxP95?: number;
  /** Maximum allowed 99th percentile time */
  readonly maxP99?: number;
}
