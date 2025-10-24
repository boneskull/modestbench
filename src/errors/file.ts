/**
 * File-related errors
 *
 * Errors that occur during file discovery, loading, and access.
 */

import { ModestBenchError } from './base.js';

/**
 * File discovery failed
 *
 * Thrown when file discovery/glob pattern matching fails.
 */
export class FileDiscoveryError extends ModestBenchError {
  readonly code = 'ERR_MB_FILE_DISCOVERY_FAILED';
}

/**
 * Failed to load benchmark file
 *
 * Thrown when loading a benchmark file fails (e.g., import errors, syntax
 * errors).
 */
export class FileLoadError extends ModestBenchError {
  readonly code = 'ERR_MB_FILE_LOAD_FAILED';
}

/**
 * Benchmark file not found
 *
 * Thrown when a benchmark file cannot be found or does not exist.
 */
export class FileNotFoundError extends ModestBenchError {
  readonly code = 'ERR_MB_FILE_NOT_FOUND';
}

/**
 * File permission denied
 *
 * Thrown when file access is denied due to insufficient permissions.
 */
export class FilePermissionError extends ModestBenchError {
  readonly code = 'ERR_MB_FILE_PERMISSION_DENIED';
}

/**
 * Unsupported file extension
 *
 * Thrown when attempting to load a file with an unsupported extension.
 */
export class UnsupportedFileExtensionError extends ModestBenchError {
  readonly code = 'ERR_MB_FILE_UNSUPPORTED_EXTENSION';
}
