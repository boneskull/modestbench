export default {
  config: {
    iterations: 1000,
    warmup: true,
  },

  suites: {
    'String Operations': {
      setup: () => {
        // Suite-level setup
        global.testString = 'a'.repeat(10000);
      },

      teardown: () => {
        delete global.testString;
      },

      benchmarks: {
        'String.indexOf()': {
          fn: () => global.testString.indexOf('a'),
          tags: ['string', 'search'],
        },

        'String.includes()': {
          fn: () => global.testString.includes('a'),
          tags: ['string', 'search'],
        },

        'RegExp.test()': {
          fn: () => /a/.test(global.testString),
          tags: ['string', 'regex'],
        },
      },
    },

    'Array Algorithms': {
      config: {
        iterations: 500, // Override for this suite
      },

      benchmarks: {
        'Linear Search': {
          fn: () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            const target = 500;
            for (let i = 0; i < arr.length; i++) {
              if (arr[i] === target) return i;
            }
            return -1;
          },
        },

        'Array.findIndex()': {
          fn: () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            return arr.findIndex(x => x === 500);
          },
        },
      },
    },
  },
};
