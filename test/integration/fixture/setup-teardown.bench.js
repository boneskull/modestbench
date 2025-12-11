/**
 * Benchmark with setup and teardown functions. Used by: run-benchmarks.test.ts
 */

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

export default {
  suites: {
    'Setup/Teardown Suite': {
      benchmarks: {
        'process data': {
          fn: () => globalThis.testData.reduce((a, b) => a + b, 0),
        },
      },

      setup: () => {
        // Suite setup - make test data available
        globalThis.testData = Array.from({ length: 1000 }, (_, i) => i);
      },

      teardown: () => {
        delete globalThis.testData;
      },
    },
  },
};
