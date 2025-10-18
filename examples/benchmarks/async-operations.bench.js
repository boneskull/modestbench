export default {
  suites: {
    'Async Operations': {
      benchmarks: {
        'Fetch Simulation': {
          config: {
            iterations: 100, // Fewer iterations for slower operations
          },
          fn: async () => {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1));
            return { data: 'response' };
          },
        },

        'Promise.resolve()': {
          fn: async () => {
            await Promise.resolve('test');
          },
        },

        'setTimeout Promise': {
          fn: () => new Promise((resolve) => setTimeout(resolve, 0)),
        },
      },
    },
  },
};
