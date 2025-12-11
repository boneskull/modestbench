/**
 * Benchmark with mixed results: good task, failing task, another good task.
 * Used by: run-benchmarks.test.ts
 */
export default {
  suites: {
    'Mixed Results': {
      benchmarks: {
        'another good task': { fn: () => 2 },
        'bad task': {
          fn: () => {
            throw new Error('Benchmark error');
          },
        },
        'good task': { fn: () => 1 },
      },
    },
  },
};
