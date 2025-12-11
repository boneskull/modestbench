/**
 * Fast benchmark for iteration count tests. Used by: engine-comparison.test.ts
 */
export default {
  suites: {
    'Iteration Count': {
      benchmarks: {
        'fast op': {
          fn: () => 1 + 1,
        },
      },
    },
  },
};
