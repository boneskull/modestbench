/**
 * Benchmark with a task that throws a specific error message. Used by:
 * verbose-mode.test.ts, engine-comparison.test.ts
 */
export default {
  suites: {
    'Error Suite': {
      benchmarks: {
        'Failing Task': {
          fn: () => {
            throw new Error('Test error message');
          },
        },
      },
    },
  },
};
