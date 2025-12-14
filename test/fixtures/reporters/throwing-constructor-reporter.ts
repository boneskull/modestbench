/**
 * Test fixture: Reporter class that throws in constructor
 *
 * A reporter class that throws an error during instantiation.
 */

import type { Reporter } from '../../../src/types/index.js';

export default class ThrowingReporter implements Reporter {
  constructor() {
    throw new Error('Constructor explosion!');
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
