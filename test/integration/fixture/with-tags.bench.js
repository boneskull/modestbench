/**
 * Benchmark with tagged tasks for filtering tests. Used by:
 * engine-comparison.test.ts
 */
export default {
  suites: {
    'Tagged Tests': {
      benchmarks: {
        'fast task': {
          fn: () => 1 + 1,
          tags: ['fast'],
        },
        'slow task': {
          fn: () => {
            let x = 0;
            for (let i = 0; i < 10000; i++) {
              x += i;
            }
            return x;
          },
          tags: ['slow'],
        },
      },
    },
  },
};
