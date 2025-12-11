/**
 * Benchmark for CSV reporter tests. Used by: reporters.test.ts
 */
export default {
  suites: {
    'CSV Test': {
      benchmarks: {
        'csv task 1': { fn: () => 1 },
        'csv task 2': { fn: () => 2 },
      },
    },
  },
};
