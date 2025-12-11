/**
 * Benchmark for human reporter output tests. Used by: reporters.test.ts
 */
export default {
  suites: {
    'Human Output Test': {
      benchmarks: {
        'fast operation': { fn: () => 1 },
        'slow operation': { fn: () => 2 },
      },
    },
  },
};
