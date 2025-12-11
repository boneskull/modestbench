/**
 * Simple benchmark with a single task returning 42. Used by:
 * custom-output-filename.test.ts
 */
export default {
  suites: {
    'Test Suite': {
      benchmarks: {
        'simple task': {
          fn: () => 42,
        },
      },
    },
  },
};
