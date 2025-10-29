/**
 * Profiler Types
 *
 * Type definitions for the profile command, including configuration options,
 * profiled function data, and filtering results.
 *
 * @packageDocumentation
 */

/**
 * Filtered profile data ready for reporting
 */
export interface FilteredProfileData {
  /** Command that was profiled */
  command?: string;

  /** Duration of profiled execution (ms) */
  duration?: number;

  /** Filtered and sorted functions */
  functions: ProfiledFunction[];

  /** Grouped by file (if requested) */
  groupedByFile?: Map<string, ProfiledFunction[]>;

  /** Minimum execution percentage threshold used */
  minExecutionPercent: number;

  /** Profile summary */
  summary: ProfileSummary;

  /** Total functions before filtering */
  totalFiltered: number;

  /** Number of functions shown */
  totalShown: number;

  /** Total CPU ticks */
  totalTicks: number;
}

/**
 * Profile command configuration
 */
export interface ProfileConfig {
  /** Command to profile (e.g., "npm test") */
  command?: string;

  /** Patterns to exclude */
  exclude?: string[];

  /** Explicit patterns to focus on */
  focus?: string[];

  /** Group results by file */
  groupByFile?: boolean;

  /** Path to existing *.cpuprofile file */
  input?: string;

  /** Minimum call count to show */
  minCallCount?: number;

  /** Minimum execution percentage to show (default: 0.5) */
  minExecutionPercent?: number;

  /** Output file path */
  outputFile?: string;

  /** Smart detection: only show functions from your package */
  smartDetection?: boolean;

  /** Number of top functions to show (default: 25) */
  topN?: number;
}

/**
 * A profiled JavaScript function
 */
export interface ProfiledFunction {
  /** Function category */
  category: 'C++' | 'GC' | 'JavaScript' | 'Unknown';

  /** File path */
  file: string;

  /** Line number (if available) */
  line: null | number;

  /** Function name */
  name: string;

  /** Percentage of total execution time */
  percentage: number;

  /** CPU ticks in this function */
  ticks: number;
}

/**
 * Profile execution summary
 */
export interface ProfileSummary {
  /** C++ ticks */
  cppTicks: number;

  /** Garbage collection ticks */
  gcTicks: number;

  /** JavaScript ticks */
  javascriptTicks: number;

  /** Shared library ticks */
  sharedLibraryTicks: number;

  /** Total CPU ticks */
  totalTicks: number;
}

/**
 * Raw profile data from V8 profiler
 */
export interface RawProfileData {
  /** All profiled functions */
  functions: ProfiledFunction[];

  /** Path to log file */
  logPath: string;

  /** Profile summary */
  summary: ProfileSummary;

  /** Total CPU ticks */
  totalTicks: number;
}
