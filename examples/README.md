# ModestBench Examples

This directory contains comprehensive examples demonstrating the ModestBench framework as specified in the quickstart guide. These examples showcase various benchmark patterns, configuration options, and integration scenarios.

## Directory Structure

```text
examples/
├── benchmarks/                    # Example benchmark files
│   ├── array-operations.bench.js  # Basic array operations from quickstart
│   ├── advanced-operations.bench.js # Multiple suites with setup/teardown
│   ├── async-operations.bench.js   # Async/Promise benchmarks
│   └── performance-tips.bench.js   # Optimization examples and best practices
├── scripts/                      # Utility scripts
│   └── check-performance.js       # Performance regression detection
├── .github/workflows/            # CI/CD integration
│   └── benchmarks.yml             # GitHub Actions workflow
├── modestbench.config.json       # Example JSON configuration
├── modestbench.config.ts          # Example TypeScript configuration
└── README.md                     # This file
```

## Getting Started

### 1. Run All Examples

```bash
# From the examples directory
modestbench run --config modestbench.config.json

# Or run specific benchmarks
modestbench run "benchmarks/**/*.bench.js"
```

### 2. Run Individual Examples

```bash
# Basic array operations
modestbench run benchmarks/array-operations.bench.js

# Advanced examples with multiple suites
modestbench run benchmarks/advanced-operations.bench.js

# Async operations
modestbench run benchmarks/async-operations.bench.js

# Performance optimization patterns
modestbench run benchmarks/performance-tips.bench.js
```

### 3. Try Different Output Formats

```bash
# Human-readable output (default)
modestbench run --reporters human

# JSON output
modestbench run --reporters json

# CSV output
modestbench run --reporters csv

# Multiple reporters
modestbench run --reporters human,json,csv --output ./results
```

## Example Benchmark Files

### 1. array-operations.bench.js

Basic benchmark structure from the quickstart guide showing:

- Simple benchmark file structure
- Array.push() vs Array.unshift() comparison
- Clean, minimal example

### 2. advanced-operations.bench.js

Advanced patterns including:

- Multiple suites in one file
- Suite-level setup and teardown hooks
- Per-suite configuration overrides
- Tagged benchmarks for organization
- String operations and array algorithms

### 3. async-operations.bench.js

Asynchronous benchmark patterns:

- Promise-based benchmarks
- async/await functions
- setTimeout simulations
- API call simulations with custom iteration counts

### 4. performance-tips.bench.js

Performance optimization examples showing:

- ✅ Good patterns: Setup/teardown to exclude initialization from measurement
- ❌ Bad patterns: Including setup in benchmark functions
- Appropriate iteration counts for fast vs slow operations
- Memory management and cleanup
- Algorithm comparisons with tags

## Configuration Examples

### JSON Configuration (modestbench.config.json)

```json
{
  "exclude": ["node_modules/**", "dist/**"],
  "iterations": 1000,
  "outputDir": "./benchmark-results",
  "pattern": "benchmarks/**/*.bench.{js,ts}",
  "reporters": ["human", "json"],
  "timeout": 30000,
  "warmup": 50
}
```

### TypeScript Configuration (modestbench.config.ts)

```typescript
import { ModestBenchConfig } from 'modestbench';

const config: ModestBenchConfig = {
  pattern: 'src/**/*.bench.ts',
  reporters: ['human', 'csv'],
  iterations: 2000,
  warmup: 100,
  outputDir: './reports',
};

export default config;
```

## Expected Output Formats

### Human-Readable Output

```text
┌─────────────────────────────────────────────────────────────┐
│                     ModestBench Results                     │
├─────────────────────────────────────────────────────────────┤
│ File: array-operations.bench.js                            │
│ Suite: Array Operations                    ████████████ 100% │
├─────────────────────────────────────────────────────────────┤
│ Array.push()     │  1,234,567 ops/sec  │  ±2.45%  │ fastest │
│ Array.unshift()  │    987,654 ops/sec  │  ±3.12%  │  80.0%  │
└─────────────────────────────────────────────────────────────┘
```

### JSON Output

```json
{
  "results": [
    {
      "file": "array-operations.bench.js",
      "suite": "Array Operations",
      "task": "Array.push()",
      "hz": 1234567.89,
      "duration": 0.00081,
      "iterations": 1000,
      "stats": {
        "mean": 0.00081,
        "median": 0.000805,
        "stdDev": 0.00002
      }
    }
  ],
  "run": {
    "id": "run-2025-10-06-001",
    "timestamp": "2025-10-06T10:30:00.000Z",
    "duration": 15420,
    "status": "completed"
  }
}
```

### CSV Output

```csv
File,Suite,Task,Hz,Duration,Iterations,Mean,Median,StdDev
array-operations.bench.js,Array Operations,Array.push(),1234567.89,0.000810,1000,0.000810,0.000805,0.000020
array-operations.bench.js,Array Operations,Array.unshift(),987654.32,0.001012,1000,0.001012,0.001008,0.000031
```

## Performance Tips Demonstrated

### 1. Optimize Benchmark Functions

```javascript
// ❌ Bad: includes setup in measurement
{
  'Slow Benchmark': {
    fn: () => {
      const data = generateLargeDataset(); // Setup included!
      return processData(data);
    }
  }
}

// ✅ Good: use setup hooks
{
  setup: () => {
    global.dataset = generateLargeDataset();
  },
  benchmarks: {
    'Fast Benchmark': {
      fn: () => processData(global.dataset)
    }
  }
}
```

### 2. Choose Appropriate Iterations

```javascript
// Fast operations need more iterations
'Array Access': {
  fn: () => arr[500],
  config: { iterations: 10000 }
}

// Slow operations need fewer iterations
'Heavy Computation': {
  fn: () => heavyCalculation(),
  config: { iterations: 10 }
}
```

### 3. Use Tags for Organization

```javascript
benchmarks: {
  'Quick Sort': {
    fn: () => quickSort(data),
    tags: ['sorting', 'algorithm', 'fast']
  },
  'Bubble Sort': {
    fn: () => bubbleSort(data),
    tags: ['sorting', 'algorithm', 'slow']
  }
}
```

## CI/CD Integration

The `.github/workflows/benchmarks.yml` file demonstrates how to:

- Run benchmarks in CI/CD pipelines
- Generate multiple output formats
- Upload benchmark results as artifacts
- Integrate with GitHub Actions

## Performance Regression Detection

The `scripts/check-performance.js` script shows how to:

- Compare current results with baseline
- Detect performance regressions
- Set failure thresholds
- Integrate with CI/CD for automated monitoring

## Troubleshooting

### Common Issues

**Benchmarks taking too long:**

```bash
# Reduce iterations or set timeout
modestbench run --iterations 100 --timeout 10000
```

**Memory issues with large datasets:**

```javascript
// Use teardown to clean up
teardown: () => {
  global.largeDataset = null;
  if (global.gc) global.gc();
};
```

**Inconsistent results:**

```bash
# Enable warmup and increase iterations
modestbench run --warmup 50 --iterations 5000
```

### Debugging Commands

```bash
# Verbose output
modestbench run --verbose

# Run with minimal iterations for quick testing
modestbench run --iterations 10
```

## Next Steps

1. **Try the Examples**: Run each benchmark file to see different patterns
2. **Modify Configurations**: Experiment with different settings in the config files
3. **Create Your Own**: Use these examples as templates for your benchmarks
4. **Integrate CI/CD**: Adapt the workflow file for your project
5. **Monitor Performance**: Use the regression detection script

For more detailed documentation, visit the main ModestBench documentation.
