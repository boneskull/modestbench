/**
 * @import {BenchmarkDefinitionInput} from "../../src/index.js"
 */

/** @type {BenchmarkDefinitionInput} */
const benchmark = {
  suites: {
    'Async Operations': {
      benchmarks: {
        // Example of a failing benchmark - intentionally throws an error
        'Failing Benchmark': async () => {
          throw new Error(
            'This benchmark intentionally fails for demonstration purposes',
          );
        },

        // Full syntax: needed when using config, tags, or metadata
        'Fetch Simulation With A Really Long Name For A Task Because It I Wanna See What Happens':
          {
            config: {
              iterations: 100, // Fewer iterations for slower operations
              warmup: 10, // Warmup helps stabilize async timing
            },
            fn: async () => {
              // Simulate API call with 1ms delay
              // Note: setTimeout has ~1ms minimum resolution, so expect high variance
              await new Promise((resolve) => setTimeout(resolve, 1));
              return { data: 'response' };
            },
          },

        // Shorthand syntax: just pass the async function directly
        // Promise microtask timing - expect some variance due to event loop scheduling
        'Promise.resolve()': async () => {
          await Promise.resolve('test');
        },
      },
    },
    'Single Task Suite': {
      benchmarks: {
        // setTimeout(0) queues a macrotask - highly variable due to event loop
        'setTimeout Promise': () =>
          new Promise((resolve) => setTimeout(resolve, 0)),
      },
    },
  },
};
export default benchmark;
