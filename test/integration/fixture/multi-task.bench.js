/**
 * Benchmark with three tasks in one suite. Used by: reporters.test.ts
 */
export default {
  suites: {
    'Progress Test': {
      benchmarks: {
        'task 1': { fn: () => 1 },
        'task 2': { fn: () => 2 },
        'task 3': { fn: () => 3 },
      },
    },
  },
};
