/**
 * ModestBench Interface Types
 *
 * Defines the contract interfaces for all major components in the ModestBench
 * system. These interfaces establish the public APIs that implementations must
 * satisfy.
 */

import type {
  BenchmarkFile,
  BenchmarkRun,
  ErrorContext,
  ErrorStats,
  ExecutionError,
  FileResult,
  ModestBenchConfig,
  SuiteResult,
  TaskResult,
} from './core.js';

/**
 * Main benchmark engine interface
 */
export interface BenchmarkEngine {
  /**
   * Discover benchmark files matching patterns
   */
  discover(pattern: string | string[], exclude?: string[]): Promise<string[]>;

  /**
   * Execute benchmarks with the given configuration
   */
  execute(
    config: RunConfiguration,
    reporters?: Reporter[],
    signal?: AbortSignal,
  ): Promise<BenchmarkRun>;

  /**
   * Get all registered reporters
   */
  getReporters(): Record<string, Reporter>;

  /**
   * Register a reporter for benchmark output
   */
  registerReporter(name: string, reporter: Reporter): void;

  /**
   * Validate benchmark files
   */
  validate(files: string[]): Promise<ValidationResult>;
}

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
  /** Amount of disk space freed in bytes */
  readonly freedBytes: number;
  /** Files that were removed */
  readonly removedFiles: string[];
  /** Number of runs removed */
  readonly removedRuns: number;
}

/**
 * Configuration management interface
 */
export interface ConfigurationManager {
  /**
   * Get default configuration values
   */
  getDefaults(): ModestBenchConfig;

  /**
   * Load configuration from various sources
   */
  load(
    configPath?: string,
    cliArgs?: Record<string, unknown>,
  ): Promise<ModestBenchConfig>;

  /**
   * Merge multiple configuration objects with precedence
   */
  merge(...configs: Partial<ModestBenchConfig>[]): ModestBenchConfig;

  /**
   * Validate a configuration object
   */
  validate(config: Partial<ModestBenchConfig>): ValidationResult;
}

/**
 * CSV output reporter interface
 */
export interface CsvReporter extends Reporter {
  /** CSV delimiter character */
  readonly delimiter: string;
  /** Include CSV headers */
  readonly includeHeaders: boolean;
}

/**
 * Error management interface for handling execution errors
 */
export interface ErrorManager {
  /**
   * Clear error history
   */
  clearStats(): void;

  /**
   * Format error for display
   */
  formatError(error: ExecutionError): string;

  /**
   * Get error code for a given error
   */
  getErrorCode(error: Error, context: ErrorContext): string;

  /**
   * Get error statistics
   */
  getStats(): ErrorStats;

  /**
   * Handle an execution error
   */
  handleError(error: Error, context: ErrorContext): ExecutionError;

  /**
   * Check if an error is recoverable
   */
  isRecoverable(error: ExecutionError): boolean;

  /**
   * Register error handler callback
   */
  onError(handler: (error: ExecutionError) => void): void;
}

/**
 * File loader interface for benchmark discovery and loading
 */
export interface FileLoader {
  /**
   * Discover benchmark files matching patterns
   */
  discover(pattern: string | string[], exclude?: string[]): Promise<string[]>;

  /**
   * Load a benchmark file
   */
  load(filePath: string): Promise<BenchmarkFile>;

  /**
   * Validate a benchmark file
   */
  validate(filePath: string): Promise<ValidationResult>;
}

/**
 * Query interface for historical benchmark data
 */
export interface HistoryQuery {
  /** Maximum number of results */
  readonly limit?: number;
  /** Results offset for pagination */
  readonly offset?: number;
  /** Pattern to match benchmark names */
  readonly pattern?: string;
  /** Start date for filtering */
  readonly since?: Date;
  /** Sort order */
  readonly sort?: 'asc' | 'desc';
  /** Field to sort by */
  readonly sortBy?: 'date' | 'duration' | 'name';
  /** Tags to filter by */
  readonly tags?: string[];
  /** End date for filtering */
  readonly until?: Date;
}

/**
 * Historical data storage interface
 */
export interface HistoryStorage {
  /**
   * Clean up old data according to retention policy
   */
  cleanup(policy: RetentionPolicy): Promise<CleanupResult>;

  /**
   * Export historical data
   */
  export(format: 'csv' | 'json', query?: HistoryQuery): Promise<string>;

  /**
   * Get index of all stored runs
   */
  getIndex(): Promise<Array<{ date: Date; id: string; summary: string }>>;

  /**
   * Load a specific benchmark run
   */
  loadRun(id: string): Promise<BenchmarkRun | null>;

  /**
   * Query historical runs
   */
  queryRuns(query: HistoryQuery): Promise<BenchmarkRun[]>;

  /**
   * Save a benchmark run to storage
   */
  saveRun(run: BenchmarkRun): Promise<void>;
}

/**
 * Human-readable reporter interface
 */
export interface HumanReporter extends Reporter {
  /** Displays progress bars */
  readonly showProgress: boolean;
  /** Uses colors and formatting for terminal output */
  readonly supportsColor: boolean;
}

/**
 * JSON output reporter interface
 */
export interface JsonReporter extends Reporter {
  /** Pretty-print JSON output */
  readonly prettyPrint: boolean;
  /** Supports streaming output */
  readonly streaming: boolean;
}

/**
 * Progress management interface
 */
export interface ProgressManager {
  /**
   * Clean up progress tracking resources
   */
  cleanup(): void;

  /**
   * Estimate completion time
   */
  estimateCompletion(): Date | null;

  /**
   * Force an immediate progress update (bypassing throttling)
   */
  forceUpdate(): void;

  /**
   * Get current progress state
   */
  getState(): ProgressState;

  /**
   * Initialize progress tracking for a benchmark run
   */
  initialize(run: BenchmarkRun): void;

  /**
   * Register a callback for progress updates
   */
  onProgress(callback: (state: ProgressState) => void): void;

  /**
   * Update progress state
   */
  update(state: Partial<ProgressState>): void;
}

/**
 * Progress tracking state
 */
export interface ProgressState {
  /** Current file being processed */
  readonly currentFile?: string;
  /** Current suite being processed */
  readonly currentSuite?: string;
  /** Current task being processed */
  readonly currentTask?: string;
  /** Elapsed time in milliseconds */
  readonly elapsed: number;
  /** Number of files completed */
  readonly filesCompleted: number;
  /** Progress percentage (0-100) */
  readonly percentage: number;
  /** Number of suites completed */
  readonly suitesCompleted: number;
  /** Number of tasks completed */
  readonly tasksCompleted: number;
  /** Total number of files */
  readonly totalFiles: number;
  /** Total number of suites */
  readonly totalSuites: number;
  /** Total number of tasks */
  readonly totalTasks: number;
}

/**
 * Base reporter interface for benchmark output
 */
export interface Reporter {
  /**
   * Called when benchmark run completes
   */
  onEnd(run: BenchmarkRun): Promise<void> | void;

  /**
   * Called when an error occurs
   */
  onError(error: Error): Promise<void> | void;

  /**
   * Called when a file completes
   */
  onFileEnd(result: FileResult): Promise<void> | void;

  /**
   * Called when a file starts execution
   */
  onFileStart(file: string): Promise<void> | void;

  /**
   * Called for progress updates
   */
  onProgress(state: ProgressState): Promise<void> | void;

  /**
   * Called when benchmark run starts
   */
  onStart(run: BenchmarkRun): Promise<void> | void;

  /**
   * Called when a suite completes
   */
  onSuiteEnd(result: SuiteResult): Promise<void> | void;

  /**
   * Called when a suite starts execution
   */
  onSuiteStart(suite: string): Promise<void> | void;

  /**
   * Called when a task completes
   */
  onTaskResult(result: TaskResult): Promise<void> | void;

  /**
   * Called when a task starts execution
   */
  onTaskStart(task: string): Promise<void> | void;
}

/**
 * Reporter registry interface
 */
export interface ReporterRegistry {
  /**
   * Get a reporter by name
   */
  get(name: string): Reporter | undefined;

  /**
   * Get all registered reporters
   */
  getAll(): Record<string, Reporter>;

  /**
   * Get reporters by multiple names
   */
  getByNames(names: string[]): Reporter[];

  /**
   * Register a reporter
   */
  register(name: string, reporter: Reporter): void;
}

/**
 * Retention policy for historical data
 */
export interface RetentionPolicy {
  /** Maximum age of data to keep */
  readonly maxAge?: number;
  /** Maximum number of runs to keep */
  readonly maxRuns?: number;
  /** Maximum size of history data in bytes */
  readonly maxSize?: number;
}

/**
 * Configuration for a benchmark run execution
 */
export interface RunConfiguration extends Partial<ModestBenchConfig> {
  /** Working directory for execution */
  readonly cwd?: string;
  /** Environment variables to set */
  readonly env?: Record<string, string>;
  /** Files to execute (overrides pattern discovery) */
  readonly files?: string[];
}

/**
 * A validation error
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  readonly code: string;
  /** Column number where error occurred */
  readonly column?: number;
  /** File where error occurred */
  readonly file: string;
  /** Line number where error occurred */
  readonly line?: number;
  /** Error message */
  readonly message: string;
  /** Severity level */
  readonly severity: 'error' | 'warning';
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Validation errors found */
  readonly errors: ValidationError[];
  /** Files that were validated */
  readonly files: string[];
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validation warnings */
  readonly warnings: ValidationWarning[];
}

/**
 * A validation warning
 */
export interface ValidationWarning extends ValidationError {
  readonly severity: 'warning';
}
