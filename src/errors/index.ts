/**
 * ModestBench Error Classes
 *
 * Custom error classes for structured error handling throughout ModestBench.
 * All errors extend ModestBenchError and include error codes and documentation
 * URLs.
 */

// Base error classes and utilities
export {
  isModestBenchError,
  ModestBenchAggregateError,
  ModestBenchError,
} from './base.js';

// CLI errors
export {
  InvalidArgumentError,
  InvalidDateFormatError,
  UnknownError,
} from './cli.js';

// Configuration errors
export {
  ConfigLoadError,
  ConfigNotFoundError,
  ConfigValidationError,
  UnsupportedConfigFormatError,
} from './configuration.js';

// Execution errors
export {
  BenchmarkExecutionError,
  OperationTooFastError,
  SetupError,
  TaskExecutionError,
  TeardownError,
  TimeoutError,
} from './execution.js';

// File errors
export {
  FileDiscoveryError,
  FileLoadError,
  FileNotFoundError,
  FilePermissionError,
  UnsupportedFileExtensionError,
} from './file.js';

// Reporter errors
export {
  ReporterAlreadyRegisteredError,
  ReporterOutputError,
  UnknownReporterError,
} from './reporter.js';

// Storage errors
export {
  StorageCorruptionError,
  StorageError,
  StorageIndexError,
  StorageSpaceError,
  UnsupportedExportFormatError,
} from './storage.js';

// Validation errors
export {
  SchemaValidationError,
  StructureValidationError,
  TypeValidationError,
} from './validation.js';
