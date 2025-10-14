# modestbench

A modern, TypeScript-first benchmarking framework designed for simplicity, accuracy, and comprehensive performance analysis. **modestbench** provides real-time progress tracking, multiple output formats, and extensive configuration options for all your performance testing needs.

## Features

- **Fast & Accurate**: High-precision timing with statistical analysis
- **Real-time Progress**: Live progress bars and ETA calculations
- **Multiple Output Formats**: Human-readable, JSON, and CSV reports
- **Flexible Configuration**: JSON configuration files (YAML, JS, TS support planned)
- **Historical Tracking**: Store and compare benchmark results over time
- **Tagging System**: Organize and filter benchmarks by categories
- **Async Support**: First-class support for asynchronous operations
- **CLI & API**: Command-line interface and programmatic API
- **TypeScript Support**: Full type safety and IntelliSense
- **Validation**: Built-in benchmark file validation and error reporting

## Quick Start

### Installation

```bash
# Install globally
npm install -g modestbench

# Or add to your project
npm install --save-dev modestbench
```

### Create Your First Benchmark

```javascript
// benchmarks/example.bench.js
export default {
  name: 'Array Operations',

  benchmarks: {
    'Array.push()': {
      fn() {
        const arr = [];
        for (let i = 0; i < 1000; i++) {
          arr.push(i);
        }
        return arr;
      },
    },

    'Array spread': {
      fn() {
        let arr = [];
        for (let i = 0; i < 1000; i++) {
          arr = [...arr, i];
        }
        return arr;
      },
    },
  },
};
```

### Run Benchmarks

```bash
# Run all benchmarks
modestbench run

# Run with specific options
modestbench run --iterations 5000 --reporters human,json
```

### View Results

```
┌─────────────────────────────────────────────────────────────┐
│                     Modestbench Results                     │
├─────────────────────────────────────────────────────────────┤
│ File: example.bench.js                                     │
│ Suite: Array Operations                ████████████ 100%   │
├─────────────────────────────────────────────────────────────┤
│ Array.push()     │  1,234,567 ops/sec  │  ±2.45%  │ fastest │
│ Array spread     │     12,345 ops/sec  │  ±4.12%  │  1.0%   │
└─────────────────────────────────────────────────────────────┘
```

## Documentation

### Core Concepts

- **[Getting Started](examples/README.md)**: Basic concepts and your first benchmark
- **[Benchmark Structure](docs/benchmark-structure.md)**: Understanding the benchmark file format
- **[Configuration](docs/configuration.md)**: Project and runtime configuration options
- **[CLI Reference](docs/cli-reference.md)**: Complete command-line interface documentation
- **[API Reference](docs/api-reference.md)**: Programmatic usage and advanced features

### Advanced Topics

- **[Async Benchmarks](docs/async-benchmarks.md)**: Testing asynchronous operations
- **[Performance Optimization](docs/performance-optimization.md)**: Writing efficient benchmarks
- **[CI/CD Integration](docs/ci-cd-integration.md)**: Continuous performance monitoring
- **[Custom Reporters](docs/custom-reporters.md)**: Creating custom output formats

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

### Project Management

```bash
# Initialize new project
modestbench init [type] [options]

# Available types: basic, advanced, library
modestbench init advanced --examples --config typescript

# Note: Only JSON configs are currently loadable by the runtime
```

### Validation

```bash
# Validate benchmark files
modestbench validate [patterns...]

# Strict validation with auto-fix
modestbench validate --strict --fix
```

### History Management

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

```json
{
  "pattern": "benchmarks/**/*.bench.{js,ts}",
  "exclude": ["node_modules/**"],
  "reporters": ["human", "json"],
  "outputDir": "./benchmark-results",
  "iterations": 1000,
  "warmup": 50,
  "concurrent": false,
  "timeout": 30000
}
```

### Configuration File Support

Currently, only JSON configuration files are supported. Support for YAML, JavaScript, and TypeScript configuration files is planned for future releases.

You can generate template configuration files using:

```bash
# Generate JSON config (supported)
modestbench init --config json

# Generate other formats (templates only, not yet loadable)
modestbench init --config yaml
modestbench init --config js
modestbench init --config ts
```

## Output Formats

### Human-Readable (Default)

Real-time progress bars with color-coded results and performance summaries.

### JSON Output

Structured data perfect for programmatic analysis and integration:

```json
{
  "run": {
    "id": "run-2025-10-07-001",
    "timestamp": "2025-10-07T10:30:00.000Z",
    "duration": 15420,
    "status": "completed"
  },
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
  ]
}
```

### CSV Export

Tabular data for spreadsheet analysis and historical tracking.

## Advanced Features

### Multiple Suites

```javascript
export default {
  name: 'Complex Algorithms',

  suites: {
    Sorting: {
      setup() {
        this.data = generateTestData(1000);
      },
      benchmarks: {
        'Quick Sort': {
          fn() {
            return quickSort(this.data);
          },
        },
        'Merge Sort': {
          fn() {
            return mergeSort(this.data);
          },
        },
      },
    },

    Searching: {
      setup() {
        this.sortedData = generateSortedData(10000);
      },
      benchmarks: {
        'Binary Search': {
          fn() {
            return binarySearch(this.sortedData, 5000);
          },
        },
        'Linear Search': {
          fn() {
            return linearSearch(this.sortedData, 5000);
          },
        },
      },
    },
  },
};
```

### Async Operations

```javascript
export default {
  name: 'Async Performance',

  benchmarks: {
    'Promise.resolve()': {
      async fn() {
        return await Promise.resolve('test');
      },
    },

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
};
```

### Tagging and Filtering

```javascript
benchmarks: {
  'Fast Algorithm': {
    fn() { return fastOperation(); },
    tags: ['algorithm', 'fast', 'optimized']
  },
  'Slow Algorithm': {
    fn() { return slowOperation(); },
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
    r => r.file === result.file && r.task === result.task
  );

  if (baselineResult) {
    const regression = (baselineResult.hz - result.hz) / baselineResult.hz;
    if (regression > 0.1) {
      // 10% regression threshold
      console.error(
        `Performance regression detected in ${result.task}: ${(regression * 100).toFixed(1)}%`
      );
      process.exit(1);
    }
  }
}

console.log('No performance regressions detected ✅');
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

Blue Oak Model License 1.0.0 - see [LICENSE](LICENSE) file for details.

---

**modestbench** - Modest in name, mighty in performance! 🚀
