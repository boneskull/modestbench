/**
 * Configuration-related errors
 *
 * Errors that occur during configuration file loading, parsing, and validation.
 */

import { ModestBenchError } from './base.js';

/**
 * Failed to load configuration
 *
 * Thrown when configuration loading fails for reasons other than file not found
 * (e.g., parse errors, module loading errors).
 */
export class ConfigLoadError extends ModestBenchError {
  readonly code = 'ERR_MB_CONFIG_LOAD_FAILED';
}

/**
 * Configuration file not found
 *
 * Thrown when a specified configuration file cannot be found.
 */
export class ConfigNotFoundError extends ModestBenchError {
  readonly code = 'ERR_MB_CONFIG_NOT_FOUND';
}

/**
 * Configuration validation failed
 *
 * Thrown when a configuration file or configuration options fail schema
 * validation.
 */
export class ConfigValidationError extends ModestBenchError {
  readonly code = 'ERR_MB_CONFIG_VALIDATION_FAILED';
}

/**
 * Unsupported configuration format
 *
 * Thrown when attempting to use an unsupported configuration file format.
 */
export class UnsupportedConfigFormatError extends ModestBenchError {
  readonly code = 'ERR_MB_CONFIG_UNSUPPORTED_FORMAT';
}
