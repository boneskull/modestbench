/**
 * Benchmark with two suites, each containing multiple tasks. Used by:
 * run-benchmarks.test.ts
 */
export default {
  suites: {
    'Suite 1': {
      benchmarks: {
        'task 1': { fn: () => 1 },
        'task 2': { fn: () => 2 },
        'task 3': { fn: () => 3 },
      },
    },
    'Suite 2': {
      benchmarks: {
        'task 4': { fn: () => 4 },
        'task 5': { fn: () => 5 },
      },
    },
  },
};
