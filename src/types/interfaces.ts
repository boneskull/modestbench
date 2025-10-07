/**
 * ModestBench Interface Types
 *
 * Defines the contract interfaces for all major components in the ModestBench system.
 * These interfaces establish the public APIs that implementations must satisfy.
 */

import type {
  BenchmarkRun,
  ModestBenchConfig,
  TaskResult,
  SuiteResult,
  FileResult,
} from './core.js';

/**
 * Configuration for a benchmark run execution
 */
export interface RunConfiguration extends Partial<ModestBenchConfig> {
  /** Files to execute (overrides pattern discovery) */
  readonly files?: string[];
  /** Working directory for execution */
  readonly cwd?: string;
  /** Environment variables to set */
  readonly env?: Record<string, string>;
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validation errors found */
  readonly errors: ValidationError[];
  /** Validation warnings */
  readonly warnings: ValidationWarning[];
  /** Files that were validated */
  readonly files: string[];
}

/**
 * A validation error
 */
export interface ValidationError {
  /** File where error occurred */
  readonly file: string;
  /** Line number where error occurred */
  readonly line?: number;
  /** Column number where error occurred */
  readonly column?: number;
  /** Error message */
  readonly message: string;
  /** Error code for programmatic handling */
  readonly code: string;
  /** Severity level */
  readonly severity: 'error' | 'warning';
}

/**
 * A validation warning
 */
export interface ValidationWarning extends ValidationError {
  readonly severity: 'warning';
}

/**
 * Main benchmark engine interface
 */
export interface BenchmarkEngine {
  /**
   * Execute benchmarks with the given configuration
   */
  execute(config: RunConfiguration): Promise<BenchmarkRun>;

  /**
   * Validate benchmark files
   */
  validate(files: string[]): Promise<ValidationResult>;

  /**
   * Discover benchmark files matching patterns
   */
  discover(pattern: string, exclude?: string[]): Promise<string[]>;

  /**
   * Register a reporter for benchmark output
   */
  registerReporter(name: string, reporter: Reporter): void;

  /**
   * Get all registered reporters
   */
  getReporters(): Record<string, Reporter>;
}

/**
 * Configuration management interface
 */
export interface ConfigurationManager {
  /**
   * Load configuration from various sources
   */
  load(
    configPath?: string,
    cliArgs?: Record<string, unknown>
  ): Promise<ModestBenchConfig>;

  /**
   * Validate a configuration object
   */
  validate(config: Partial<ModestBenchConfig>): ValidationResult;

  /**
   * Merge multiple configuration objects with precedence
   */
  merge(...configs: Partial<ModestBenchConfig>[]): ModestBenchConfig;

  /**
   * Get default configuration values
   */
  getDefaults(): ModestBenchConfig;
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
  /** Number of files completed */
  readonly filesCompleted: number;
  /** Total number of files */
  readonly totalFiles: number;
  /** Number of suites completed */
  readonly suitesCompleted: number;
  /** Total number of suites */
  readonly totalSuites: number;
  /** Number of tasks completed */
  readonly tasksCompleted: number;
  /** Total number of tasks */
  readonly totalTasks: number;
  /** Elapsed time in milliseconds */
  readonly elapsed: number;
  /** Progress percentage (0-100) */
  readonly percentage: number;
}

/**
 * Progress management interface
 */
export interface ProgressManager {
  /**
   * Initialize progress tracking for a benchmark run
   */
  initialize(run: BenchmarkRun): void;

  /**
   * Update progress state
   */
  update(state: Partial<ProgressState>): void;

  /**
   * Get current progress state
   */
  getState(): ProgressState;

  /**
   * Estimate completion time
   */
  estimateCompletion(): Date | null;

  /**
   * Register a callback for progress updates
   */
  onProgress(callback: (state: ProgressState) => void): void;

  /**
   * Clean up progress tracking resources
   */
  cleanup(): void;
}

/**
 * Base reporter interface for benchmark output
 */
export interface Reporter {
  /**
   * Called when benchmark run starts
   */
  onStart(run: BenchmarkRun): void | Promise<void>;

  /**
   * Called when a file starts execution
   */
  onFileStart(file: string): void | Promise<void>;

  /**
   * Called when a suite starts execution
   */
  onSuiteStart(suite: string): void | Promise<void>;

  /**
   * Called when a task starts execution
   */
  onTaskStart(task: string): void | Promise<void>;

  /**
   * Called when a task completes
   */
  onTaskResult(result: TaskResult): void | Promise<void>;

  /**
   * Called when a suite completes
   */
  onSuiteEnd(result: SuiteResult): void | Promise<void>;

  /**
   * Called when a file completes
   */
  onFileEnd(result: FileResult): void | Promise<void>;

  /**
   * Called when benchmark run completes
   */
  onEnd(run: BenchmarkRun): void | Promise<void>;

  /**
   * Called for progress updates
   */
  onProgress(state: ProgressState): void | Promise<void>;

  /**
   * Called when an error occurs
   */
  onError(error: Error): void | Promise<void>;
}

/**
 * Human-readable reporter interface
 */
export interface HumanReporter extends Reporter {
  /** Uses colors and formatting for terminal output */
  readonly supportsColor: boolean;
  /** Displays progress bars */
  readonly showProgress: boolean;
}

/**
 * JSON output reporter interface
 */
export interface JsonReporter extends Reporter {
  /** Supports streaming output */
  readonly streaming: boolean;
  /** Pretty-print JSON output */
  readonly prettyPrint: boolean;
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
 * Reporter registry interface
 */
export interface ReporterRegistry {
  /**
   * Register a reporter
   */
  register(name: string, reporter: Reporter): void;

  /**
   * Get a reporter by name
   */
  get(name: string): Reporter | undefined;

  /**
   * Get all registered reporters
   */
  getAll(): Record<string, Reporter>;
}

/**
 * Query interface for historical benchmark data
 */
export interface HistoryQuery {
  /** Start date for filtering */
  readonly since?: Date;
  /** End date for filtering */
  readonly until?: Date;
  /** Pattern to match benchmark names */
  readonly pattern?: string;
  /** Tags to filter by */
  readonly tags?: string[];
  /** Maximum number of results */
  readonly limit?: number;
  /** Results offset for pagination */
  readonly offset?: number;
  /** Sort order */
  readonly sort?: 'asc' | 'desc';
  /** Field to sort by */
  readonly sortBy?: 'date' | 'duration' | 'name';
}

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
  /** Number of runs removed */
  readonly removedRuns: number;
  /** Amount of disk space freed in bytes */
  readonly freedBytes: number;
  /** Files that were removed */
  readonly removedFiles: string[];
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
 * Historical data storage interface
 */
export interface HistoryStorage {
  /**
   * Save a benchmark run to storage
   */
  saveRun(run: BenchmarkRun): Promise<void>;

  /**
   * Load a specific benchmark run
   */
  loadRun(id: string): Promise<BenchmarkRun | null>;

  /**
   * Query historical runs
   */
  queryRuns(query: HistoryQuery): Promise<BenchmarkRun[]>;

  /**
   * Get index of all stored runs
   */
  getIndex(): Promise<Array<{ id: string; date: Date; summary: string }>>;

  /**
   * Clean up old data according to retention policy
   */
  cleanup(policy: RetentionPolicy): Promise<CleanupResult>;

  /**
   * Export historical data
   */
  export(format: 'json' | 'csv', query?: HistoryQuery): Promise<string>;
}
