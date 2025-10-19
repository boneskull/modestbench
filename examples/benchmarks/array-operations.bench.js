// Simple benchmark file structure
export default {
  suites: {
    'Array Operations': {
      benchmarks: {
        // Shorthand syntax: just pass a function directly
        'Array.push()': () => {
          const arr = [];
          for (let i = 0; i < 1000; i++) {
            arr.push(i);
          }
        },

        'Array.unshift()': () => {
          const arr = [];
          for (let i = 0; i < 1000; i++) {
            arr.unshift(i);
          }
        },
      },
    },
  },
};
