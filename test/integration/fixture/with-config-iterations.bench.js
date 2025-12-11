/**
 * Benchmark with inline config specifying iterations. Used by:
 * run-benchmarks.test.ts
 */
export default {
  config: {
    iterations: 10,
  },
  suites: {
    'Live Updates': {
      benchmarks: {
        'quick task 1': { fn: () => 1 },
        'quick task 2': { fn: () => 2 },
        'quick task 3': { fn: () => 3 },
      },
    },
  },
};
