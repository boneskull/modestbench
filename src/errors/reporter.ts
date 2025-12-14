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
 * Reporter load failed
 *
 * Thrown when a reporter module cannot be loaded (file not found, syntax error,
 * invalid module format, etc.).
 */
export class ReporterLoadError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_LOAD_FAILED';

  /**
   * The specifier (file path or package name) that failed to load
   */
  readonly specifier: string;

  constructor(message: string, specifier: string, options?: ErrorOptions) {
    super(`Failed to load reporter "${specifier}": ${message}`, options);
    this.specifier = specifier;
  }
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
 * Reporter validation failed
 *
 * Thrown when a loaded module does not implement the required Reporter
 * interface methods.
 */
export class ReporterValidationError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_INVALID';

  /**
   * The methods that are missing from the reporter
   */
  readonly missingMethods: string[];

  /**
   * The specifier (file path or package name) of the invalid reporter
   */
  readonly specifier: string;

  constructor(
    message: string,
    specifier: string,
    missingMethods: string[] = [],
    options?: ErrorOptions,
  ) {
    const methodsInfo =
      missingMethods.length > 0
        ? ` Missing required methods: ${missingMethods.join(', ')}.`
        : '';
    super(`Invalid reporter "${specifier}": ${message}${methodsInfo}`, options);
    this.specifier = specifier;
    this.missingMethods = missingMethods;
  }
}

/**
 * Unknown reporter
 *
 * Thrown when attempting to use a reporter that is not registered.
 */
export class UnknownReporterError extends ModestBenchError {
  readonly code = 'ERR_MB_REPORTER_UNKNOWN';
}
