/**
 * CLI-related errors
 *
 * Errors that occur during command-line interface operations.
 */

import { ModestBenchError } from './base.js';

/**
 * Invalid CLI argument
 *
 * Thrown when a CLI argument is invalid or cannot be parsed.
 */
export class InvalidArgumentError extends ModestBenchError {
  readonly code = 'ERR_MB_CLI_INVALID_ARGUMENT';
}

/**
 * Invalid date format
 *
 * Thrown when a date string cannot be parsed into a valid date.
 */
export class InvalidDateFormatError extends ModestBenchError {
  readonly code = 'ERR_MB_CLI_INVALID_DATE_FORMAT';
}

/**
 * Unknown error
 *
 * Thrown at the CLI boundary to wrap unexpected errors that are not ModestBench
 * errors. This ensures all errors have proper structure and documentation
 * links.
 */
export class UnknownError extends ModestBenchError {
  readonly code = 'ERR_MB_UNKNOWN';

  /**
   * Create a new UnknownError wrapping an unexpected error
   *
   * @param message - The error message (typically from the original error)
   * @param options - Error options with the original error as the cause
   */
  constructor(message: string, options: ErrorOptions) {
    super(message, options);
  }

  /**
   * Override toString to show full details of the wrapped error
   */
  override toString(): string {
    let result = super.toString();

    if (this.cause instanceof Error && this.cause.stack) {
      result += '\n\nOriginal error:\n' + this.cause.stack;
    }

    return result;
  }
}
