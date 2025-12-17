/**
 * Performance budget types for benchmark thresholds
 *
 * @module types/budgets
 */

/**
 * Absolute performance budgets (time-based)
 */
export interface AbsoluteBudget {
  /** Maximum 99th percentile in nanoseconds */
  readonly maxP99?: number;

  /** Maximum mean execution time in nanoseconds */
  readonly maxTime?: number;

  /** Minimum operations per second */
  readonly minOpsPerSec?: number;
}

/**
 * Named baseline reference
 */
export interface BaselineReference {
  /** Git branch (if available) */
  readonly branch?: string;

  /** Git commit (if available) */
  readonly commit?: string;

  /** Date baseline was created */
  readonly date: Date;

  /** Baseline name */
  readonly name: string;

  /** Run ID this baseline points to */
  readonly runId: RunId;

  /** Summary of benchmark results for quick comparison */
  readonly summary: Record<TaskId, BaselineSummaryData>;
}

/**
 * Baseline storage file format
 */
export interface BaselineStorage {
  /** Named baselines */
  readonly baselines: Record<string, BaselineReference>;

  /** Default baseline name (optional) */
  readonly default?: string;

  /** Schema version */
  readonly version: string;
}

/**
 * Baseline summary data for a single task
 */
export interface BaselineSummaryData {
  /** Mean execution time in nanoseconds */
  readonly mean: number;

  /** Operations per second */
  readonly opsPerSecond: number;

  /** 99th percentile (if available) */
  readonly p99?: number;
}

/**
 * Complete budget definition
 */
export interface Budget {
  /** Absolute thresholds */
  readonly absolute?: AbsoluteBudget;

  /** Relative thresholds */
  readonly relative?: RelativeBudget;
}

/**
 * A budget pattern with glob support for files and simple wildcards for
 * suite/task
 *
 * File patterns use minimatch glob syntax (e.g., `**\/*.bench.js`). Suite/task
 * patterns use simple `*` wildcard (matches any value).
 */
export interface BudgetPattern {
  /** The budget to apply when this pattern matches */
  readonly budget: Budget;

  /** Glob pattern for file matching (minimatch syntax) */
  readonly filePattern: string;

  /** Computed specificity score (higher = more specific) */
  readonly specificity: number;

  /** Suite name or `*` for wildcard */
  readonly suitePattern: string;

  /** Task name or `*` for wildcard */
  readonly taskPattern: string;
}

/**
 * Budget evaluation result for a single task
 */
export interface BudgetResult {
  /** Actual measured values */
  readonly actual: {
    readonly mean: number;
    readonly opsPerSecond: number;
    readonly p99?: number;
  };

  /** Baseline values (if relative budget) */
  readonly baseline?: {
    readonly mean: number;
    readonly opsPerSecond: number;
    readonly p99?: number;
  };

  /** Budget that was checked */
  readonly budget: Budget;

  /** Whether budget passed */
  readonly passed: boolean;

  /** Task identifier (file/suite/task) */
  readonly taskId: TaskId;

  /** Violations (what thresholds were exceeded) */
  readonly violations: BudgetViolation[];
}

/**
 * Budget evaluation summary for entire run
 */
export interface BudgetSummary {
  /** Number failed */
  readonly failed: number;

  /** Number passed */
  readonly passed: number;

  /** Individual results */
  readonly results: BudgetResult[];

  /** Total budgets checked */
  readonly total: number;
}

/**
 * Specific budget violation
 */
export interface BudgetViolation {
  /** Actual measured value */
  readonly actual: number;

  /** How much over/under threshold (as decimal, e.g., 0.15 = 15% over) */
  readonly delta: number;

  /** Human-readable message */
  readonly message: string;

  /** Expected threshold */
  readonly threshold: number;

  /** Type of budget that was violated */
  readonly type: 'maxP99' | 'maxRegression' | 'maxTime' | 'minOpsPerSec';
}

/**
 * Relative performance budgets (comparison-based)
 */
export interface RelativeBudget {
  /** Name of baseline to compare against */
  readonly baseline?: string;

  /** Maximum performance regression as decimal (0.10 = 10%) */
  readonly maxRegression?: number;
}

/**
 * Resolved budgets structure with exact matches and patterns separated
 *
 * During evaluation, exact matches are checked first, then patterns are matched
 * in order of specificity (highest first).
 */
export interface ResolvedBudgets {
  /** Exact TaskId matches (no wildcards or globs) */
  readonly exact: Record<string, Budget>;

  /** Patterns with wildcards/globs, sorted by specificity descending */
  readonly patterns: readonly BudgetPattern[];
}

/**
 * Branded type for benchmark run identifiers
 *
 * RunId is a 7-character alphanumeric string that uniquely identifies a
 * benchmark run. Using a branded type prevents accidental mixing with regular
 * strings or TaskIds.
 */
export type RunId = string & { readonly __brand: 'RunId' };

/**
 * Branded type for task identifiers
 *
 * TaskId follows the format: `{filePath}/{suiteName}/{taskName}` Example:
 * `benchmarks/array.bench.js/Array Operations/Array.push()`
 *
 * Using a branded type prevents accidental mixing with regular strings or
 * RunIds.
 */
export type TaskId = string & { readonly __brand: 'TaskId' };
