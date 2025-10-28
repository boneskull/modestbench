// Shared state to avoid recreating arrays each iteration
const state = {
  counter: 0,
  /** @type {number[]} */
  testArray: [],
};

// Simple benchmark file structure
export default {
  suites: {
    'Array Operations': {
      benchmarks: {
        // Push to end of array
        'Array.push()': () => {
          state.testArray.push(state.counter++);
          // Keep array size stable to avoid GC variance
          if (state.testArray.length > 1000) {
            state.testArray.shift();
          }
        },

        // Insert at beginning of array
        'Array.unshift()': () => {
          state.testArray.unshift(state.counter++);
          // Keep array size stable
          if (state.testArray.length > 1000) {
            state.testArray.pop();
          }
        },
      },

      setup: () => {
        // Pre-populate array to stable size
        state.testArray = Array.from({ length: 500 }, (_, i) => i);
        state.counter = 0;
      },

      teardown: () => {
        // Clean up
        state.testArray = [];
      },
    },
  },
};
