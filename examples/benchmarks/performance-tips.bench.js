// Performance optimization examples

// Shared state for Iteration Examples suite
const iterationState = {
  largeComputation: /** @type {() => number} */ (() => 0),
  smallArray: /** @type {number[]} */ ([]),
};

// Shared state for Optimization Examples suite
const optimizationState = {
  dataset: /** @type {{ id: number; name: string; value: number }[]} */ ([]),
  processData: /**
   * @type {(
   *   data: { id: number; name: string; value: number }[],
   * ) => string[]}
   */ (() => []),
};

// Shared state for Sorting Algorithms suite
const sortingState = {
  bubbleSort: /** @type {(arr: number[]) => number[]} */ (() => []),
  quickSort: /** @type {(arr: number[]) => number[]} */ (() => []),
  unsortedData: /** @type {number[]} */ ([]),
};

export default {
  suites: {
    'Iteration Examples': {
      benchmarks: {
        // Fast operations need more iterations
        'Array Access': {
          config: { iterations: 10000 },
          fn: () => iterationState.smallArray[50],
          tags: ['fast', 'array'],
        },

        // Slow operations need fewer iterations
        'Heavy Computation': {
          config: { iterations: 10 },
          fn: () => iterationState.largeComputation(),
          tags: ['slow', 'computation'],
        },
      },

      setup: () => {
        iterationState.smallArray = Array.from({ length: 100 }, (_, i) => i);
        iterationState.largeComputation = () => {
          let result = 0;
          for (let i = 0; i < 100000; i++) {
            result += Math.sqrt(i);
          }
          return result;
        };
      },

      teardown: () => {
        iterationState.smallArray = [];
        iterationState.largeComputation = () => 0;
      },
    },

    'Optimization Examples': {
      benchmarks: {
        // ✅ Good: setup excluded from measurement
        'Fast Benchmark': {
          fn: () => optimizationState.processData(optimizationState.dataset),
          tags: ['optimized', 'fast'],
        },

        // ❌ Bad example (for comparison)
        'Slow Benchmark': {
          fn: () => {
            // Setup included in measurement - avoid this!
            const data = Array.from({ length: 1000 }, (_, i) => ({
              id: i,
              name: `item-${i}`,
              value: Math.random(),
            }));
            return data.filter((item) => item.value > 0.5);
          },
          tags: ['unoptimized', 'slow'],
        },
      },

      setup: () => {
        // Generate large dataset once for all benchmarks
        optimizationState.dataset = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          value: Math.random(),
        }));

        optimizationState.processData = (data) => {
          return data
            .filter((item) => item.value > 0.5)
            .map((item) => item.name)
            .slice(0, 100);
        };
      },

      teardown: () => {
        optimizationState.dataset = [];
        optimizationState.processData = () => [];
        // Optional garbage collection
        if (global.gc) {
          global.gc();
        }
      },
    },

    'Sorting Algorithms': {
      benchmarks: {
        'Bubble Sort': {
          fn: () => sortingState.bubbleSort([...sortingState.unsortedData]),
          tags: ['sorting', 'algorithm', 'slow'],
        },

        'Native Sort': {
          fn: () => [...sortingState.unsortedData].sort((a, b) => a - b),
          tags: ['sorting', 'native', 'fast'],
        },

        'Quick Sort': {
          fn: () => sortingState.quickSort([...sortingState.unsortedData]),
          tags: ['sorting', 'algorithm', 'fast'],
        },
      },

      setup: () => {
        sortingState.unsortedData = Array.from({ length: 1000 }, () =>
          Math.floor(Math.random() * 1000),
        );

        sortingState.quickSort = (arr) => {
          if (arr.length <= 1) {
            return arr;
          }
          const pivotIndex = Math.floor(arr.length / 2);
          const pivot = /** @type {number} */ (arr[pivotIndex]);
          const left = arr.filter((x) => x < pivot);
          const middle = arr.filter((x) => x === pivot);
          const right = arr.filter((x) => x > pivot);
          return [
            ...sortingState.quickSort(left),
            ...middle,
            ...sortingState.quickSort(right),
          ];
        };

        sortingState.bubbleSort = (arr) => {
          const result = [...arr];
          for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < result.length - i - 1; j++) {
              const current = /** @type {number} */ (result[j]);
              const next = /** @type {number} */ (result[j + 1]);
              if (current > next) {
                [result[j], result[j + 1]] = [next, current];
              }
            }
          }
          return result;
        };
      },

      teardown: () => {
        sortingState.unsortedData = [];
        sortingState.quickSort = () => [];
        sortingState.bubbleSort = () => [];
      },
    },
  },
};
