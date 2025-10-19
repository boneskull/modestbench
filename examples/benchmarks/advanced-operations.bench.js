// Shared state for String Operations suite
const stringState = {
  testString: '',
};

// Shared state for Array Algorithms suite
const arrayState = {
  /** @type {number[]} */
  testArray: [],
};

export default {
  config: {
    iterations: 1000,
    warmup: true,
  },

  suites: {
    'Array Algorithms': {
      benchmarks: {
        // Shorthand syntax: simple functions without tags/config
        'Array.findIndex()': () => {
          return arrayState.testArray.findIndex((x) => x === 500);
        },

        'Linear Search': () => {
          const target = 500;
          for (let i = 0; i < arrayState.testArray.length; i++) {
            if (arrayState.testArray[i] === target) {
              return i;
            }
          }
          return -1;
        },
      },

      config: {
        iterations: 500, // Override for this suite
      },

      setup: () => {
        // Suite-level setup: Create the array once
        arrayState.testArray = Array.from({ length: 1000 }, (_, i) => i);
      },

      teardown: () => {
        // Suite-level teardown: Clean up
        arrayState.testArray = [];
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
        stringState.testString = 'a'.repeat(100);
      },

      teardown: () => {
        stringState.testString = '';
      },
    },
  },
};
