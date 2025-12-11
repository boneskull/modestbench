/**
 * Simple math operations benchmark. Used by: engine-comparison.test.ts
 */
export default {
  suites: {
    'Simple Math': {
      benchmarks: {
        addition: {
          fn: () => 1 + 1,
        },
        multiplication: {
          fn: () => 2 * 2,
        },
      },
    },
  },
};
