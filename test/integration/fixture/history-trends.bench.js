/**
 * Benchmark for history trends tests. Used by: history-viewing.test.ts
 */
export default {
  suites: {
    'Trend Suite': {
      benchmarks: {
        'task-a': {
          fn: () => {
            let x = 0;
            for (let i = 0; i < 100; i++) {
              x++;
            }
            return x;
          },
        },
        'task-b': {
          fn: () => {
            return Array.from({ length: 50 }).map((_, i) => i);
          },
        },
      },
    },
  },
};
