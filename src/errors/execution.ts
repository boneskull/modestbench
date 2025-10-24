/**
 * Execution-related errors
 *
 * Errors that occur during benchmark execution, setup, and teardown.
 */

import { ModestBenchError } from './base.js';

/**
 * Benchmark execution failed
 *
 * Thrown when overall benchmark execution fails.
 */
export class BenchmarkExecutionError extends ModestBenchError {
  readonly code = 'ERR_MB_EXECUTION_BENCHMARK_FAILED';
}

/**
 * Operation too fast to measure
 *
 * Thrown when a benchmark operation executes so quickly that it cannot be
 * reliably measured (typically < 1ns per operation).
 */
export class OperationTooFastError extends ModestBenchError {
  readonly code = 'ERR_MB_EXECUTION_TOO_FAST';
}

/**
 * Setup function failed
 *
 * Thrown when a benchmark setup function fails.
 */
export class SetupError extends ModestBenchError {
  readonly code = 'ERR_MB_EXECUTION_SETUP_FAILED';
}

/**
 * Task execution failed
 *
 * Thrown when a specific benchmark task fails during execution.
 */
export class TaskExecutionError extends ModestBenchError {
  readonly code = 'ERR_MB_EXECUTION_TASK_FAILED';
}

/**
 * Teardown function failed
 *
 * Thrown when a benchmark teardown function fails.
 */
export class TeardownError extends ModestBenchError {
  readonly code = 'ERR_MB_EXECUTION_TEARDOWN_FAILED';
}

/**
 * Execution timeout exceeded
 *
 * Thrown when a benchmark operation exceeds the configured timeout.
 */
export class TimeoutError extends ModestBenchError {
  readonly code = 'ERR_MB_EXECUTION_TIMEOUT';
}
