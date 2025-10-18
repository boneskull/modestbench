// TypeScript benchmark file demonstrating native TypeScript support

interface BenchmarkData {
  items: number[];
  sum: number;
}

const processArray = (data: BenchmarkData): number => {
  return data.items.reduce((acc: number, item: number) => acc + item, 0);
};

const processArrayWithMap = (data: BenchmarkData): number => {
  return data.items
    .map((item: number) => item * 2)
    .reduce((acc, item) => acc + item, 0);
};

// Generate test data
const testData: BenchmarkData = {
  items: Array.from({ length: 1000 }, (_, i) => i),
  sum: 0,
};

export default {
  suites: {
    'TypeScript Array Processing': {
      benchmarks: {
        'Array.map() + reduce()': {
          fn: (): void => {
            processArrayWithMap(testData);
          },
          metadata: {
            description:
              'Process array using map and reduce with TypeScript types',
          },
          tags: ['typescript', 'array', 'map', 'reduce'],
        },

        'Array.reduce()': {
          fn: (): void => {
            processArray(testData);
          },
          metadata: {
            description: 'Process array using reduce with TypeScript types',
          },
          tags: ['typescript', 'array', 'reduce'],
        },
      },
      metadata: {
        description: 'Demonstrates TypeScript support with type annotations',
      },
      tags: ['typescript-example'],
    },
  },
};
