/**
 * Async operations benchmark. Used by: engine-comparison.test.ts
 */
export default {
  suites: {
    'Async Operations': {
      benchmarks: {
        'promise resolve': {
          fn: async () => Promise.resolve(42),
        },
      },
    },
  },
};
