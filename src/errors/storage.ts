/**
 * Storage-related errors
 *
 * Errors that occur during history storage operations.
 */

import { ModestBenchError } from './base.js';

/**
 * Storage data corruption
 *
 * Thrown when stored data is found to be corrupted or invalid.
 */
export class StorageCorruptionError extends ModestBenchError {
  readonly code = 'ERR_MB_STORAGE_CORRUPTION';
}

/**
 * Storage operation failed
 *
 * Thrown when a general storage operation fails.
 */
export class StorageError extends ModestBenchError {
  readonly code = 'ERR_MB_STORAGE_FAILED';
}

/**
 * Storage index corruption
 *
 * Thrown when the storage index is corrupted or cannot be read.
 */
export class StorageIndexError extends ModestBenchError {
  readonly code = 'ERR_MB_STORAGE_INDEX_CORRUPTION';
}

/**
 * Insufficient storage space
 *
 * Thrown when there is insufficient disk space for storage operations.
 */
export class StorageSpaceError extends ModestBenchError {
  readonly code = 'ERR_MB_STORAGE_INSUFFICIENT_SPACE';
}

/**
 * Unsupported export format
 *
 * Thrown when attempting to export data in an unsupported format.
 */
export class UnsupportedExportFormatError extends ModestBenchError {
  readonly code = 'ERR_MB_STORAGE_EXPORT_UNSUPPORTED';
}
