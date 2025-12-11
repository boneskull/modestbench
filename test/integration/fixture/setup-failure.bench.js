/**
 * Benchmark with a setup function that throws. Used by: run-benchmarks.test.ts
 */
export default {
  suites: {
    'Failing Setup Suite': {
      benchmarks: {
        'should not run': {
          fn: () => 1 + 1,
        },
      },

      setup: () => {
        throw new Error('Setup exploded');
      },
    },
  },
};
