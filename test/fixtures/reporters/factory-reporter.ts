/**
 * Test fixture: Factory function reporter
 *
 * A reporter plugin exported as a sync factory function.
 */

import type {
  Reporter,
  ReporterContext,
  ReporterFactory,
} from '../../../src/types/index.js';

interface FactoryReporter extends Reporter {
  receivedContext: ReporterContext;
  receivedOptions: Record<string, unknown>;
}

const createReporter: ReporterFactory = (options, context): FactoryReporter => {
  return {
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
