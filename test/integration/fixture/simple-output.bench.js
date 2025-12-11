/**
 * Benchmark for simple reporter output tests (no colors/ANSI). Used by:
 * reporters.test.ts
 */
export default {
  suites: {
    'Simple Output Test': {
      benchmarks: {
        'fast operation': { fn: () => 1 },
        'slow operation': { fn: () => 2 },
      },
    },
  },
};
