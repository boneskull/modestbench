---
title: Advanced Usage
description: Advanced features and patterns for modestbench
---

## Benchmark Engines

ModestBench provides two engines with different performance characteristics and statistical approaches.

### Engine Selection

Choose an engine based on your requirements:

```bash
# Tinybench engine (default) - fast development iteration
modestbench --engine tinybench

# Accurate engine - high-precision measurements
node --allow-natives-syntax ./node_modules/.bin/modestbench --engine accurate
```

### Statistical Improvements

Both engines now use **IQR (Interquartile Range) outlier removal** to filter extreme values caused by:

- Garbage collection pauses
- System interruptions
- Background processes
- OS scheduler variations

This results in more stable and reliable measurements compared to raw statistical analysis.

#### AccurateEngine Statistical Features

The `accurate` engine provides enhanced statistical analysis:

1. **V8 Optimization Guards**: Uses V8 intrinsics (`%NeverOptimizeFunction`) to prevent JIT compiler interference with measurements
2. **IQR Outlier Removal**: Automatically removes extreme outliers (beyond Q1 - 1.5×IQR and Q3 + 1.5×IQR)
3. **Comprehensive Statistics**:
   - Mean, min, max execution times
   - Standard deviation and variance
   - **Coefficient of Variation (CV)**: Measures relative variability (`stdDev / mean × 100`)
   - 95th and 99th percentiles
   - Margin of error (95% confidence interval)

#### Coefficient of Variation (CV)

The CV metric helps assess benchmark quality:

```text
CV < 5%    → Excellent (very stable)
CV 5-10%   → Good (acceptable variance)
CV 10-20%  → Fair (consider more samples)
CV > 20%   → Poor (investigate noise sources)
```

Example output showing CV:

```bash
$ modestbench --engine accurate --allow-natives-syntax --reporters json
{
  "name": "Array.push()",
  "mean": 810050,  // nanoseconds
  "stdDev": 19842,
  "cv": 2.45,      // 2.45% - excellent stability
  "marginOfError": 0.024,
  "p95": 845200,
  "p99": 862100
}
```

### Performance Comparison

Real-world comparison using `examples/benchmarks`:

```bash
# Tinybench (fast iteration)
$ modestbench --engine tinybench --reporters json
# Typical run time: 3-5 seconds for 5 benchmark files

# Accurate (high precision)
$ node --allow-natives-syntax ./node_modules/.bin/modestbench --engine accurate --reporters json
# Typical run time: 8-12 seconds for 5 benchmark files
```

The `accurate` engine takes ~2-3x longer but provides:

- More consistent results between runs
- Better outlier filtering with V8 guards
- Higher confidence in micro-optimizations

### Choosing the Right Engine

| Use Case | Recommended Engine |
|----------|-------------------|
| Development iteration | `tinybench` |
| CI/CD regression tests | `tinybench` |
| Blog post/publication | `accurate` |
| Library optimization | `accurate` |
| Micro-benchmark comparison | `accurate` |
| Algorithm selection | Either (results typically consistent) |

:::tip[Best Practice]
Start with `tinybench` during development for fast feedback. Switch to `accurate` for final measurements and critical decisions.
:::

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
modestbench --tags fast
# Runs: 'RegExp Test', 'String Includes'

# Run string OR array benchmarks
modestbench --tags string,array
# Runs: All tasks in 'String Operations' and 'Array Operations'

# Exclude slow benchmarks
modestbench --exclude-tags slow
# Runs: Only 'String Operations' tasks

# Combine: run fast benchmarks except experimental
modestbench --tags fast --exclude-tags experimental
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
modestbench --tags fast

# Setup and teardown DON'T run (Slow Task excluded)
modestbench --exclude-tags slow
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
  reporters: isCI ? ['json', 'csv'] : ['simple'], // Simple reporter for CI, auto-detect for local
  quiet: isCI,
  outputDir: isCI ? './benchmark-results' : undefined,
  
  // Only run critical benchmarks in CI
  tags: isCI ? ['critical'] : [],
  
  // Exclude slow benchmarks in development
  excludeTags: isProd ? [] : ['slow'],
};
```

:::tip[Reporter Auto-Selection]
You can omit the `reporters` option entirely to let modestbench auto-select based on the environment (TTY detection).
:::

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
          modestbench \
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
execSync('modestbench --reporters json --output ./current', {
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

ModestBench automatically saves results to `.modestbench/history/`. Use the history commands for performance analysis, regression detection, and trend visualization.

### Viewing Run History

List and filter historical benchmark runs:

```bash
# List recent runs
modestbench history list

# List with details (JSON format)
modestbench history list --format json

# Limit number of runs shown
modestbench history list --limit 10

# Filter by date range
modestbench history list --since "7 days ago"
modestbench history list --since 2025-01-01 --until 2025-12-31

# Filter by pattern (file path matching)
modestbench history list --pattern "**/*string*"

# Filter by tags
modestbench history list --tags performance,critical
```

### Date Range Filtering

ModestBench supports flexible date formats for filtering:

```bash
# ISO 8601 dates
modestbench history list --since 2025-10-01T00:00:00Z

# Relative dates
modestbench history list --since "1 week ago"
modestbench history list --since "3 days ago"

# Shorthand formats
modestbench history list --since 1d    # 1 day ago
modestbench history list --since 2w    # 2 weeks ago
modestbench history list --since 1m    # 1 month ago
modestbench history list --since 6h    # 6 hours ago
```

### Show Specific Run

View detailed information about a specific benchmark run:

```bash
# Human-readable format
modestbench history show run-2025-10-07-001

# JSON format for parsing
modestbench history show run-2025-10-07-001 --format json
```

### Comparing Runs

Compare two benchmark runs with detailed task-by-task analysis:

```bash
# Compare two specific runs
modestbench history compare run-2025-10-07-001 run-2025-10-07-002

# JSON output for scripting
modestbench history compare run-2025-10-07-001 run-2025-10-07-002 --format json
```

**Human Output:**

```text
Comparing runs:
  Run 1: run-2025-10-07-001 (10/7/2025, 10:30:45 AM)
  Run 2: run-2025-10-07-002 (10/7/2025, 11:45:12 AM)

Summary comparison:
  Files: 3 vs 3
  Tasks: 12 vs 12
  Passed: 12 vs 12
  Failed: 0 vs 0

Task-by-task comparison:

  String Operations › concat vs join
    Mean: 0.052ms → 0.048ms (-7.7%)
    Min: 0.048ms → 0.045ms
    Max: 0.068ms → 0.062ms
    Iterations: 1000 vs 1000

  Array Operations › map vs forEach
    Mean: 0.125ms → 0.128ms (+2.4%)
    Min: 0.118ms → 0.121ms
    Max: 0.145ms → 0.149ms
    Iterations: 1000 vs 1000
```

**JSON Output Structure:**

```json
{
  "run1": {
    "id": "run-2025-10-07-001",
    "startTime": "2025-10-07T10:30:45.123Z",
    "endTime": "2025-10-07T10:31:12.456Z",
    "summary": { "totalFiles": 3, "totalTasks": 12 }
  },
  "run2": {
    "id": "run-2025-10-07-002",
    "startTime": "2025-10-07T11:45:12.789Z",
    "endTime": "2025-10-07T11:45:39.012Z",
    "summary": { "totalFiles": 3, "totalTasks": 12 }
  },
  "taskComparisons": [
    {
      "file": "benchmarks/string.bench.js",
      "suite": "String Operations",
      "task": "concat vs join",
      "inBoth": true,
      "percentChange": -7.7,
      "run1": {
        "mean": 52000,
        "min": 48000,
        "max": 68000,
        "iterations": 1000,
        "cv": 5.2
      },
      "run2": {
        "mean": 48000,
        "min": 45000,
        "max": 62000,
        "iterations": 1000,
        "cv": 4.8
      }
    }
  ],
  "tasksOnlyInRun1": [],
  "tasksOnlyInRun2": []
}
```

### Performance Trends Analysis

Analyze performance trends across multiple runs with statistical analysis and visualizations:

```bash
# Show trends for all tasks
modestbench history trends

# Filter by date range
modestbench history trends --since 1w

# Limit number of runs analyzed
modestbench history trends --limit 20

# JSON format for custom analysis
modestbench history trends --format json

# Filter by pattern
modestbench history trends --pattern "**/*array*"
```

**Human Output with Visualizations:**

```text
Performance Trends (15 runs)
Time range: 10/1/2025 to 10/24/2025

Summary:
  ▲ 4 improving  ▼ 2 degrading  → 6 stable

Task Performance Summary:

  ▲ String Operations › concat vs join     -12.5%   ▂▃▄▅█▇▆▅▃
  ▼ Array Operations › map vs forEach      +8.3%    ▇▆▅▄▃▂▃▄█
  → Object Operations › Object.keys        +1.2%    ▄▅▄▃▅▄▅▄▄
  ▲ RegExp › test vs match                 -5.8%    ▇▆▅▄▄▃▃▂▂
  → Function Calls › apply vs call         -0.5%    ▄▅▄▅▄▅▄▄▄

⚠ Regressions Detected:

  ▼ Array Operations › map vs forEach: 8.3% slower (15 runs)

Performance Distribution (top task):
String Operations › concat vs join

  0.045-0.048ms ▇▇▇▇▇▇▇▇▇▇▇▇ 6
  0.048-0.051ms ▇▇▇▇▇▇ 3
  0.051-0.054ms ▇▇▇▇ 2
  0.054-0.057ms ▇▇ 1
  0.057-0.060ms ▇ 1

  Mean: 0.049ms  Median: 0.048ms  StdDev: 0.004ms
```

**Trend Analysis Features:**

- **Statistical Metrics**: Mean, median, variance, standard deviation for each task
- **Trend Classification**: Automatic detection of improving, degrading, or stable trends using linear regression
- **Regression Detection**: Highlights tasks with performance degradation exceeding 5% threshold
- **Sparkline Visualization**: Compact ASCII graphs showing trend direction
- **Bar Chart Histograms**: Performance distribution visualization with synthwave colors
- **Percent Change Calculation**: First-to-last data point comparison

**JSON Output Structure:**

```json
{
  "summary": {
    "totalTasks": 12,
    "runs": 15,
    "improvingTasks": 4,
    "degradingTasks": 2,
    "stableTasks": 6,
    "timespan": {
      "start": "2025-10-01T10:00:00.000Z",
      "end": "2025-10-24T15:30:00.000Z"
    }
  },
  "trends": [
    {
      "task": "String Operations › concat vs join",
      "trend": "improving",
      "runs": 15,
      "percentChange": -12.5,
      "confidence": 95,
      "statistics": {
        "mean": 48500,
        "median": 48000,
        "variance": 16000,
        "stdDeviation": 4000
      },
      "dataPoints": [
        { "date": "2025-10-01T10:00:00.000Z", "mean": 55000 },
        { "date": "2025-10-02T10:00:00.000Z", "mean": 52000 },
        { "date": "2025-10-24T15:30:00.000Z", "mean": 48000 }
      ]
    }
  ],
  "regressions": [
    {
      "task": "Array Operations › map vs forEach",
      "percentChange": 8.3,
      "runs": 15
    }
  ]
}
```

### Export Historical Data

Export benchmark history for external analysis or archival:

```bash
# Export to CSV for analysis
modestbench history export \
  --format csv \
  --output historical-data.csv

# Export to JSON
modestbench history export \
  --format json \
  --output historical-data.json

# Export filtered data
modestbench history export \
  --since 1m \
  --pattern "**/*critical*" \
  --format json \
  --output critical-benchmarks.json
```

### Cleanup Old Data

Manage historical data storage:

```bash
# Clean runs older than 30 days
modestbench history clean --older-than 30d

# Keep only last 10 runs
modestbench history clean --keep 10

# Clean by size
modestbench history clean --max-size 100mb
```

### Using History in CI/CD

Track performance trends over time in your CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Monitoring

on:
  push:
    branches: [main]
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install
        run: npm ci
      
      - name: Run benchmarks
        run: modestbench --reporters json
      
      - name: Check for regressions
        run: |
          # Compare with baseline
          LATEST=$(modestbench history list --format json | jq -r '.[0].id')
          BASELINE=$(modestbench history list --format json | jq -r '.[1].id')
          
          # Get comparison data
          modestbench history compare "$BASELINE" "$LATEST" --format json > comparison.json
          
          # Check for regressions (>5% slower)
          node scripts/check-trends.js
```

**Regression Check Script:**

```javascript
// scripts/check-trends.js
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Get trends data
const trendsOutput = execSync(
  'modestbench history trends --format json --limit 10',
  { encoding: 'utf8' }
);

const { regressions } = JSON.parse(trendsOutput);

if (regressions.length > 0) {
  console.error('⚠️  Performance Regressions Detected:\n');
  
  for (const regression of regressions) {
    console.error(
      `  ▼ ${regression.task}: ${regression.percentChange.toFixed(1)}% slower`
    );
  }
  
  process.exit(1);
} else {
  console.log('✅ No performance regressions detected');
}
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
modestbench --concurrent
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
