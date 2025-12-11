/**
 * Simple benchmark with two tasks in one suite. Used by: quiet-mode.test.ts,
 * verbose-mode.test.ts
 */
export default {
  suites: {
    'Test Suite': {
      benchmarks: {
        'Another Task': {
          fn: () => {
            // Another fast operation
            return 2 + 2;
          },
        },
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
