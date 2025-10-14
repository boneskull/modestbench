// Performance optimization examples

export default {
  suites: {
    'Iteration Examples': {
      benchmarks: {
        // Fast operations need more iterations
        'Array Access': {
          config: { iterations: 10000 },
          fn: () => global.smallArray[50],
          tags: ['fast', 'array'],
        },

        // Slow operations need fewer iterations
        'Heavy Computation': {
          config: { iterations: 10 },
          fn: () => global.largeComputation(),
          tags: ['slow', 'computation'],
        },
      },

      setup: () => {
        global.smallArray = Array.from({ length: 100 }, (_, i) => i);
        global.largeComputation = () => {
          let result = 0;
          for (let i = 0; i < 100000; i++) {
            result += Math.sqrt(i);
          }
          return result;
        };
      },

      teardown: () => {
        delete global.smallArray;
        delete global.largeComputation;
      },
    },

    'Optimization Examples': {
      benchmarks: {
        // ✅ Good: setup excluded from measurement
        'Fast Benchmark': {
          fn: () => global.processData(global.dataset),
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
            return data.filter(item => item.value > 0.5);
          },
          tags: ['unoptimized', 'slow'],
        },
      },

      setup: () => {
        // Generate large dataset once for all benchmarks
        global.dataset = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          value: Math.random(),
        }));

        global.processData = data => {
          return data
            .filter(item => item.value > 0.5)
            .map(item => item.name)
            .slice(0, 100);
        };
      },

      teardown: () => {
        delete global.dataset;
        delete global.processData;
        // Optional garbage collection
        if (global.gc) {global.gc();}
      },
    },

    'Sorting Algorithms': {
      benchmarks: {
        'Bubble Sort': {
          fn: () => global.bubbleSort([...global.unsortedData]),
          tags: ['sorting', 'algorithm', 'slow'],
        },

        'Native Sort': {
          fn: () => [...global.unsortedData].sort((a, b) => a - b),
          tags: ['sorting', 'native', 'fast'],
        },

        'Quick Sort': {
          fn: () => global.quickSort([...global.unsortedData]),
          tags: ['sorting', 'algorithm', 'fast'],
        },
      },

      setup: () => {
        global.unsortedData = Array.from({ length: 1000 }, () =>
          Math.floor(Math.random() * 1000)
        );

        global.quickSort = arr => {
          if (arr.length <= 1) {return arr;}
          const pivot = arr[Math.floor(arr.length / 2)];
          const left = arr.filter(x => x < pivot);
          const middle = arr.filter(x => x === pivot);
          const right = arr.filter(x => x > pivot);
          return [
            ...global.quickSort(left),
            ...middle,
            ...global.quickSort(right),
          ];
        };

        global.bubbleSort = arr => {
          const result = [...arr];
          for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < result.length - i - 1; j++) {
              if (result[j] > result[j + 1]) {
                [result[j], result[j + 1]] = [result[j + 1], result[j]];
              }
            }
          }
          return result;
        };
      },

      teardown: () => {
        delete global.unsortedData;
        delete global.quickSort;
        delete global.bubbleSort;
      },
    },
  },
};
