/**
 * Test fixture: Class-based reporter
 *
 * A reporter plugin exported as a class constructor.
 */

import type { Reporter, ReporterContext } from '../../../src/types/index.js';

export default class ClassReporter implements Reporter {
  public readonly context: ReporterContext;

  public readonly options: Record<string, unknown>;

  constructor(options: Record<string, unknown>, context: ReporterContext) {
    this.options = options;
    this.context = context;
  }

  onEnd(_run: unknown): void {
    // no-op
  }

  onError(_error: Error): void {
    // no-op
  }

  onStart(_run: unknown): void {
    // no-op
  }

  onTaskResult(_result: unknown): void {
    // no-op
  }
}
