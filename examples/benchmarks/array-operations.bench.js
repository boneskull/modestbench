// Simple benchmark file structure
export default {
  suites: {
    'Array Operations': {
      benchmarks: {
        'Array.push()': {
          fn: () => {
            const arr = [];
            for (let i = 0; i < 1000; i++) {
              arr.push(i);
            }
          },
        },

        'Array.unshift()': {
          fn: () => {
            const arr = [];
            for (let i = 0; i < 1000; i++) {
              arr.unshift(i);
            }
          },
        },
      },
    },
  },
};
