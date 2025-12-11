/**
 * Benchmark with a task that throws an error. Used by: bail.test.ts,
 * verbose-mode.test.ts
 */
export default {
  suites: {
    'Failing Suite': {
      benchmarks: {
        'failing task': {
          fn: () => {
            throw new Error('Intentional failure');
          },
        },
      },
    },
  },
};
