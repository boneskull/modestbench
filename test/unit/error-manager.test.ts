import { expect } from 'bupkis';
import { describe, it } from 'node:test';
import { scheduler } from 'node:timers/promises';

import type { ErrorContext, ExecutionError } from '../../src/types/index.js';

import { ModestBenchErrorManager } from '../../src/core/error-manager.js';

describe('ModestBenchErrorManager', () => {
  describe('getErrorCode()', () => {
    it('should detect FILE_001 for ENOENT errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('ENOENT: no such file or directory');
      const context: ErrorContext = {
        phase: 'loading',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'FILE_001');
    });

    it('should detect FILE_002 for EACCES errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('EACCES: permission denied');
      const context: ErrorContext = {
        phase: 'loading',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'FILE_002');
    });

    it('should detect SYS_001 for out of memory errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('JavaScript heap out of memory');
      const context: ErrorContext = {
        phase: 'execution',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'SYS_001');
    });

    it('should detect SYS_001 for RangeError', () => {
      const manager = new ModestBenchErrorManager();
      const error = new RangeError('Maximum call stack size exceeded');
      const context: ErrorContext = {
        phase: 'execution',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'SYS_001');
    });

    it('should detect BENCH_004 for timeout errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('Operation timeout exceeded');
      const context: ErrorContext = {
        phase: 'execution',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'BENCH_004');
    });

    it('should detect BENCH_001 for syntax errors in loading phase', () => {
      const manager = new ModestBenchErrorManager();
      const error = new SyntaxError('Unexpected token');
      const context: ErrorContext = {
        phase: 'loading',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'BENCH_001');
    });

    it('should detect VALID_001 for schema validation errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('schema validation failed');
      const context: ErrorContext = {
        phase: 'validation',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'VALID_001');
    });

    it('should detect VALID_002 for type validation errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('type mismatch detected');
      const context: ErrorContext = {
        phase: 'validation',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'VALID_002');
    });

    it('should detect VALID_003 for range validation errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('value exceeds limit');
      const context: ErrorContext = {
        phase: 'validation',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'VALID_003');
    });

    it('should detect CONFIG_001 for config errors in discovery phase', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('invalid config file');
      const context: ErrorContext = {
        phase: 'discovery',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'CONFIG_001');
    });

    it('should detect EXEC_001 for task execution errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('Task failed');
      const context: ErrorContext = {
        phase: 'execution',
        task: 'my-task',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'EXEC_001');
    });

    it('should detect EXEC_002 for setup phase errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('Setup failed');
      const context: ErrorContext = {
        phase: 'setup',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'EXEC_002');
    });

    it('should detect EXEC_003 for teardown phase errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('Teardown failed');
      const context: ErrorContext = {
        phase: 'teardown',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'EXEC_003');
    });

    it('should detect HIST_002 for disk space errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('disk space insufficient');
      const context: ErrorContext = {
        phase: 'reporting',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'HIST_002');
    });

    it('should detect HIST_001 for corrupt data errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('data is corrupt and cannot be read');
      const context: ErrorContext = {
        phase: 'loading',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'HIST_001');
    });

    it('should return UNKNOWN for unrecognized errors', () => {
      const manager = new ModestBenchErrorManager();
      const error = new Error('Some random unknown error');
      const context: ErrorContext = {
        phase: 'execution',
        timestamp: new Date(),
      };

      const code = manager.getErrorCode(error, context);
      expect(code, 'to equal', 'UNKNOWN');
    });
  });

  describe('formatError()', () => {
    it('should format error with all context fields', () => {
      const manager = new ModestBenchErrorManager();
      const error: ExecutionError = {
        code: 'EXEC_001',
        context: {
          file: 'test.bench.js',
          phase: 'execution',
          suite: 'My Suite',
          task: 'my-task',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        message: 'Task execution failed',
        originalError: new Error('Original'),
        processedAt: new Date(),
        recoverable: false,
      };

      const formatted = manager.formatError(error);

      expect(formatted, 'to contain', '[EXEC_001]');
      expect(formatted, 'to contain', 'Task execution failed');
      expect(formatted, 'to contain', 'file: test.bench.js');
      expect(formatted, 'to contain', 'suite: My Suite');
      expect(formatted, 'to contain', 'task: my-task');
      expect(formatted, 'to contain', '2024-01-01T12:00:00.000Z');
    });

    it('should format error with partial context (file only)', () => {
      const manager = new ModestBenchErrorManager();
      const error: ExecutionError = {
        code: 'FILE_001',
        context: {
          file: 'missing.bench.js',
          phase: 'loading',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        message: 'File not found',
        originalError: new Error('Original'),
        processedAt: new Date(),
        recoverable: true,
      };

      const formatted = manager.formatError(error);

      expect(formatted, 'to contain', '[FILE_001]');
      expect(formatted, 'to contain', 'File not found');
      expect(formatted, 'to contain', 'file: missing.bench.js');
      expect(formatted, 'not to contain', 'suite:');
      expect(formatted, 'not to contain', 'task:');
    });

    it('should format error without file context', () => {
      const manager = new ModestBenchErrorManager();
      const error: ExecutionError = {
        code: 'SYS_001',
        context: {
          phase: 'execution',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        message: 'Out of memory',
        originalError: new Error('Original'),
        processedAt: new Date(),
        recoverable: false,
      };

      const formatted = manager.formatError(error);

      expect(formatted, 'to contain', '[SYS_001]');
      expect(formatted, 'to contain', 'Out of memory');
      expect(formatted, 'not to contain', 'file:');
      expect(formatted, 'to contain', '2024-01-01T12:00:00.000Z');
    });

    it('should include timestamp in ISO format', () => {
      const manager = new ModestBenchErrorManager();
      const timestamp = new Date('2024-06-15T10:30:45.123Z');
      const error: ExecutionError = {
        code: 'UNKNOWN',
        context: {
          phase: 'execution',
          timestamp,
        },
        message: 'Test error',
        originalError: new Error('Original'),
        processedAt: new Date(),
        recoverable: false,
      };

      const formatted = manager.formatError(error);

      expect(formatted, 'to contain', timestamp.toISOString());
    });
  });

  describe('isRecoverable()', () => {
    it('should return true for recoverable error codes', () => {
      const manager = new ModestBenchErrorManager();
      const recoverableError: ExecutionError = {
        code: 'BENCH_003',
        context: { phase: 'loading', timestamp: new Date() },
        message: 'Missing dependency',
        originalError: new Error('test'),
        processedAt: new Date(),
        recoverable: true,
      };

      expect(manager.isRecoverable(recoverableError), 'to be true');
    });

    it('should return false for non-recoverable error codes', () => {
      const manager = new ModestBenchErrorManager();
      const nonRecoverableError: ExecutionError = {
        code: 'SYS_001',
        context: { phase: 'execution', timestamp: new Date() },
        message: 'Out of memory',
        originalError: new Error('test'),
        processedAt: new Date(),
        recoverable: false,
      };

      expect(manager.isRecoverable(nonRecoverableError), 'to be false');
    });

    it('should return true for EXEC_001 (recoverable execution error)', () => {
      const manager = new ModestBenchErrorManager();
      const error: ExecutionError = {
        code: 'EXEC_001',
        context: { phase: 'execution', timestamp: new Date() },
        message: 'Task execution failed',
        originalError: new Error('test'),
        processedAt: new Date(),
        recoverable: true,
      };

      expect(manager.isRecoverable(error), 'to be true');
    });

    it('should return true for FILE_001 (recoverable file error)', () => {
      const manager = new ModestBenchErrorManager();
      const error: ExecutionError = {
        code: 'FILE_001',
        context: { phase: 'loading', timestamp: new Date() },
        message: 'File not found',
        originalError: new Error('test'),
        processedAt: new Date(),
        recoverable: true,
      };

      expect(manager.isRecoverable(error), 'to be true');
    });
  });

  describe('getStats()', () => {
    it('should return empty stats when no errors', () => {
      const manager = new ModestBenchErrorManager();
      const stats = manager.getStats();

      expect(stats.total, 'to equal', 0);
      expect(stats.recent, 'to be an array');
      expect(stats.recent.length, 'to equal', 0);
      expect(stats.byPhase.execution, 'to equal', 0);
      expect(stats.firstError, 'to be undefined');
      expect(stats.lastError, 'to be undefined');
    });

    it('should count errors by phase', () => {
      const manager = new ModestBenchErrorManager();

      manager.handleError(new Error('Error 1'), {
        phase: 'loading',
        timestamp: new Date(),
      });
      manager.handleError(new Error('Error 2'), {
        phase: 'execution',
        timestamp: new Date(),
      });
      manager.handleError(new Error('Error 3'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      const stats = manager.getStats();

      expect(stats.byPhase.loading, 'to equal', 1);
      expect(stats.byPhase.execution, 'to equal', 2);
      expect(stats.byPhase.setup, 'to equal', 0);
    });

    it('should count errors by type/code', () => {
      const manager = new ModestBenchErrorManager();

      manager.handleError(new Error('ENOENT: file not found'), {
        phase: 'loading',
        timestamp: new Date(),
      });
      manager.handleError(new Error('ENOENT: another file not found'), {
        phase: 'loading',
        timestamp: new Date(),
      });
      manager.handleError(new Error('timeout exceeded'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      const stats = manager.getStats();

      expect(stats.byType.FILE_001, 'to equal', 2);
      expect(stats.byType.BENCH_004, 'to equal', 1);
    });

    it('should track first and last error timestamps', async () => {
      const manager = new ModestBenchErrorManager();

      manager.handleError(new Error('Error 1'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      // Small delay to ensure different timestamps
      await scheduler.wait(1);

      manager.handleError(new Error('Error 2'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      await scheduler.wait(1);

      manager.handleError(new Error('Error 3'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      const stats = manager.getStats();

      // Verify timestamps exist and lastError is >= firstError
      expect(stats.firstError, 'to be defined');
      expect(stats.lastError, 'to be defined');
      expect(
        stats.lastError!.getTime(),
        'to be greater than or equal to',
        stats.firstError!.getTime(),
      );
    });

    it('should limit recent errors list', () => {
      const manager = new ModestBenchErrorManager();

      // Add more than 50 errors (the max)
      for (let i = 0; i < 60; i++) {
        manager.handleError(new Error(`Error ${i}`), {
          phase: 'execution',
          timestamp: new Date(),
        });
      }

      const stats = manager.getStats();

      expect(stats.total, 'to equal', 60);
      expect(stats.recent.length, 'to be less than or equal to', 50);
    });

    it('should track total error count', () => {
      const manager = new ModestBenchErrorManager();

      manager.handleError(new Error('Error 1'), {
        phase: 'execution',
        timestamp: new Date(),
      });
      manager.handleError(new Error('Error 2'), {
        phase: 'loading',
        timestamp: new Date(),
      });
      manager.handleError(new Error('Error 3'), {
        phase: 'validation',
        timestamp: new Date(),
      });

      const stats = manager.getStats();

      expect(stats.total, 'to equal', 3);
    });
  });

  describe('handler management', () => {
    it('should register and call error handlers', () => {
      const manager = new ModestBenchErrorManager();
      let callCount = 0;
      let receivedError: ExecutionError | null = null;

      const handler = (error: ExecutionError) => {
        callCount++;
        receivedError = error;
      };

      manager.onError(handler);
      manager.handleError(new Error('Test error'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      expect(callCount, 'to equal', 1);
      expect(receivedError, 'not to be null');
      expect(receivedError!.message, 'to be a string');
    });

    it('should register multiple handlers', () => {
      const manager = new ModestBenchErrorManager();
      let callCount1 = 0;
      let callCount2 = 0;

      manager.onError(() => {
        callCount1++;
      });
      manager.onError(() => {
        callCount2++;
      });

      manager.handleError(new Error('Test error'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      expect(callCount1, 'to equal', 1);
      expect(callCount2, 'to equal', 1);
    });

    it('should remove handlers correctly', () => {
      const manager = new ModestBenchErrorManager();
      let callCount = 0;

      const handler = () => {
        callCount++;
      };

      manager.onError(handler);
      const removed = manager.removeHandler(handler);

      expect(removed, 'to be true');

      manager.handleError(new Error('Test error'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      expect(callCount, 'to equal', 0);
    });

    it('should return false when removing non-existent handler', () => {
      const manager = new ModestBenchErrorManager();
      const handler = () => {};

      const removed = manager.removeHandler(handler);

      expect(removed, 'to be false');
    });

    it('should handle errors in handlers gracefully', () => {
      const manager = new ModestBenchErrorManager();
      let callCount = 0;

      manager.onError(() => {
        throw new Error('Handler error');
      });
      manager.onError(() => {
        callCount++;
      });

      // Should not throw
      manager.handleError(new Error('Test error'), {
        phase: 'execution',
        timestamp: new Date(),
      });

      // Second handler should still be called
      expect(callCount, 'to equal', 1);
    });

    it('should expose registered handlers via getHandlers', () => {
      const manager = new ModestBenchErrorManager();
      const handler1 = () => {};
      const handler2 = () => {};

      manager.onError(handler1);
      manager.onError(handler2);

      const handlers = manager.getHandlers();

      expect(handlers.length, 'to equal', 2);
      expect(handlers, 'to contain', handler1);
      expect(handlers, 'to contain', handler2);
    });
  });
});
