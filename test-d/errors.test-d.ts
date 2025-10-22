import {
  type ErrorContext,
  type ExecutionError,
  type ExecutionPhase,
  type ValidationError,
  type ValidationResult,
} from 'modestbench';
import { describe, it } from 'node:test';
import { expectAssignable, expectNotAssignable, expectType } from 'tsd';

describe('Error and Validation Types', () => {
  describe('ExecutionError', () => {
    it('should contain structured error information', () => {
      const error: ExecutionError = {
        code: 'ERROR_001',
        context: {
          phase: 'execution',
          timestamp: new Date(),
        },
        message: 'Test error',
        originalError: new Error('Original'),
        processedAt: new Date(),
        recoverable: true,
      };

      expectType<string>(error.message);
      expectType<string>(error.code);
      expectType<ErrorContext>(error.context);
      expectType<Error>(error.originalError);
      expectType<boolean>(error.recoverable);
      expectType<Date>(error.processedAt);
      expectType<string | undefined>(error.stack);
    });
  });

  describe('ErrorContext', () => {
    it('should provide execution context for errors', () => {
      const context: ErrorContext = {
        phase: 'execution',
        timestamp: new Date(),
      };

      expectType<ExecutionPhase>(context.phase);
      expectType<Date>(context.timestamp);
      expectType<string | undefined>(context.file);
      expectType<string | undefined>(context.suite);
      expectType<string | undefined>(context.task);
    });

    it('should support all optional context fields', () => {
      const fullContext: ErrorContext = {
        file: '/path/to/benchmark.ts',
        metadata: { custom: 'data' },
        phase: 'loading',
        suite: 'Performance Suite',
        task: 'Fast operation',
        timestamp: new Date(),
      };

      expectType<string | undefined>(fullContext.file);
      expectType<string | undefined>(fullContext.suite);
      expectType<string | undefined>(fullContext.task);
      expectType<Record<string, unknown> | undefined>(fullContext.metadata);
    });
  });

  describe('ExecutionPhase', () => {
    it('should accept all valid execution phases', () => {
      const phase: ExecutionPhase = 'execution';
      expectAssignable<ExecutionPhase>('setup');
      expectAssignable<ExecutionPhase>('teardown');
      expectAssignable<ExecutionPhase>('discovery');
      expectAssignable<ExecutionPhase>('loading');
      expectAssignable<ExecutionPhase>('validation');
      expectAssignable<ExecutionPhase>('reporting');
      expectAssignable<ExecutionPhase>('cleanup');
      expectNotAssignable<ExecutionPhase>('invalid');
    });
  });

  describe('ValidationResult', () => {
    it('should contain validation results and errors', () => {
      const result: ValidationResult = {
        errors: [],
        files: ['file1.ts', 'file2.ts'],
        valid: true,
        warnings: [],
      };

      expectType<boolean>(result.valid);
      expectType<string[]>(result.files);
      expectType<ValidationError[]>(result.errors);
      expectAssignable<ValidationError[]>(result.warnings);
    });

    it('should support validation errors and warnings', () => {
      const resultWithErrors: ValidationResult = {
        errors: [
          {
            code: 'SYNTAX_ERROR',
            column: 5,
            file: 'bad-file.ts',
            line: 10,
            message: 'Invalid syntax',
            severity: 'error',
          },
        ],
        files: ['bad-file.ts'],
        valid: false,
        warnings: [
          {
            code: 'DEPRECATED',
            file: 'bad-file.ts',
            message: 'Deprecated API usage',
            severity: 'warning',
          },
        ],
      };

      expectType<boolean>(resultWithErrors.valid);
      expectType<ValidationError[]>(resultWithErrors.errors);
    });
  });

  describe('ValidationError', () => {
    it('should define validation error structure', () => {
      const error: ValidationError = {
        code: 'VALID_001',
        file: 'test.ts',
        message: 'Validation failed',
        severity: 'error',
      };

      expectType<string>(error.file);
      expectType<string>(error.message);
      expectType<string>(error.code);
      expectType<'error' | 'warning'>(error.severity);
      expectType<number | undefined>(error.line);
      expectType<number | undefined>(error.column);
    });

    it('should support line and column information', () => {
      const errorWithLocation: ValidationError = {
        code: 'TYPE_ERROR',
        column: 15,
        file: 'test.ts',
        line: 42,
        message: 'Type error',
        severity: 'error',
      };

      expectType<number | undefined>(errorWithLocation.line);
      expectType<number | undefined>(errorWithLocation.column);
    });
  });
});
