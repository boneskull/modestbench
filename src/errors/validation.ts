/**
 * Validation-related errors
 *
 * Errors that occur during benchmark file structure and data validation.
 */

import { ModestBenchError } from './base.js';

/**
 * Schema validation failed
 *
 * Thrown when data fails to validate against a Zod schema or other schema
 * validation.
 */
export class SchemaValidationError extends ModestBenchError {
  readonly code = 'ERR_MB_VALIDATION_SCHEMA_FAILED';
}

/**
 * Invalid benchmark structure
 *
 * Thrown when a benchmark file has an invalid or unexpected structure.
 */
export class StructureValidationError extends ModestBenchError {
  readonly code = 'ERR_MB_VALIDATION_STRUCTURE_INVALID';
}

/**
 * Type validation failed
 *
 * Thrown when data fails type validation checks.
 */
export class TypeValidationError extends ModestBenchError {
  readonly code = 'ERR_MB_VALIDATION_TYPE_FAILED';
}
