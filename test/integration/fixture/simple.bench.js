/**
 * Simple benchmark with a single fast task. Used by: iterations.test.ts,
 * limit-by.test.ts, quiet-mode.test.ts, verbose-mode.test.ts
 */
export default {
  suites: {
    'Test Suite': {
      benchmarks: {
        'Fast Task': {
          fn: () => {
            // Very fast operation
            return 1 + 1;
          },
        },
      },
    },
  },
};
