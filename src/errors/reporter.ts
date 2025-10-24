/**
 * Reporter-related errors
 *
 * Errors that occur during reporter operations.
 */

import { ModestBenchError } from './base.js';

/**
 * Reporter already registered
 *
 * Thrown when attempting to register a reporter with a name that is already in
 * use.
 */
export class ReporterAlreadyRegisteredError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_ALREADY_REGISTERED';
}

/**
 * Reporter output failed
 *
 * Thrown when a reporter fails to write output.
 */
export class ReporterOutputError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_OUTPUT_FAILED';
}

/**
 * Unknown reporter
 *
 * Thrown when attempting to use a reporter that is not registered.
 */
export class UnknownReporterError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_UNKNOWN';
}
