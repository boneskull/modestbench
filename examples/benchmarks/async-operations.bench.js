export default {
  suites: {
    'Async Operations': {
      benchmarks: {
        'Promise.resolve()': {
          fn: async () => {
            await Promise.resolve('test');
          },
        },

        'setTimeout Promise': {
          fn: () => new Promise(resolve => setTimeout(resolve, 0)),
        },

        'Fetch Simulation': {
          fn: async () => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1));
            return { data: 'response' };
          },
          config: {
            iterations: 100, // Fewer iterations for slower operations
          },
        },
      },
    },
  },
};
