/**
 * Benchmark for measurement consistency tests. Used by:
 * engine-comparison.test.ts
 */
export default {
  suites: {
    Measurements: {
      benchmarks: {
        'simple operation': {
          fn: () => {
            let x = 0;
            for (let i = 0; i < 100; i++) {
              x += i;
            }
            return x;
          },
        },
      },
    },
  },
};
