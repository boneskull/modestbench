/**
 * Array operations benchmark. Used by: run-benchmarks.test.ts
 */
export default {
  suites: {
    'Array Operations': {
      benchmarks: {
        'Array.push()': {
          fn: () => [].push(1),
        },

        'Array.unshift()': {
          fn: () => [].unshift(1),
        },
      },
    },
  },
};
