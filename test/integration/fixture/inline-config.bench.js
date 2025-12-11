/**
 * Benchmark with inline config for configuration merge tests. Used by:
 * configuration.test.ts
 */
export default {
  config: {
    iterations: 1, // Override global
    warmup: 0, // Add to global
  },
  suites: {
    'Inline Config Test': {
      benchmarks: {
        'inline task': {
          fn: () => 1,
        },
      },
    },
  },
};
