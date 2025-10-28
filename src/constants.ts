import { type Engine } from './types/cli.js';

/**
 * Supported benchmark file extensions
 */
export const BENCHMARK_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.mjs',
  '.mts',
  '.ts',
]);

/**
 * Glob pattern fragment for benchmark file extensions. Example:
 * ".bench.{js,mjs,cjs,ts,mts,cts}"
 */
export const BENCHMARK_FILE_PATTERN = `.bench.{${Array.from(
  BENCHMARK_FILE_EXTENSIONS,
)
  .map((ext) => ext.slice(1))
  .join(',')}}`;

/**
 * Timeout before we force-quit when aborting benchmarks (ms)
 */
export const ABORT_TIMEOUT = 500;

/**
 * Exit codes for the CLI
 */
export const ExitCodes = {
  BENCHMARK_FAILURES: 1,
  CONFIG_ERROR: 2,
  DISCOVERY_ERROR: 3,
  RUNTIME_ERROR: 5,
  SUCCESS: 0,
  UNKNOWN_ERROR: 99,
  VALIDATION_ERROR: 4,
} as const;

/**
 * Supported benchmark engines
 */
export const Engines = {
  ACCURATE: 'accurate',
  TINYBENCH: 'tinybench',
} as const satisfies Record<string, Engine>;

/**
 * Default benchmark engine
 */
export const DEFAULT_ENGINE = Engines.TINYBENCH;

/**
 * Supported reporters
 */
export const Reporters = {
  CSV: 'csv',
  HUMAN: 'human',
  JSON: 'json',
  SIMPLE: 'simple',
} as const;

/**
 * Default reporter
 */
export const DEFAULT_REPORTER = Reporters.HUMAN;

/**
 * Error codes for all ModestBench errors
 *
 * Use these constants to check error types instead of instanceof checks.
 */
export const ErrorCodes = {
  //#region budget-errors
  BUDGET_EXCEEDED: 'ERR_MB_BUDGET_EXCEEDED',
  //#region cli-errors
  CLI_INVALID_ARGUMENT: 'ERR_MB_CLI_INVALID_ARGUMENT',
  //#endregion

  CLI_INVALID_DATE_FORMAT: 'ERR_MB_CLI_INVALID_DATE_FORMAT',
  //#region config-errors
  CONFIG_LOAD_FAILED: 'ERR_MB_CONFIG_LOAD_FAILED',
  CONFIG_NOT_FOUND: 'ERR_MB_CONFIG_NOT_FOUND',
  CONFIG_UNSUPPORTED_FORMAT: 'ERR_MB_CONFIG_UNSUPPORTED_FORMAT',
  //#endregion

  CONFIG_VALIDATION_FAILED: 'ERR_MB_CONFIG_VALIDATION_FAILED',
  //#endregion

  //#region execution-errors
  EXECUTION_BENCHMARK_FAILED: 'ERR_MB_EXECUTION_BENCHMARK_FAILED',
  EXECUTION_SETUP_FAILED: 'ERR_MB_EXECUTION_SETUP_FAILED',
  EXECUTION_TASK_FAILED: 'ERR_MB_EXECUTION_TASK_FAILED',
  EXECUTION_TEARDOWN_FAILED: 'ERR_MB_EXECUTION_TEARDOWN_FAILED',
  EXECUTION_TIMEOUT: 'ERR_MB_EXECUTION_TIMEOUT',
  EXECUTION_TOO_FAST: 'ERR_MB_EXECUTION_TOO_FAST',
  //#endregion

  //#region file-errors
  FILE_DISCOVERY_FAILED: 'ERR_MB_FILE_DISCOVERY_FAILED',
  FILE_LOAD_FAILED: 'ERR_MB_FILE_LOAD_FAILED',
  FILE_NOT_FOUND: 'ERR_MB_FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED: 'ERR_MB_FILE_PERMISSION_DENIED',
  FILE_UNSUPPORTED_EXTENSION: 'ERR_MB_FILE_UNSUPPORTED_EXTENSION',
  //#endregion

  //#region reporter-errors
  REPORTER_ALREADY_REGISTERED: 'ERR_MB_REPORTER_ALREADY_REGISTERED',
  REPORTER_OUTPUT_FAILED: 'ERR_MB_REPORTER_OUTPUT_FAILED',
  REPORTER_UNKNOWN: 'ERR_MB_REPORTER_UNKNOWN',
  //#endregion

  //#region storage-errors
  STORAGE_CORRUPTION: 'ERR_MB_STORAGE_CORRUPTION',
  STORAGE_EXPORT_UNSUPPORTED: 'ERR_MB_STORAGE_EXPORT_UNSUPPORTED',
  STORAGE_FAILED: 'ERR_MB_STORAGE_FAILED',
  STORAGE_INDEX_CORRUPTION: 'ERR_MB_STORAGE_INDEX_CORRUPTION',
  STORAGE_INSUFFICIENT_SPACE: 'ERR_MB_STORAGE_INSUFFICIENT_SPACE',
  //#endregion

  //#region misc-errors
  UNKNOWN: 'ERR_MB_UNKNOWN',
  //#endregion

  //#region validation-errors
  VALIDATION_SCHEMA_FAILED: 'ERR_MB_VALIDATION_SCHEMA_FAILED',
  VALIDATION_STRUCTURE_INVALID: 'ERR_MB_VALIDATION_STRUCTURE_INVALID',
  VALIDATION_TYPE_FAILED: 'ERR_MB_VALIDATION_TYPE_FAILED',
  //#endregion
} as const;
