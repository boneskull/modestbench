# modestbench

A modern, TypeScript-first benchmarking framework designed for simplicity, accuracy, and comprehensive performance analysis. **modestbench** provides real-time progress tracking, multiple output formats, and extensive configuration options for all your performance testing needs.

## Features

- **Fast & Accurate**: High-precision timing with statistical analysis
- **Real-time Progress**: Live progress bars and ETA calculations
- **Multiple Output Formats**: Human-readable, JSON, and CSV reports
- **Flexible Configuration**: JSON, YAML, JavaScript, and TypeScript configuration files
- **Historical Tracking**: Store and compare benchmark results over time
- **Tagging System**: Organize and filter benchmarks by categories
- **Async Support**: First-class support for asynchronous operations
- **CLI & API**: Command-line interface and programmatic API
- **TypeScript Support**: Full type safety and IntelliSense

## Quick Start

### Installation

```bash
# Or add to your project
npm install --save-dev modestbench
```

### Optional: Initialize a Project

The `init` command helps you get started by generating a configuration file and example benchmarks. This step is **optional** - you can create benchmark files manually if you prefer.

```bash
# Initialize with examples and configuration
modestbench init

# Or specify project type and config format
modestbench init advanced --config-type typescript
```

**Project Types:**

- `basic` - Simple setup for small projects (100 iterations, human reporter)
- `advanced` - Feature-rich with multiple reporters and structured output (1000 iterations, warmup, human + JSON reporters)
- `library` - Optimized for library performance testing (5000 iterations, high warmup, all reporters, organized suite structure)

### Create Your First Benchmark

```javascript
// benchmarks/example.bench.js
export default {
  suites: {
    'Array Operations': {
      benchmarks: {
        // Shorthand syntax: just pass a function directly
        'Array.push()': () => {
          const arr = [];
          for (let i = 0; i < 1000; i++) {
            arr.push(i);
          }
          return arr;
        },

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

### Running Your First Benchmarks

```bash
# Run all benchmarks
modestbench run

# Run with specific options
modestbench run --iterations 5000 --reporters human,json
```

### View Results

```text
🚀 ModestBench

Environment:
  Node.js: v24.10.0
  Platform: darwin arm64
  CPU: Apple M4 Max (16 cores)
  Memory: 48.0 GB

Found 1 benchmark file(s)

▶ benchmarks/example.bench.js

  ▶ Array Operations
    ✓ Array.push()
      810.05μs ±2.45% (1.23M ops/sec)
    ✓ Array spread
      81.01ms ±4.12% (12.34K ops/sec)
  ✓ 2 passed

  ✓ All 2 tasks passed

📊 Results

✓ All tests passed: 2
📁 Files: 1
📊 Suites: 1
⏱️ Duration: 1.82s

🎉 All benchmarks completed successfully!
```

## Getting Started

Jump to:

- [Quick Start](#quick-start) - Basic concepts and your first benchmark
- [Configuration](#configuration) - Project and runtime configuration options
- [Advanced Features](#advanced-features) - Multiple suites, async operations, and tagging
- [Integration Examples](#integration-examples) - CI/CD integration and performance monitoring
- [Programmatic API](#programmatic-api) - Using ModestBench programmatically

See the **[examples directory](examples/README.md)** for additional guides and sample code.

> **Note:** Detailed documentation is currently under development.

## CLI Commands

### Run Benchmarks

```bash
# Basic usage
modestbench run [patterns...]

# With options
modestbench run \
  --config ./config.json \
  --iterations 2000 \
  --reporters human,json,csv \
  --output ./results \
  --tags performance,algorithm \
  --concurrent
```

#### Controlling Benchmark Limits

The `--limit-by` flag controls whether benchmarks are limited by time, iteration count, or both:

```bash
# Limit by iteration count (fast, predictable sample size)
modestbench run --iterations 100

# Limit by time budget (ensures consistent time investment)
modestbench run --time 5000

# Limit by whichever comes first (safety bounds)
modestbench run --iterations 1000 --time 10000

# Explicit control (overrides smart defaults)
modestbench run --iterations 500 --time 5000 --limit-by time

# Require both thresholds (rare, for statistical rigor)
modestbench run --iterations 100 --time 2000 --limit-by all
```

**Smart Defaults:**

- Only `--iterations` provided → limits by iteration count (fast)
- Only `--time` provided → limits by time budget
- Both provided → stops at whichever comes first (`any` mode)
- Neither provided → uses default iterations (100) with iterations mode

**Modes:**

- `iterations`: Stop after N samples (time budget set to 1ms)
- `time`: Run for T milliseconds (collect as many samples as possible)
- `any`: Stop when either threshold is reached (defaults to iterations behavior for fast completion)
- `all`: Require both time AND iterations thresholds (tinybench default behavior)

### History Management

ModestBench automatically tracks benchmark results over time in a local `.modestbench/` directory. This history enables you to:

- **Track performance trends** - See how your code's performance changes across commits
- **Detect regressions** - Compare current results against previous runs to catch slowdowns
- **Analyze improvements** - Validate that optimizations actually improve performance
- **Document progress** - Export historical data for reports and analysis

```bash
# List recent runs
modestbench history list

# Show detailed results
modestbench history show <run-id>

# Compare two runs
modestbench history compare <run-id-1> <run-id-2>

# Export historical data
modestbench history export --format csv --output results.csv

# Clean old data
modestbench history clean --older-than 30d
```

## Configuration

### Project Configuration

Create `modestbench.config.json`:

```jsonc
{
  "bail": false, // Stop execution on first failure
  "exclude": ["node_modules/**"], // Patterns to exclude from discovery
  "iterations": 1000, // Number of samples per benchmark
  "limitBy": "iterations", // Limit mode: 'iterations', 'time', 'any', 'all'
  "outputDir": "./benchmark-results", // Directory for results and reports
  "pattern": "benchmarks/**/*.bench.{js,ts}", // Glob pattern to discover benchmark files
  "quiet": false, // Minimal output mode
  "reporters": ["human", "json"], // Output reporters to use
  "time": 5000, // Time budget in ms per benchmark
  "timeout": 30000, // Task timeout in ms
  "verbose": false, // Detailed output with debugging info
  "warmup": 50, // Warmup iterations before measurement
}
```

**Configuration Options:**

- `pattern` - Glob pattern(s) to discover benchmark files (can be string or array)
- `exclude` - Glob patterns for files/directories to exclude from discovery
- `iterations` - Number of samples to collect per benchmark task (default: 100)
- `time` - Time budget in milliseconds per benchmark task (default: 1000)
- `limitBy` - How to limit benchmarks: `"iterations"` (sample count), `"time"` (time budget), `"any"` (whichever comes first), or `"all"` (both thresholds required)
- `warmup` - Number of warmup iterations before measurement begins (default: 0)
- `timeout` - Maximum time in milliseconds for a single task before timing out (default: 30000)
- `bail` - Stop execution on first benchmark failure (default: false)
- `reporters` - Array of reporter names to use for output (available: `"human"`, `"json"`, `"csv"`)
- `outputDir` - Directory path for saving benchmark results and reports
- `quiet` - Minimal output mode, suppresses non-essential messages (default: false)
- `verbose` - Detailed output mode with additional debugging information (default: false)

> **Note:** Smart defaults apply for `limitBy` based on which options you provide. See [Controlling Benchmark Limits](#controlling-benchmark-limits) for details.

### Configuration File Support

ModestBench supports multiple configuration file formats, powered by [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig):

- **JSON**: `modestbench.config.json`, `.modestbenchrc.json`, `.modestbenchrc`
- **YAML**: `modestbench.config.yaml`, `modestbench.config.yml`, `.modestbenchrc.yaml`, `.modestbenchrc.yml`
- **JavaScript**: `modestbench.config.js`, `modestbench.config.mjs`, `.modestbenchrc.js`, `.modestbenchrc.mjs`
- **TypeScript**: `modestbench.config.ts`
- **package.json**: Use a `"modestbench"` field

Generate a configuration file using:

```bash
modestbench init --config-type json   # JSON format
modestbench init --config-type yaml   # YAML format
modestbench init --config-type js     # JavaScript format
modestbench init --config-type ts     # TypeScript format
```

**Configuration Discovery**: ModestBench automatically searches for configuration files in the current directory and parent directories, following standard conventions.

## Output Formats

### Human-Readable (Default)

Real-time progress bars with color-coded results and performance summaries.

### JSON Output

Structured data perfect for programmatic analysis and integration:

```json
{
  "results": [
    {
      "file": "example.bench.js",
      "suite": "Array Operations",
      "task": "Array.push()",
      "hz": 1234567.89,
      "stats": {
        "mean": 0.00081,
        "stdDev": 0.00002,
        "marginOfError": 2.45
      }
    }
  ],
  "run": {
    "id": "run-2025-10-07-001",
    "timestamp": "2025-10-07T10:30:00.000Z",
    "duration": 15420,
    "status": "completed"
  }
}
```

### CSV Export

Tabular data for spreadsheet analysis and historical tracking.

## Advanced Features

### Multiple Suites

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
      benchmarks: {
        // Shorthand syntax for simple benchmarks
        'Quick Sort': () => quickSort(state.data),
        'Merge Sort': () => mergeSort(state.data),
      },
    },

    Searching: {
      setup() {
        state.sortedData = generateSortedData(10000);
      },
      benchmarks: {
        'Binary Search': () => binarySearch(state.sortedData, 5000),
        'Linear Search': () => linearSearch(state.sortedData, 5000),
      },
    },
  },
};
```

### Async Operations

```javascript
export default {
  suites: {
    'Async Performance': {
      benchmarks: {
        // Shorthand syntax works with async functions too
        'Promise.resolve()': async () => {
          return await Promise.resolve('test');
        },

        // Full syntax when you need config, tags, or metadata
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

### Tagging and Filtering

```javascript
benchmarks: {
  // Use full syntax when you need tags for filtering
  'Fast Algorithm': {
    fn: () => fastOperation(),
    tags: ['algorithm', 'fast', 'optimized']
  },
  'Slow Algorithm': {
    fn: () => slowOperation(),
    tags: ['algorithm', 'slow', 'reference']
  }
}
```

```bash
# Run only fast algorithms
modestbench run --tags fast

# Exclude slow benchmarks
modestbench run --exclude-tags slow
```

## Integration Examples

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
          node-version: 18

      - run: npm ci
      - run: npm run build

      - name: Run Benchmarks
        run: |
          modestbench run \
            --reporters json,csv \
            --output ./results

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: ./results/
```

### Performance Regression Detection

```javascript
// scripts/check-regression.js
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Run current benchmarks
execSync('modestbench run --reporters json --output ./current');
const current = JSON.parse(readFileSync('./current/results.json'));

// Load baseline results
const baseline = JSON.parse(readFileSync('./baseline/results.json'));

// Check for significant regressions
for (const result of current.results) {
  const baselineResult = baseline.results.find(
    (r) => r.file === result.file && r.task === result.task,
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

console.log('No performance regressions detected ✅');
```

## Programmatic API

```typescript
import { modestbench, HumanReporter } from 'modestbench';

// initialize the engine
const engine = modestbench();

engine.registerReporter('human', new HumanReporter());

// Execute benchmarks
const result = await engine.execute({
  pattern: '**/*.bench.js',
  iterations: 1000,
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/boneskull/modestbench.git
cd modestbench

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run examples
npm run examples
```

## Acknowledgments

- Built on top of the mighty [tinybench](https://npm.im/tinybench)
- Inspired by [Benchmark.js](https://benchmarkjs.com/) and `node:test`

## Resources

- [Documentation](https://github.com/boneskull/modestbench#readme)
- [Issue Tracker](https://github.com/boneskull/modestbench/issues)
- [Discussions](https://github.com/boneskull/modestbench/discussions)

## License

Blue Oak Model License 1.0.0 - see [LICENSE](LICENSE.md) file for details.

---

**modestbench** - Modest in name, mighty in performance! 🚀
