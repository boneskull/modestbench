/**
 * Longer running benchmark for abort signal tests. Used by:
 * engine-comparison.test.ts
 */
export default {
  suites: {
    Abortable: {
      benchmarks: {
        'long running': {
          fn: () => {
            let x = 0;
            for (let i = 0; i < 1000000; i++) {
              x += i;
            }
            return x;
          },
        },
      },
    },
  },
};
