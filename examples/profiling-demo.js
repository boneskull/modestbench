/**
 * Profiling Demo - Example with Hot Code Paths
 *
 * This file demonstrates how to use modestbench analyze to identify benchmark
 * candidates. Run with:
 *
 * Modestbench analyze "node examples/profiling-demo.js"
 */

// Medium function - string manipulation
const parseAndFormat = () => {
  const data = Array.from({ length: 100_000 }, (_, i) => {
    const raw = `${i}|item-${i}|${Math.random() * 100}`;
    const parts = raw.split('|');
    return {
      id: parseInt(parts[0] ?? '0', 10),
      name: parts[1]?.replace('-', '_') ?? '',
      value: parseFloat(parts[2] ?? '0'),
    };
  });
  return data.filter((item) => item.value > 50);
};

// Warm function - moderate CPU time
const processStrings = () => {
  const strings = Array.from({ length: 500_000 }, (_, i) => `item-${i}`);
  return strings
    .map((s) => s.toUpperCase())
    .filter((s) => s.includes('5'))
    .join(',');
};

// Medium-warm function - JSON serialization
const serializeData = () => {
  const data = Array.from({ length: 50_000 }, (_, i) => ({
    id: i,
    metadata: { created: Date.now(), updated: Date.now() },
    name: `Record ${i}`,
    tags: ['tag1', 'tag2', 'tag3'],
  }));
  return JSON.stringify(data);
};

// Cold function - minimal CPU time
const simpleCalculation = () => {
  return Math.sqrt(42) * Math.PI;
};

// Hot function - lots of CPU time
const sortLargeArray = () => {
  const arr = Array.from({ length: 1_000_000 }, () => Math.random());
  return arr.sort((a, b) => a - b);
};

// Warm function - object manipulation
const transformData = () => {
  const data = Array.from({ length: 200_000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random() * 100,
  }));

  return data
    .filter((item) => item.value > 50)
    .map((item) => ({
      ...item,
      normalized: item.value / 100,
    }))
    .reduce((acc, item) => acc + item.normalized, 0);
};

// Another hot function - regex processing
const validateEmails = () => {
  const emails = Array.from(
    { length: 100_000 },
    (_, i) => `user${i}@example.com`,
  );
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.filter((email) => regex.test(email));
};

// Run all functions to generate profile data
console.log('Running profiling demo...');
console.log(
  'This will take a few seconds to generate meaningful profile data.\n',
);
console.time('Total execution');

console.log('Sorting large array...');
sortLargeArray();

console.log('Processing strings...');
processStrings();

console.log('Validating emails...');
validateEmails();

console.log('Transforming data...');
transformData();

console.log('Serializing JSON...');
serializeData();

console.log('Parsing and formatting...');
parseAndFormat();

console.log('Running mixed workload...');
// Run a mix to show relative costs
sortLargeArray();
validateEmails();
transformData();

console.log('Simple calculations (cold path)...');
for (let i = 0; i < 10_000; i++) {
  simpleCalculation();
}

console.timeEnd('Total execution');
console.log(
  '\nDone! Analyze with: modestbench analyze "node examples/profiling-demo.js"',
);
