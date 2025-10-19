export default {
  suites: {
    'Async Operations': {
      benchmarks: {
        // Full syntax: needed when using config, tags, or metadata
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

        // Shorthand syntax: just pass the async function directly
        'Promise.resolve()': async () => {
          await Promise.resolve('test');
        },

        'setTimeout Promise': () =>
          new Promise((resolve) => setTimeout(resolve, 0)),
      },
    },
  },
};
