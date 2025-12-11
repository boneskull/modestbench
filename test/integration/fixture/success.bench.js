/**
 * Benchmark with a successful task (used alongside failing.bench.js for bail
 * tests). Used by: bail.test.ts
 */
export default {
  suites: {
    'Success Suite': {
      benchmarks: {
        'success task': {
          fn: () => 1,
        },
      },
    },
  },
};
