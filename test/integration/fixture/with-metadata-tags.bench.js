/**
 * Benchmark with task-level metadata tags. Used by: reporters.test.ts
 */
export default {
  suites: {
    'Metadata Suite': {
      benchmarks: {
        'metadata task': {
          fn: () => 1,
          tags: ['performance', 'unit'],
        },
      },
    },
  },
};
