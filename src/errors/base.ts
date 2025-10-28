/**
 * ModestBench Custom Error System
 *
 * Base error classes providing structured error handling with error codes,
 * documentation URLs, and consistent error display.
 */

/**
 * Base URL for error documentation
 */
const ERROR_DOC_BASE_URL =
  'https://boneskull.github.io/modestbench/reference/errors';

/**
 * Abstract base class for ModestBench aggregate errors
 *
 * Extends AggregateError to support multiple errors with ModestBench error
 * system features.
 */
export abstract class ModestBenchAggregateError extends AggregateError {
  /**
   * Unique error code for this error type Must be in format:
   * ERR_MB_CATEGORY_DESCRIPTION
   */
  abstract readonly code: string;

  /**
   * Error name (matches class name)
   */
  public override readonly name: string;

  /**
   * Create a new ModestBench aggregate error
   *
   * @param errors - Array of errors that occurred
   * @param message - Human-readable error message
   * @param options - Optional Error options (e.g., cause)
   */
  constructor(errors: unknown[], message: string, options?: ErrorOptions) {
    super(errors, message, options);
    this.name = this.constructor.name;
  }

  /**
   * Get the documentation URL for this error
   *
   * Returns a URL to the error reference page with an anchor to the specific
   * error.
   *
   * @returns Documentation URL
   */
  getDocUrl(): string {
    // Use the error class name as the anchor (e.g., ConfigValidationError -> #configvalidationerror)
    const anchor = this.name.toLowerCase();
    return `${ERROR_DOC_BASE_URL}#${anchor}`;
  }

  /**
   * Convert error to string with code, documentation URL, and nested errors
   *
   * @returns Formatted error string
   */
  override toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}\n`;
    result += `See: ${this.getDocUrl()}\n`;

    if (this.errors.length > 0) {
      result += `\nContains ${this.errors.length} error(s):\n`;
      this.errors.forEach((err, index) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        result += `  ${index + 1}. ${errMsg}\n`;
      });
    }

    return result;
  }
}

/**
 * Abstract base class for all ModestBench errors
 *
 * Provides:
 *
 * - Unique error codes with ERR_MB_ prefix
 * - Documentation URL generation
 * - Consistent error display format
 * - TypeScript type safety
 */
export abstract class ModestBenchError extends Error {
  /**
   * Unique error code for this error type Must be in format:
   * ERR_MB_CATEGORY_DESCRIPTION
   */
  abstract readonly code: string;

  /**
   * Error name (matches class name)
   */
  public override readonly name: string;

  /**
   * Create a new ModestBench error
   *
   * @param message - Human-readable error message
   * @param options - Optional Error options (e.g., cause)
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  /**
   * Get the documentation URL for this error
   *
   * Returns a URL to the error reference page with an anchor to the specific
   * error.
   *
   * @returns Documentation URL
   */
  getDocUrl(): string {
    // Use the error class name as the anchor (e.g., ConfigValidationError -> #configvalidationerror)
    const anchor = this.name.toLowerCase();
    return `${ERROR_DOC_BASE_URL}#${anchor}`;
  }

  /**
   * Convert error to string with code and documentation URL
   *
   * @returns Formatted error string
   */
  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}\nSee: ${this.getDocUrl()}`;
  }
}

/**
 * Type guard to check if an error is a ModestBench error
 *
 * @param error - The error to check
 * @returns True if the error is a ModestBench error
 */
export const isModestBenchError = (
  error: unknown,
): error is ModestBenchError => {
  return (
    isError(error) &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('ERR_MB_')
  );
};

/**
 * Type guard to check if an error is a standard Error
 *
 * @param error - The error to check
 * @returns `true` if the error is an `Error`
 */
export const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};
