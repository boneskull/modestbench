# ModestBench Framework - Quick Start Guide

## Installation

```bash
# Install ModestBench globally
npm install -g modestbench

# Or install in your project
npm install --save-dev modestbench

# Initialize a new project
modestbench init --examples
```

## Basic Usage

### 1. Create Your First Benchmark

Create a file `benchmarks/array-operations.bench.js`:

```javascript
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
```

### 2. Run Benchmarks

```bash
# Run all benchmarks
modestbench run

# Run specific pattern
modestbench run "benchmarks/**/*.bench.js"

# Run with specific options
modestbench run --iterations 1000 --reporters human,json
```

### 3. View Results

Real-time output will show:

- Progress bars for files, suites, and individual benchmarks
- Estimated completion times
- Live performance statistics
- Colorful summary tables

## Advanced Benchmark Structure

### Multiple Suites with Setup/Teardown

```javascript
export default {
  config: {
    iterations: 1000,
    warmup: true,
  },

  suites: {
    'String Operations': {
      setup: () => {
        // Suite-level setup
        global.testString = 'a'.repeat(10000);
      },

      teardown: () => {
        delete global.testString;
      },

      benchmarks: {
        'String.indexOf()': {
          fn: () => global.testString.indexOf('a'),
          tags: ['string', 'search'],
        },

        'String.includes()': {
          fn: () => global.testString.includes('a'),
          tags: ['string', 'search'],
        },

        'RegExp.test()': {
          fn: () => /a/.test(global.testString),
          tags: ['string', 'regex'],
        },
      },
    },

    'Array Algorithms': {
      config: {
        iterations: 500, // Override for this suite
      },

      benchmarks: {
        'Linear Search': {
          fn: () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            const target = 500;
            for (let i = 0; i < arr.length; i++) {
              if (arr[i] === target) return i;
            }
            return -1;
          },
        },

        'Array.findIndex()': {
          fn: () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            return arr.findIndex((x) => x === 500);
          },
        },
      },
    },
  },
};
```

### Async Benchmarks

```javascript
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
          fn: () => new Promise((resolve) => setTimeout(resolve, 0)),
        },

        'Fetch Simulation': {
          fn: async () => {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1));
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
```

## Configuration

### Project Configuration File

Create `modestbench.config.json`:

```json
{
  "concurrent": false,
  "exclude": ["node_modules/**", "dist/**"],
  "historyLimit": 50,
  "iterations": 1000,
  "outputDir": "./benchmark-results",
  "pattern": "benchmarks/**/*.bench.{js,ts}",
  "reporters": ["human", "json"],
  "timeout": 30000,
  "warmup": true
}
```

### TypeScript Configuration

For TypeScript projects, create `modestbench.config.ts`:

```typescript
import { ModestBenchConfig } from 'modestbench';

const config: ModestBenchConfig = {
  pattern: 'src/**/*.bench.ts',
  reporters: ['human', 'csv'],
  iterations: 2000,
  concurrent: true,
  outputDir: './reports',
};

export default config;
```

## Command Reference

### Run Benchmarks

```bash
# Basic execution
modestbench run

# With options
modestbench run \
  --pattern "src/**/*.bench.ts" \
  --reporters human,json,csv \
  --output ./results \
  --iterations 2000 \
  --concurrent \
  --timeout 60000
```

### View History

```bash
# List recent runs
modestbench history list

# Show specific run details
modestbench history show <run-id>

# Compare two runs
modestbench history compare <run-id-1> <run-id-2>

# View trends
modestbench history trends --since 2025-10-01

# Export data
modestbench history export --format csv --output results.csv
```

### Project Management

```bash
# Initialize new project
modestbench init --examples --config-type typescript

# Validate benchmark files
modestbench validate --strict

# Clean old history
modestbench history clean --older-than 30d
```

## Output Formats

### Human-Readable (Default)

```
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

## Performance Tips

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
modestbench run --warmup --iterations 5000
```

### Debugging

```bash
# Verbose output
modestbench run --verbose

# Validate files first
modestbench validate --strict

# Check configuration
modestbench run --dry-run
```

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/benchmarks.yml
name: Performance Benchmarks
on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npm run build

      - name: Run Benchmarks
        run: |
          modestbench run \
            --reporters json,csv \
            --output ./benchmark-results

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: ./benchmark-results/
```

### Performance Regression Detection

```javascript
// scripts/check-performance.js
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Run benchmarks and get JSON output
execSync('modestbench run --reporters json --output ./tmp');
const results = JSON.parse(readFileSync('./tmp/results.json'));

// Compare with baseline
const baseline = JSON.parse(readFileSync('./baseline-results.json'));

for (const result of results.results) {
  const baselineResult = baseline.results.find(
    (r) =>
      r.file === result.file &&
      r.suite === result.suite &&
      r.task === result.task,
  );

  if (baselineResult) {
    const regression = (baselineResult.hz - result.hz) / baselineResult.hz;
    if (regression > 0.1) {
      // 10% regression threshold
      console.error(
        `Performance regression detected in ${result.task}: ${(regression * 100).toFixed(1)}%`,
      );
      process.exit(1);
    }
  }
}
```

## Next Steps

1. **Explore Examples**: Run `modestbench init --examples` to see more patterns
2. **Read the API Docs**: Check out the full API documentation
3. **Join the Community**: Get help and share benchmarks
4. **Contribute**: Help improve ModestBench on GitHub

For more detailed documentation, visit: [https://modestbench.dev/docs](https://modestbench.dev/docs)
