/**
 * Benchmark with suite-level config for configuration tests. Used by:
 * configuration.test.ts
 */
export default {
  suites: {
    'Fast Suite': {
      benchmarks: {
        'fast task': {
          fn: () => 1,
        },
      },
      config: {
        iterations: 1,
        warmup: 0,
      },
    },
    'Slow Suite': {
      benchmarks: {
        'slow task': {
          fn: () => 2,
        },
      },
      config: {
        iterations: 1,
        warmup: 0,
      },
    },
  },
};
