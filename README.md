<p align="center">
  <a href="/"><img src="./assets/logo-512.png" width="512px" align="center" alt="modestbench: a full-ass benchmarking framework for Node.js"/></a>
  <h1 align="center"><span class="modestbench"><code>modestbench</code><span></h1>
  <p align="center">
    <em>“A full-ass benchmarking framework for Node.js”</em>
    <br/>
    <small>by <a href="https://github.com/boneskull" title="@boneskull on GitHub">@boneskull</a></small>
  </p>
</p>

## Features

- **Fast & Accurate**: High-precision timing with statistical analysis
- **Multiple Output Formats**: Human-readable, JSON, and CSV reports (at the same time!!)
- **Historical Tracking**: Store and compare benchmark results over time
- **Tagging System**: Organize and filter benchmarks by categories
- **CLI & API**: Command-line interface and programmatic API
- **TypeScript Support**: Full type safety

In summary, **modestbench** wraps [tinybench][] and enhances it with a bunch of crap so you don't have to think.

## Quick Start

### Installation

The usual suspects:

```bash
npm install --save-dev modestbench
```

### Optional: Initialize a Project

The `modestbench` CLI provides a `init` command. This command:

1. Generates a configuration file in a format of your choosing
2. Creates an example benchmark file
3. Appends `.modestbench/` to `.gitignore` to exclude historical data from version control

```bash
# Initialize with examples and configuration
modestbench init

# Or specify project type and config format
modestbench init advanced --config-type typescript
```

**Project Types:**

- `basic` - Simple setup for small projects (100 iterations, human reporter)
- `advanced` - Feature-rich with multiple reporters and structured output (1000 iterations, warmup, human + JSON reporters)
- `library` - Optimized for library performance testing (5000 iterations, high warmup, human + JSON reporters, organized suite structure)

### My First Benchmark

> **_PRO TIP_**: The convention for **modestbench** benchmark files is to use the `.bench.js` or `.bench.ts` extension.

**modestbench** supports two formats for defining benchmarks:

#### Simplified Format (Recommended for Simple Cases)

For quick benchmarks with just a few tasks, you can use the simplified format:

```javascript
// benchmarks/example.bench.js
export default {
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
};
```

#### Suite-Based Format (For Complex Projects)

When you need to organize benchmarks into groups with setup/teardown hooks:

```javascript
// benchmarks/example.bench.js
export default {
  suites: {
    'Array Operations': {
      benchmarks: {
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

**When to use each format:**

> - **Simplified format**: Quick benchmarks, single file with related tasks, no setup/teardown needed
> - **Suite format**: Complex projects, multiple groups of benchmarks, need setup/teardown hooks, or want explicit organization

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
- [Programmatic API](#programmatic-api) - Using **modestbench** programmatically

See the **[examples directory](examples/README.md)** for additional guides and sample code.

## CLI Commands

### Run Benchmarks

Run benchmarks with sensible defaults:

```bash
# Run benchmarks in current directory and bench/ (top-level only)
modestbench run

# Run all benchmarks in a directory (searches recursively)
modestbench run benchmarks/

# Run benchmarks from multiple directories
modestbench run src/perf/ tests/benchmarks/

# Run specific files
modestbench run benchmarks/critical.bench.js

# Mix files, directories, and glob patterns
modestbench run file.bench.js benchmarks/ "tests/**/*.bench.ts"

# With options
modestbench run \
  --config ./config.json \
  --iterations 2000 \
  --reporters human,json,csv \
  --output ./results \
  --tags performance,algorithm \
  --concurrent
```

**Supported file extensions:**

- JavaScript: `.js`, `.mjs`, `.cjs`
- TypeScript: `.ts`, `.mts`, `.cts`

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

#### Filtering by Tags

Run specific subsets of benchmarks using tags:

```bash
# Run only benchmarks tagged with 'fast'
modestbench run --tags fast

# Run benchmarks with multiple tags (OR logic - matches ANY)
modestbench run --tags string,array,algorithm

# Exclude specific benchmarks
modestbench run --exclude-tags slow,experimental

# Combine: run fast benchmarks except experimental ones
modestbench run --tags fast --exclude-tags experimental
```

**Key Features:**

- Tags cascade from file → suite → task levels
- `--tags` uses OR logic (matches ANY specified tag)
- `--exclude-tags` takes precedence over `--tags`
- Suite setup/teardown only runs if at least one task matches

See [Tagging and Filtering](#tagging-and-filtering) for detailed examples.

### History Management

**modestbench** automatically tracks benchmark results over time in a local `.modestbench/` directory. This history enables you to:

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
  "excludeTags": ["slow", "experimental"], // Tags to exclude from execution
  "iterations": 1000, // Number of samples per benchmark
  "limitBy": "iterations", // Limit mode: 'iterations', 'time', 'any', 'all'
  "outputDir": "./benchmark-results", // Directory for results and reports
  "pattern": "benchmarks/**/*.bench.{js,ts}", // Glob pattern to discover benchmark files
  "quiet": false, // Minimal output mode
  "reporters": ["human", "json"], // Output reporters to use
  "tags": ["fast", "critical"], // Tags to include (if empty, all benchmarks run)
  "time": 5000, // Time budget in ms per benchmark
  "timeout": 30000, // Task timeout in ms
  "verbose": false, // Detailed output with debugging info
  "warmup": 50, // Warmup iterations before measurement
}
```

**Configuration Options:**

- `pattern` - Glob pattern(s) to discover benchmark files (can be string or array)
- `exclude` - Glob patterns for files/directories to exclude from discovery
- `excludeTags` - Array of tags to exclude from execution; benchmarks with ANY of these tags will be skipped (default: [])
- `iterations` - Number of samples to collect per benchmark task (default: 100)
- `time` - Time budget in milliseconds per benchmark task (default: 1000)
- `limitBy` - How to limit benchmarks: `"iterations"` (sample count), `"time"` (time budget), `"any"` (whichever comes first), or `"all"` (both thresholds required)
- `warmup` - Number of warmup iterations before measurement begins (default: 0)
- `timeout` - Maximum time in milliseconds for a single task before timing out (default: 30000)
- `bail` - Stop execution on first benchmark failure (default: false)
- `reporters` - Array of reporter names to use for output (available: `"human"`, `"json"`, `"csv"`)
- `outputDir` - Directory path for saving benchmark results and reports
- `quiet` - Minimal output mode, suppresses non-essential messages (default: false)
- `tags` - Array of tags to include; if non-empty, only benchmarks with ANY of these tags will run (default: [])
- `verbose` - Detailed output mode with additional debugging information (default: false)

> **Note:** Smart defaults apply for `limitBy` based on which options you provide. See [Controlling Benchmark Limits](#controlling-benchmark-limits) for details.

### Configuration File Support

**modestbench** supports multiple configuration file formats, powered by [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig):

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

**Configuration Discovery**: **modestbench** automatically searches for configuration files in the current directory and parent directories, following standard conventions.

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

**modestbench** supports a powerful tagging system that lets you organize and selectively run benchmarks. Tags can be applied at three levels: file, suite, and task. Tags automatically cascade from parent to child, so tasks inherit tags from their suite and file.

#### Adding Tags

Tags can be added at any level:

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
  },
};
```

#### Filtering Benchmarks

Use `--tags` to include only benchmarks with specific tags (OR logic - matches ANY tag):

```bash
# Run only fast algorithms
modestbench run --tags fast

# Run benchmarks tagged with 'string' OR 'array'
modestbench run --tags string,array

# Multiple tags can be space-separated too
modestbench run --tags fast optimized
```

Use `--exclude-tags` to skip benchmarks with specific tags:

```bash
# Exclude slow benchmarks
modestbench run --exclude-tags slow

# Exclude experimental and unstable benchmarks
modestbench run --exclude-tags experimental,unstable
```

Combine both to fine-tune your benchmark runs (exclusion takes precedence):

```bash
# Run fast benchmarks, but exclude experimental ones
modestbench run --tags fast --exclude-tags experimental

# Run algorithm benchmarks but skip slow reference implementations
modestbench run --tags algorithm --exclude-tags slow,reference
```

#### Tag Cascading Example

```javascript
export default {
  tags: ['file-level'], // All tasks get this tag

  suites: {
    'Fast Suite': {
      tags: ['fast'], // Tasks get: ['file-level', 'fast']
      benchmarks: {
        'Task A': {
          fn: () => {},
          tags: ['math'], // This task has: ['file-level', 'fast', 'math']
        },
        'Task B': () => {}, // This task has: ['file-level', 'fast']
      },
    },
  },
};
```

**Filtering Behavior:**

- `--tags math` → Runs only Task A (matches 'math')
- `--tags fast` → Runs both Task A and Task B (both have 'fast')
- `--tags file-level` → Runs both tasks (both inherit 'file-level')
- `--exclude-tags math` → Runs only Task B (Task A excluded)

#### Suite Lifecycle with Filtering

Suite `setup()` and `teardown()` only run if at least one task in the suite matches the filter. This prevents unnecessary setup work for filtered-out suites.

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

We welcome contributions! Please see our [Contributing Guide][contributing] for details.

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

- Built on top of the small-but-mighty benchmarking library, [tinybench][]
- Interface inspired by good ol' [Benchmark.js][]
- Built with [zshy][] for dual ESM/CJS modules

## Resources

- [Issue Tracker][bugs]
- [Discussions][]

## License

Copyright © 2025 [Christopher Hiller](https://github.com/boneskull). Licensed under the [Blue Oak Model License 1.0.0][license].

[license]: https://blueoakcouncil.org/license/1.0.0
[tinybench]: https://github.com/tinylibs/tinybench
[benchmark.js]: https://benchmarkjs.com/
[bugs]: https://github.com/boneskull/modestbench/issues
[discussions]: https://github.com/boneskull/modestbench/discussions
[zshy]: https://github.com/colinhacks/zshy
[contributing]: CONTRIBUTING.md
