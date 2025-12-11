/**
 * Benchmark for baseline command tests. Used by: baseline-commands.test.ts
 */
export default {
  suites: {
    'Test Suite': {
      benchmarks: {
        'fast task': { fn: () => 1 + 1 },
        'slow task': {
          fn: () => {
            let x = 0;
            for (let i = 0; i < 1000; i++) {
              x += i;
            }
            return x;
          },
        },
      },
    },
  },
};
