/**
 * Test fixture: Async factory function reporter
 *
 * A reporter plugin exported as an async factory function.
 */

import type { Reporter, ReporterContext } from '../../../src/types/index.js';

interface AsyncFactoryReporter extends Reporter {
  asyncInitialized: boolean;
  receivedContext: ReporterContext;
  receivedOptions: Record<string, unknown>;
}

const createReporter = async (
  options: Record<string, unknown>,
  context: ReporterContext,
): Promise<AsyncFactoryReporter> => {
  // Simulate async initialization (e.g., database connection)
  await new Promise((resolve) => setTimeout(resolve, 10));

  return {
    asyncInitialized: true,
    onEnd(_run) {
      // no-op
    },
    onError(_error) {
      // no-op
    },
    onStart(_run) {
      // no-op
    },
    onTaskResult(_result) {
      // no-op
    },
    receivedContext: context,
    receivedOptions: options,
  };
};

export default createReporter;
