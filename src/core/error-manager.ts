/**
 * ModestBench Error Manager
 *
 * Handles execution errors with context tracking, categorization, and provides
 * structured error information for graceful degradation.
 */

import type {
  ErrorContext,
  ErrorManager,
  ErrorStats,
  ExecutionError,
  ExecutionPhase,
} from '../types/index.js';

/**
 * Error handler callback type
 */
type ErrorHandler = (error: ExecutionError) => void;

/**
 * Error code mappings for different error types and contexts
 */
const ERROR_CODES = {
  // Benchmark file errors
  BENCH_001: 'Benchmark file syntax error',
  BENCH_002: 'Invalid benchmark structure',
  BENCH_003: 'Missing dependency',
  BENCH_004: 'Timeout exceeded',
  BENCH_005: 'Memory limit exceeded',

  // Configuration errors
  CONFIG_001: 'Invalid configuration file',
  CONFIG_002: 'Missing required option',

  // Execution errors
  EXEC_001: 'Task execution failed',
  EXEC_002: 'Setup function failed',
  EXEC_003: 'Teardown function failed',

  EXEC_004: 'Memory leak detected',
  // File system errors
  FILE_001: 'File not found',
  FILE_002: 'Permission denied',

  FILE_003: 'Invalid file format',
  // History storage errors
  HIST_001: 'History data corruption',
  HIST_002: 'Disk space insufficient',
  HIST_003: 'Index corruption',

  // System errors
  SYS_001: 'Out of memory',
  SYS_002: 'Process crashed',
  SYS_003: 'System resource unavailable',

  // Unknown errors
  UNKNOWN: 'Unknown error',
  // Validation errors
  VALID_001: 'Schema validation failed',
  VALID_002: 'Type validation failed',

  VALID_003: 'Range validation failed',
} as const;

/**
 * Recoverable error types that shouldn't stop entire execution
 */
const RECOVERABLE_ERRORS = new Set([
  'BENCH_003', // Missing dependency (can skip specific benchmark)
  'EXEC_001', // Task execution failed (can continue with other tasks)
  'FILE_001', // File not found (can continue with other files)
  'VALID_002', // Type validation failed (can skip invalid items)
  'VALID_003', // Range validation failed (can skip invalid items)
]);

/**
 * Default error manager implementation
 */
export class ModestBenchErrorManager implements ErrorManager {
  private errors: ExecutionError[] = [];

  private handlers: ErrorHandler[] = [];

  private readonly maxRecentErrors = 50;

  /**
   * Clear error history
   */
  clearStats(): void {
    this.errors = [];
  }

  /**
   * Format error for display
   */
  formatError(error: ExecutionError): string {
    const { code, context, message } = error;

    let formatted = `[${code}] ${message}`;

    // Add context information
    const contextParts: string[] = [];
    if (context.file) {
      contextParts.push(`file: ${context.file}`);
    }
    if (context.suite) {
      contextParts.push(`suite: ${context.suite}`);
    }
    if (context.task) {
      contextParts.push(`task: ${context.task}`);
    }

    if (contextParts.length > 0) {
      formatted += ` (${contextParts.join(', ')})`;
    }

    formatted += ` at ${context.timestamp.toISOString()}`;

    return formatted;
  }

  /**
   * Get error code for a given error
   */
  getErrorCode(error: Error, context: ErrorContext): string {
    // Check for specific error patterns
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // File system errors
    if (message.includes('enoent') || message.includes('no such file')) {
      return 'FILE_001';
    }
    if (message.includes('eacces') || message.includes('permission denied')) {
      return 'FILE_002';
    }

    // Memory errors
    if (message.includes('out of memory') || name.includes('rangeerror')) {
      return 'SYS_001';
    }

    // Timeout errors
    if (message.includes('timeout') || name.includes('timeout')) {
      return 'BENCH_004';
    }

    // Syntax errors in benchmark files
    if (name.includes('syntaxerror') && context.phase === 'loading') {
      return 'BENCH_001';
    }

    // Validation errors
    if (context.phase === 'validation') {
      if (message.includes('schema') || message.includes('structure')) {
        return 'VALID_001';
      }
      if (message.includes('type')) {
        return 'VALID_002';
      }
      if (message.includes('range') || message.includes('limit')) {
        return 'VALID_003';
      }
    }

    // Configuration errors
    if (context.phase === 'discovery' && message.includes('config')) {
      return 'CONFIG_001';
    }

    // Execution phase errors
    if (context.phase === 'execution') {
      if (context.task) {
        return 'EXEC_001';
      }
    }

    if (context.phase === 'setup') {
      return 'EXEC_002';
    }

    if (context.phase === 'teardown') {
      return 'EXEC_003';
    }

    // Storage errors
    if (message.includes('disk') && message.includes('space')) {
      return 'HIST_002';
    }

    if (message.includes('corrupt') || message.includes('invalid json')) {
      return 'HIST_001';
    }

    // Default to unknown
    return 'UNKNOWN';
  }

  /**
   * Get error count by phase
   */
  getErrorCountByPhase(phase: ExecutionPhase): number {
    return this.errors.filter((error) => error.context.phase === phase).length;
  }

  /**
   * Get human-readable description for error code
   */
  getErrorDescription(code: string): string {
    return ERROR_CODES[code as keyof typeof ERROR_CODES] || 'Unknown error';
  }

  /**
   * Get all error handlers (for testing)
   */
  getHandlers(): readonly ErrorHandler[] {
    return [...this.handlers];
  }

  /**
   * Get recent errors for a specific phase
   */
  getRecentErrorsForPhase(phase: ExecutionPhase, limit = 10): ExecutionError[] {
    return this.errors
      .filter((error) => error.context.phase === phase)
      .slice(-limit);
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const byPhase: Record<ExecutionPhase, number> = {
      cleanup: 0,
      discovery: 0,
      execution: 0,
      loading: 0,
      reporting: 0,
      setup: 0,
      teardown: 0,
      validation: 0,
    };

    const byType: Record<string, number> = {};
    let firstError: Date | undefined;
    let lastError: Date | undefined;

    for (const error of this.errors) {
      // Count by phase
      byPhase[error.context.phase]++;

      // Count by type (error code)
      const type = error.code;
      byType[type] = (byType[type] || 0) + 1;

      // Track timestamps
      const timestamp = error.processedAt;
      if (!firstError || timestamp < firstError) {
        firstError = timestamp;
      }
      if (!lastError || timestamp > lastError) {
        lastError = timestamp;
      }
    }

    const result: ErrorStats = {
      byPhase,
      byType,
      ...(firstError && { firstError }),
      ...(lastError && { lastError }),
      recent: this.errors.slice(-this.maxRecentErrors),
      total: this.errors.length,
    };

    return result;
  }

  /**
   * Handle an execution error
   */
  handleError(error: Error, context: ErrorContext): ExecutionError {
    const code = this.getErrorCode(error, context);
    const recoverable = this.isRecoverableByCode(code);

    const executionError: ExecutionError = {
      code,
      context,
      message: this.createMessage(error, context, code),
      originalError: error,
      processedAt: new Date(),
      recoverable,
      ...(error.stack && { stack: error.stack }),
    };

    // Store error for statistics
    this.errors.push(executionError);

    // Keep only recent errors to prevent memory leaks
    if (this.errors.length > this.maxRecentErrors * 2) {
      this.errors = this.errors.slice(-this.maxRecentErrors);
    }

    // Notify handlers
    for (const handler of this.handlers) {
      try {
        handler(executionError);
      } catch (handlerError) {
        // Don't let handler errors break error handling
        console.error('Error in error handler:', handlerError);
      }
    }

    return executionError;
  }

  /**
   * Check if an error is recoverable
   */
  isRecoverable(error: ExecutionError): boolean {
    return error.recoverable;
  }

  /**
   * Register error handler callback
   */
  onError(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Remove error handler
   */
  removeHandler(handler: ErrorHandler): boolean {
    const index = this.handlers.indexOf(handler);
    if (index >= 0) {
      this.handlers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Create human-readable error message
   */
  private createMessage(
    error: Error,
    context: ErrorContext,
    code: string,
  ): string {
    const baseMessage = this.getErrorDescription(code);
    const originalMessage = error.message;

    // If the original message is more descriptive, use it
    if (
      originalMessage &&
      originalMessage !== baseMessage &&
      !originalMessage.includes('[object')
    ) {
      return `${baseMessage}: ${originalMessage}`;
    }

    return baseMessage;
  }

  /**
   * Check if error is recoverable by code
   */
  private isRecoverableByCode(code: string): boolean {
    return RECOVERABLE_ERRORS.has(code);
  }
}
