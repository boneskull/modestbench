import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import {
  BenchmarkExecutionError,
  ConfigLoadError,
  ConfigNotFoundError,
  ConfigValidationError,
  FileDiscoveryError,
  FileLoadError,
  FileNotFoundError,
  FilePermissionError,
  InvalidArgumentError,
  InvalidDateFormatError,
  ModestBenchAggregateError,
  ModestBenchError,
  OperationTooFastError,
  ReporterAlreadyRegisteredError,
  ReporterOutputError,
  SchemaValidationError,
  SetupError,
  StorageCorruptionError,
  StorageError,
  StorageIndexError,
  StorageSpaceError,
  StructureValidationError,
  TaskExecutionError,
  TeardownError,
  TimeoutError,
  TypeValidationError,
  UnknownError,
  UnknownReporterError,
  UnsupportedConfigFormatError,
  UnsupportedExportFormatError,
  UnsupportedFileExtensionError,
} from '../../src/errors/index.js';

describe('ModestBenchError base class', () => {
  // Create a concrete implementation for testing
  class TestError extends ModestBenchError {
    readonly code = 'ERR_MB_TEST_ERROR';
  }

  it('should set name property to constructor name', () => {
    const error = new TestError('Test message');
    expect(error.name, 'to equal', 'TestError');
  });

  it('should set message property', () => {
    const error = new TestError('Test message');
    expect(error.message, 'to equal', 'Test message');
  });

  it('should have correct error code', () => {
    const error = new TestError('Test message');
    expect(error.code, 'to equal', 'ERR_MB_TEST_ERROR');
  });

  it('should generate documentation URL from error class name', () => {
    const error = new TestError('Test message');
    const url = error.getDocUrl();
    expect(
      url,
      'to equal',
      'https://modestbench.dev/reference/errors#testerror',
    );
  });

  it('should include code and URL in toString()', () => {
    const error = new TestError('Test message');
    const str = error.toString();
    expect(str, 'to contain', 'TestError');
    expect(str, 'to contain', '[ERR_MB_TEST_ERROR]');
    expect(str, 'to contain', 'Test message');
    expect(
      str,
      'to contain',
      'https://modestbench.dev/reference/errors#testerror',
    );
  });

  it('should support error cause chaining', () => {
    const originalError = new Error('Original error');
    const error = new TestError('Test message', { cause: originalError });
    expect(error.cause, 'to equal', originalError);
  });

  it('should be instanceof Error', () => {
    const error = new TestError('Test message');
    expect(error, 'to be an', Error);
  });

  it('should be instanceof ModestBenchError', () => {
    const error = new TestError('Test message');
    // @ts-expect-error - https://github.com/boneskull/bupkis/pull/549
    expect(error, 'to be a', ModestBenchError);
  });
});

describe('ModestBenchAggregateError base class', () => {
  // Create a concrete implementation for testing
  class TestAggregateError extends ModestBenchAggregateError {
    readonly code = 'ERR_MB_TEST_AGGREGATE';
  }

  it('should set name property to constructor name', () => {
    const error = new TestAggregateError([], 'Test message');
    expect(error.name, 'to equal', 'TestAggregateError');
  });

  it('should set message property', () => {
    const error = new TestAggregateError([], 'Test message');
    expect(error.message, 'to equal', 'Test message');
  });

  it('should have correct error code', () => {
    const error = new TestAggregateError([], 'Test message');
    expect(error.code, 'to equal', 'ERR_MB_TEST_AGGREGATE');
  });

  it('should store multiple errors', () => {
    const errors = [new Error('Error 1'), new Error('Error 2')];
    const error = new TestAggregateError(errors, 'Multiple errors');
    expect(error.errors, 'to have length', 2);
    expect(error.errors[0] as unknown, 'to equal', errors[0]);
    expect(error.errors[1] as unknown, 'to equal', errors[1]);
  });

  it('should generate documentation URL from error class name', () => {
    const error = new TestAggregateError([], 'Test message');
    const url = error.getDocUrl();
    expect(
      url,
      'to equal',
      'https://modestbench.dev/reference/errors#testaggregateerror',
    );
  });

  it('should include nested errors in toString()', () => {
    const errors = [new Error('Error 1'), new Error('Error 2')];
    const error = new TestAggregateError(errors, 'Multiple errors');
    const str = error.toString();
    expect(str, 'to contain', 'TestAggregateError');
    expect(str, 'to contain', '[ERR_MB_TEST_AGGREGATE]');
    expect(str, 'to contain', 'Multiple errors');
    expect(str, 'to contain', 'Contains 2 error(s)');
    expect(str, 'to contain', 'Error 1');
    expect(str, 'to contain', 'Error 2');
  });

  it('should support error cause chaining', () => {
    const originalError = new Error('Original error');
    const error = new TestAggregateError([], 'Test message', {
      cause: originalError,
    });
    expect(error.cause, 'to equal', originalError);
  });

  it('should be instanceof AggregateError', () => {
    const error = new TestAggregateError([], 'Test message');
    expect(error, 'to be an', AggregateError);
  });

  it('should be instanceof ModestBenchAggregateError', () => {
    const error = new TestAggregateError([], 'Test message');
    // @ts-expect-error - https://github.com/boneskull/bupkis/pull/549
    expect(error, 'to be a', ModestBenchAggregateError);
  });
});

describe('Configuration errors', () => {
  it('ConfigValidationError should have correct code', () => {
    const error = new ConfigValidationError('Invalid config');
    expect(error.code, 'to equal', 'ERR_MB_CONFIG_VALIDATION_FAILED');
    expect(error.getDocUrl(), 'to contain', '#configvalidationerror');
  });

  it('ConfigNotFoundError should have correct code', () => {
    const error = new ConfigNotFoundError('Config not found');
    expect(error.code, 'to equal', 'ERR_MB_CONFIG_NOT_FOUND');
    expect(error.getDocUrl(), 'to contain', '#confignotfounderror');
  });

  it('ConfigLoadError should have correct code', () => {
    const error = new ConfigLoadError('Failed to load config');
    expect(error.code, 'to equal', 'ERR_MB_CONFIG_LOAD_FAILED');
    expect(error.getDocUrl(), 'to contain', '#configloaderror');
  });

  it('UnsupportedConfigFormatError should have correct code', () => {
    const error = new UnsupportedConfigFormatError('Unsupported format');
    expect(error.code, 'to equal', 'ERR_MB_CONFIG_UNSUPPORTED_FORMAT');
    expect(error.getDocUrl(), 'to contain', '#unsupportedconfigformaterror');
  });
});

describe('File errors', () => {
  it('FileNotFoundError should have correct code', () => {
    const error = new FileNotFoundError('File not found');
    expect(error.code, 'to equal', 'ERR_MB_FILE_NOT_FOUND');
    expect(error.getDocUrl(), 'to contain', '#filenotfounderror');
  });

  it('FileDiscoveryError should have correct code', () => {
    const error = new FileDiscoveryError('Discovery failed');
    expect(error.code, 'to equal', 'ERR_MB_FILE_DISCOVERY_FAILED');
    expect(error.getDocUrl(), 'to contain', '#filediscoveryerror');
  });

  it('FileLoadError should have correct code', () => {
    const error = new FileLoadError('Load failed');
    expect(error.code, 'to equal', 'ERR_MB_FILE_LOAD_FAILED');
    expect(error.getDocUrl(), 'to contain', '#fileloaderror');
  });

  it('UnsupportedFileExtensionError should have correct code', () => {
    const error = new UnsupportedFileExtensionError('Unsupported extension');
    expect(error.code, 'to equal', 'ERR_MB_FILE_UNSUPPORTED_EXTENSION');
    expect(error.getDocUrl(), 'to contain', '#unsupportedfileextensionerror');
  });

  it('FilePermissionError should have correct code', () => {
    const error = new FilePermissionError('Permission denied');
    expect(error.code, 'to equal', 'ERR_MB_FILE_PERMISSION_DENIED');
    expect(error.getDocUrl(), 'to contain', '#filepermissionerror');
  });
});

describe('Validation errors', () => {
  it('SchemaValidationError should have correct code', () => {
    const error = new SchemaValidationError('Schema validation failed');
    expect(error.code, 'to equal', 'ERR_MB_VALIDATION_SCHEMA_FAILED');
    expect(error.getDocUrl(), 'to contain', '#schemavalidationerror');
  });

  it('StructureValidationError should have correct code', () => {
    const error = new StructureValidationError('Invalid structure');
    expect(error.code, 'to equal', 'ERR_MB_VALIDATION_STRUCTURE_INVALID');
    expect(error.getDocUrl(), 'to contain', '#structurevalidationerror');
  });

  it('TypeValidationError should have correct code', () => {
    const error = new TypeValidationError('Type validation failed');
    expect(error.code, 'to equal', 'ERR_MB_VALIDATION_TYPE_FAILED');
    expect(error.getDocUrl(), 'to contain', '#typevalidationerror');
  });
});

describe('Execution errors', () => {
  it('BenchmarkExecutionError should have correct code', () => {
    const error = new BenchmarkExecutionError('Execution failed');
    expect(error.code, 'to equal', 'ERR_MB_EXECUTION_BENCHMARK_FAILED');
    expect(error.getDocUrl(), 'to contain', '#benchmarkexecutionerror');
  });

  it('TaskExecutionError should have correct code', () => {
    const error = new TaskExecutionError('Task failed');
    expect(error.code, 'to equal', 'ERR_MB_EXECUTION_TASK_FAILED');
    expect(error.getDocUrl(), 'to contain', '#taskexecutionerror');
  });

  it('SetupError should have correct code', () => {
    const error = new SetupError('Setup failed');
    expect(error.code, 'to equal', 'ERR_MB_EXECUTION_SETUP_FAILED');
    expect(error.getDocUrl(), 'to contain', '#setuperror');
  });

  it('TeardownError should have correct code', () => {
    const error = new TeardownError('Teardown failed');
    expect(error.code, 'to equal', 'ERR_MB_EXECUTION_TEARDOWN_FAILED');
    expect(error.getDocUrl(), 'to contain', '#teardownerror');
  });

  it('TimeoutError should have correct code', () => {
    const error = new TimeoutError('Timeout exceeded');
    expect(error.code, 'to equal', 'ERR_MB_EXECUTION_TIMEOUT');
    expect(error.getDocUrl(), 'to contain', '#timeouterror');
  });

  it('OperationTooFastError should have correct code', () => {
    const error = new OperationTooFastError('Operation too fast');
    expect(error.code, 'to equal', 'ERR_MB_EXECUTION_TOO_FAST');
    expect(error.getDocUrl(), 'to contain', '#operationtoofasterror');
  });
});

describe('Storage errors', () => {
  it('StorageError should have correct code', () => {
    const error = new StorageError('Storage failed');
    expect(error.code, 'to equal', 'ERR_MB_STORAGE_FAILED');
    expect(error.getDocUrl(), 'to contain', '#storageerror');
  });

  it('StorageCorruptionError should have correct code', () => {
    const error = new StorageCorruptionError('Data corruption');
    expect(error.code, 'to equal', 'ERR_MB_STORAGE_CORRUPTION');
    expect(error.getDocUrl(), 'to contain', '#storagecorruptionerror');
  });

  it('StorageSpaceError should have correct code', () => {
    const error = new StorageSpaceError('Insufficient space');
    expect(error.code, 'to equal', 'ERR_MB_STORAGE_INSUFFICIENT_SPACE');
    expect(error.getDocUrl(), 'to contain', '#storagespaceerror');
  });

  it('StorageIndexError should have correct code', () => {
    const error = new StorageIndexError('Index corruption');
    expect(error.code, 'to equal', 'ERR_MB_STORAGE_INDEX_CORRUPTION');
    expect(error.getDocUrl(), 'to contain', '#storageindexerror');
  });

  it('UnsupportedExportFormatError should have correct code', () => {
    const error = new UnsupportedExportFormatError('Unsupported format');
    expect(error.code, 'to equal', 'ERR_MB_STORAGE_EXPORT_UNSUPPORTED');
    expect(error.getDocUrl(), 'to contain', '#unsupportedexportformaterror');
  });
});

describe('Reporter errors', () => {
  it('ReporterAlreadyRegisteredError should have correct code', () => {
    const error = new ReporterAlreadyRegisteredError('Already registered');
    expect(error.code, 'to equal', 'ERR_MB_REPORTER_ALREADY_REGISTERED');
    expect(error.getDocUrl(), 'to contain', '#reporteralreadyregisterederror');
  });

  it('UnknownReporterError should have correct code', () => {
    const error = new UnknownReporterError('Unknown reporter');
    expect(error.code, 'to equal', 'ERR_MB_REPORTER_UNKNOWN');
    expect(error.getDocUrl(), 'to contain', '#unknownreportererror');
  });

  it('ReporterOutputError should have correct code', () => {
    const error = new ReporterOutputError('Output failed');
    expect(error.code, 'to equal', 'ERR_MB_REPORTER_OUTPUT_FAILED');
    expect(error.getDocUrl(), 'to contain', '#reporteroutputerror');
  });
});

describe('CLI errors', () => {
  it('InvalidArgumentError should have correct code', () => {
    const error = new InvalidArgumentError('Invalid argument');
    expect(error.code, 'to equal', 'ERR_MB_CLI_INVALID_ARGUMENT');
    expect(error.getDocUrl(), 'to contain', '#invalidargumenterror');
  });

  it('InvalidDateFormatError should have correct code', () => {
    const error = new InvalidDateFormatError('Invalid date');
    expect(error.code, 'to equal', 'ERR_MB_CLI_INVALID_DATE_FORMAT');
    expect(error.getDocUrl(), 'to contain', '#invaliddateformaterror');
  });

  it('UnknownError should have correct code', () => {
    const originalError = new Error('Some error');
    const error = new UnknownError('Some error', { cause: originalError });
    expect(error.code, 'to equal', 'ERR_MB_UNKNOWN');
    expect(error.getDocUrl(), 'to contain', '#unknownerror');
  });

  it('UnknownError should wrap Error instances', () => {
    const originalError = new Error('Original error message');
    const error = new UnknownError('Original error message', {
      cause: originalError,
    });
    expect(error.message, 'to equal', 'Original error message');
    expect(error.cause, 'to equal', originalError);
  });

  it('UnknownError should wrap non-Error values', () => {
    const value = 'string error';
    const error = new UnknownError('string error', { cause: value });
    expect(error.message, 'to equal', 'string error');
    expect(error.cause, 'to equal', value);
  });

  it('UnknownError toString() should include original stack trace', () => {
    const originalError = new Error('Original error');
    const error = new UnknownError('Original error', { cause: originalError });
    const str = error.toString();
    expect(str, 'to contain', 'UnknownError');
    expect(str, 'to contain', '[ERR_MB_UNKNOWN]');
    expect(str, 'to contain', 'Original error:');
  });
});
