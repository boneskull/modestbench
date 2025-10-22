---
title: Advanced Usage
description: Advanced features and patterns for modestbench
---

## Multiple Suites

Organize related benchmarks into separate suites with independent setup and teardown:

```javascript
const state = {
  data: [],
  sortedData: [],
};

export default {
  suites: {
    Sorting: {
      setup() {
        state.data = generateTestData(1000);
      },
      teardown() {
        state.data = [];
      },
      benchmarks: {
        'Quick Sort': () => quickSort(state.data),
        'Merge Sort': () => mergeSort(state.data),
        'Bubble Sort': () => bubbleSort(state.data),
      },
    },

    Searching: {
      setup() {
        state.sortedData = generateSortedData(10000);
      },
      teardown() {
        state.sortedData = [];
      },
      benchmarks: {
        'Binary Search': () => binarySearch(state.sortedData, 5000),
        'Linear Search': () => linearSearch(state.sortedData, 5000),
        'Jump Search': () => jumpSearch(state.sortedData, 5000),
      },
    },
  },
};
```

### Suite Lifecycle

1. **setup()** - Called once before any tasks in the suite run
2. **Tasks execute** - Each task runs with its configured iterations
3. **teardown()** - Called once after all tasks complete

:::tip[Shared State]
Use module-level variables for state shared across suites. Each suite's setup/teardown manages its own portion of state.
:::

## Async Operations

ModestBench fully supports asynchronous benchmarks:

### Async Functions

```javascript
export default {
  suites: {
    'Async Performance': {
      benchmarks: {
        // Simple async benchmark
        'Promise.resolve()': async () => {
          return await Promise.resolve('test');
        },

        // With configuration
        'Fetch Simulation': {
          async fn() {
            const response = await simulateApiCall();
            return response.json();
          },
          config: {
            iterations: 100, // Fewer iterations for slow operations
          },
        },
      },
    },
  },
};
```

### Async Setup/Teardown

```javascript
export default {
  suites: {
    'Database Operations': {
      async setup() {
        this.db = await connectDatabase();
        await this.db.seed();
      },
      
      async teardown() {
        await this.db.close();
      },
      
      benchmarks: {
        'Read Query': async function() {
          return await this.db.query('SELECT * FROM users LIMIT 100');
        },
        
        'Write Query': async function() {
          return await this.db.insert({ name: 'Test User' });
        },
      },
    },
  },
};
```

:::caution[Timing Considerations]
Async operations include overhead from promises and event loop scheduling. Results reflect real-world async performance.
:::

## Tagging and Filtering

### Tag Cascading

Tags cascade from file → suite → task levels:

```javascript
export default {
  // File-level tags (inherited by all suites and tasks)
  tags: ['performance', 'core'],

  suites: {
    'String Operations': {
      // Suite-level tags (inherited by all tasks in this suite)
      tags: ['string', 'fast'],

      benchmarks: {
        // Task inherits: ['performance', 'core', 'string', 'fast', 'regex']
        'RegExp Test': {
          fn: () => /pattern/.test(str),
          tags: ['regex'], // Task-specific tags
        },

        // Task inherits: ['performance', 'core', 'string', 'fast']
        'String Includes': () => str.includes('pattern'),
      },
    },
    
    'Array Operations': {
      tags: ['array', 'slow'],
      
      benchmarks: {
        // Task inherits: ['performance', 'core', 'array', 'slow']
        'Array spread': () => {
          let arr = [];
          for (let i = 0; i < 1000; i++) {
            arr = [...arr, i];
          }
          return arr;
        },
      },
    },
  },
};
```

### Filtering Examples

```bash
# Run only fast benchmarks
modestbench run --tags fast
# Runs: 'RegExp Test', 'String Includes'

# Run string OR array benchmarks
modestbench run --tags string,array
# Runs: All tasks in 'String Operations' and 'Array Operations'

# Exclude slow benchmarks
modestbench run --exclude-tags slow
# Runs: Only 'String Operations' tasks

# Combine: run fast benchmarks except experimental
modestbench run --tags fast --exclude-tags experimental
```

### Suite Lifecycle with Filtering

Suite `setup()` and `teardown()` only run if at least one task in the suite matches the filter:

```javascript
export default {
  suites: {
    'Expensive Setup': {
      setup() {
        console.log('This only runs if at least one task will execute');
        this.expensiveResource = createExpensiveResource();
      },
      
      teardown() {
        console.log('This only runs if setup ran');
        this.expensiveResource.destroy();
      },
      
      benchmarks: {
        'Fast Task': {
          fn() { /* ... */ },
          tags: ['fast'],
        },
        'Slow Task': {
          fn() { /* ... */ },
          tags: ['slow'],
        },
      },
    },
  },
};
```

```bash
# Setup and teardown run (Fast Task matches)
modestbench run --tags fast

# Setup and teardown DON'T run (Slow Task excluded)
modestbench run --exclude-tags slow
```

## Custom Task Configuration

Configure individual tasks with specific settings:

```javascript
export default {
  suites: {
    'Custom Configs': {
      benchmarks: {
        // Default configuration
        'Standard Task': () => someOperation(),

        // Custom iterations
        'High Sample Task': {
          fn: () => criticalOperation(),
          config: {
            iterations: 10000,
            warmup: 200,
          },
        },

        // Custom timeout for slow operations
        'Slow Operation': {
          fn: async () => await slowAsyncOperation(),
          config: {
            timeout: 60000, // 60 seconds
            iterations: 10,  // Fewer samples
          },
        },
      },
    },
  },
};
```

## Environment-Specific Benchmarks

Use JavaScript config files for dynamic configuration:

```javascript
// modestbench.config.js
const isCI = process.env.CI === 'true';
const isProd = process.env.NODE_ENV === 'production';

export default {
  iterations: isCI ? 5000 : 100,
  warmup: isCI ? 100 : 0,
  reporters: isCI ? ['json', 'csv'] : ['human'],
  quiet: isCI,
  outputDir: isCI ? './benchmark-results' : undefined,
  
  // Only run critical benchmarks in CI
  tags: isCI ? ['critical'] : [],
  
  // Exclude slow benchmarks in development
  excludeTags: isProd ? [] : ['slow'],
};
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Performance Tests
on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Run benchmarks
        run: |
          modestbench run \
            --reporters json,csv \
            --output ./results \
            --quiet \
            --tags critical
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: ./results/
      
      - name: Check for regressions
        run: node scripts/check-regression.js
```

### Performance Regression Detection

```javascript
// scripts/check-regression.js
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Run current benchmarks
execSync('modestbench run --reporters json --output ./current', {
  stdio: 'inherit',
});

const current = JSON.parse(
  readFileSync('./current/results.json', 'utf8')
);

// Load baseline results
const baseline = JSON.parse(
  readFileSync('./baseline/results.json', 'utf8')
);

let hasRegression = false;

// Check for significant regressions
for (const result of current.results) {
  const baselineResult = baseline.results.find(
    (r) => r.file === result.file && r.task === result.task
  );

  if (baselineResult) {
    const regression =
      (baselineResult.opsPerSecond - result.opsPerSecond) /
      baselineResult.opsPerSecond;

    if (regression > 0.1) {
      // 10% regression threshold
      console.error(
        `❌ Performance regression in ${result.task}: ${(
          regression * 100
        ).toFixed(1)}% slower`
      );
      console.error(`   Baseline: ${baselineResult.opsPerSecond.toFixed(2)} ops/sec`);
      console.error(`   Current:  ${result.opsPerSecond.toFixed(2)} ops/sec`);
      hasRegression = true;
    } else if (regression < -0.1) {
      // 10% improvement
      console.log(
        `✅ Performance improvement in ${result.task}: ${(
          Math.abs(regression) * 100
        ).toFixed(1)}% faster`
      );
    }
  }
}

if (hasRegression) {
  console.error('\n❌ Performance regressions detected!');
  process.exit(1);
} else {
  console.log('\n✅ No performance regressions detected!');
}
```

## Historical Tracking

ModestBench automatically saves results to `.modestbench/history/`. Use the history commands for analysis:

### View History

```bash
# List recent runs
modestbench history list

# Show specific run
modestbench history show run-2025-10-07-001

# Compare two runs
modestbench history compare \
  run-2025-10-07-001 \
  run-2025-10-07-002
```

### Export Historical Data

```bash
# Export to CSV for analysis
modestbench history export \
  --format csv \
  --output historical-data.csv

# Export to JSON
modestbench history export \
  --format json \
  --output historical-data.json
```

### Cleanup Old Data

```bash
# Clean runs older than 30 days
modestbench history clean --older-than 30d

# Keep only last 10 runs
modestbench history clean --keep 10

# Clean by size
modestbench history clean --max-size 100mb
```

## Programmatic API

Use modestbench programmatically in your own tools:

```typescript
import { modestbench, HumanReporter } from 'modestbench';

// Initialize the engine
const engine = modestbench();

// Register reporters
engine.registerReporter('human', new HumanReporter());

// Execute benchmarks
const result = await engine.execute({
  pattern: '**/*.bench.js',
  iterations: 1000,
  warmup: 50,
  reporters: ['human'],
});

// Process results
if (result.summary.failedTasks > 0) {
  console.error('Some benchmarks failed');
  process.exit(1);
}
```

:::note[API Documentation]
Full API documentation is coming soon. See the [API reference](/reference/api/) for future typedoc integration.
:::

## Handling Fast Operations

Extremely fast operations (<1ns) can cause overflow errors. modestbench handles this automatically:

```javascript
export default {
  suites: {
    'Ultra Fast Operations': {
      benchmarks: {
        // ModestBench will automatically adjust time budget for very fast ops
        'Variable Read': () => {
          const x = 42;
          return x;
        },
        
        // For ultra-fast operations, reduce iterations
        'Constant Return': {
          fn: () => 42,
          config: {
            iterations: 100, // Lower sample count
          },
        },
      },
    },
  },
};
```

:::tip[Internal Handling]
modestbench caps time budgets at 2000ms and retries with minimal time (10ms) if overflow errors occur.
:::

## Memory Profiling Context

Benchmark results include memory information:

```json
{
  "environment": {
    "memory": {
      "total": 51539607552,
      "totalGB": 48.0,
      "free": 12884901888,
      "freeGB": 12.0
    }
  }
}
```

Track memory usage across runs to identify memory-intensive operations.

## Concurrent Execution

:::caution[Experimental]
Concurrent execution is experimental and may produce inconsistent results.
:::

Run benchmark files concurrently for faster execution:

```bash
modestbench run --concurrent
```

**Considerations:**

- Files run in parallel, but tasks within a file run sequentially
- May cause resource contention on systems with limited CPU/memory
- Results may vary between runs due to system load
- Not recommended for accurate performance measurements

## Troubleshooting

### High Margin of Error

If benchmarks show high margin of error (>5%):

1. **Increase warmup iterations**: `--warmup 100`
2. **Increase sample size**: `--iterations 2000`
3. **Close other applications** to reduce system load
4. **Use time-based limiting**: `--time 10000 --limit-by time`

### Timeouts

If benchmarks timeout:

1. **Increase timeout**: `--timeout 60000`
2. **Reduce iterations**: `--iterations 10`
3. **Check for infinite loops** in benchmark code

### Inconsistent Results

If results vary significantly between runs:

1. **Use warmup iterations**: `--warmup 100`
2. **Increase sample size**: `--iterations 5000`
3. **Run in isolation** (no other processes)
4. **Check for async operations** completing outside benchmark scope

## Best Practices

### 1. Isolate Benchmarks

Each benchmark should test one specific operation:

```javascript
// ❌ Bad: Testing multiple things
'Bad Benchmark': () => {
  const arr = [];
  for (let i = 0; i < 1000; i++) {
    arr.push(i);
  }
  return arr.sort();
};

// ✅ Good: Isolated operations
'Array Push': () => {
  const arr = [];
  for (let i = 0; i < 1000; i++) {
    arr.push(i);
  }
  return arr;
},
'Array Sort': () => {
  const arr = Array.from({ length: 1000 }, (_, i) => i);
  return arr.sort();
},
```

### 2. Avoid Side Effects

Keep benchmarks pure and repeatable:

```javascript
// ❌ Bad: Modifying external state
let counter = 0;
'Bad Benchmark': () => {
  counter++;
  return counter;
};

// ✅ Good: No external state
'Good Benchmark': () => {
  let counter = 0;
  counter++;
  return counter;
};
```

### 3. Use Warmup for JIT

Enable warmup for operations that benefit from JIT optimization:

```javascript
export default {
  suites: {
    'JIT-Optimized Operations': {
      benchmarks: {
        'Math Operations': {
          fn: () => Math.sqrt(42) * Math.PI,
          config: {
            warmup: 100,
            iterations: 5000,
          },
        },
      },
    },
  },
};
```

### 4. Tag Strategically

Use tags to organize and filter benchmarks:

```javascript
export default {
  tags: ['core'], // Project-wide tag
  
  suites: {
    'Critical Path': {
      tags: ['critical', 'fast'], // Important, quick benchmarks
      benchmarks: { /* ... */ },
    },
    
    'Edge Cases': {
      tags: ['edge-case', 'slow'], // Thorough but slow tests
      benchmarks: { /* ... */ },
    },
  },
};
```

## Next Steps

- Review [Configuration](/guides/configuration/) for all options
- Check [CLI Reference](/guides/cli/) for command details
- See [Output Formats](/guides/output/) for reporter integration
- Read [Architecture](/reference/architecture/) for internals
