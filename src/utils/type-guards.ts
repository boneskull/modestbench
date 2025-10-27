/**
 * Type Guard Utilities
 *
 * Reusable type guard functions for runtime type checking and narrowing.
 */

/**
 * Type guard to check if a value is an object (not null or array)
 *
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard to check if a value is an Error instance
 *
 * @param value - Value to check
 * @returns True if value is an Error
 */
export const isError = (value: unknown): value is Error => {
  return value instanceof Error;
};

/**
 * Type guard to check if a value has a specific property
 *
 * @param value - Value to check
 * @param property - Property name to check for
 * @returns True if value is an object with the specified property
 */
const hasProperty = <K extends string>(
  value: unknown,
  property: K,
): value is Record<K, unknown> => {
  return isObject(value) && property in value;
};

/**
 * Type guard to check if an error has a code property
 *
 * @param error - Error to check
 * @returns True if error has a code property
 */
export const hasErrorCode = (
  error: unknown,
): error is Error & { code: string } => {
  return isError(error) && hasProperty(error, 'code');
};
