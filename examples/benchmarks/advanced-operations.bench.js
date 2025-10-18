// Shared state for String Operations suite
const stringState = {
  testString: '',
};

export default {
  config: {
    iterations: 1000,
    warmup: true,
  },

  suites: {
    'Array Algorithms': {
      benchmarks: {
        'Array.findIndex()': {
          fn: () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            return arr.findIndex((x) => x === 500);
          },
        },

        'Linear Search': {
          fn: () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            const target = 500;
            for (let i = 0; i < arr.length; i++) {
              if (arr[i] === target) {
                return i;
              }
            }
            return -1;
          },
        },
      },

      config: {
        iterations: 500, // Override for this suite
      },
    },

    'String Operations': {
      benchmarks: {
        'RegExp.test()': {
          fn: () => /a/.test(stringState.testString),
          tags: ['string', 'regex'],
        },

        'String.includes()': {
          fn: () => stringState.testString.includes('a'),
          tags: ['string', 'search'],
        },

        'String.indexOf()': {
          fn: () => stringState.testString.indexOf('a'),
          tags: ['string', 'search'],
        },
      },

      setup: () => {
        // Suite-level setup
        stringState.testString = 'a'.repeat(10000);
      },

      teardown: () => {
        stringState.testString = '';
      },
    },
  },
};
