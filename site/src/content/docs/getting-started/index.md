---
title: Getting Started
description: Get up and running with modestbench in minutes
---

## Installation

Install modestbench as a development dependency:

```bash
npm install --save-dev modestbench
```

## Initialize Your Project (Optional)

The `modestbench init` command sets up your project with configuration and examples:

```bash
# Initialize with defaults
modestbench init

# Or specify project type and config format
modestbench init advanced --config-type typescript
```

**Project Types:**

- `basic` - Simple setup for small projects (100 iterations, human reporter)
- `advanced` - Feature-rich with multiple reporters and structured output
- `library` - Optimized for library performance testing (5000 iterations, high warmup)

The init command will:

1. Generate a configuration file in your chosen format
2. Create an example benchmark file
3. Add `.modestbench/` to `.gitignore` to exclude historical data

## Your First Benchmark

:::tip[Naming Convention]
modestbench looks for files with `.bench.js` or `.bench.ts` extensions by default.
:::

### Simplified Format (Recommended)

For quick benchmarks with just a few tasks:

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

### Suite-Based Format

When you need to organize benchmarks into groups with setup/teardown hooks:

```javascript
// benchmarks/example.bench.js
const state = { data: [] };

export default {
  suites: {
    'Array Operations': {
      setup() {
        state.data = [];
      },
      
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

- **Simplified format**: Quick benchmarks, single file with related tasks, no setup/teardown needed
- **Suite format**: Complex projects, multiple groups of benchmarks, need setup/teardown hooks

## Running Benchmarks

Run all benchmarks in the current directory:

```bash
modestbench run
```

Run benchmarks with options:

```bash
modestbench run --iterations 5000 --reporters human,json
```

### Choosing an Engine

modestbench provides two engines with different trade-offs:

```bash
# Default: tinybench (fast, good for development)
modestbench run

# Accurate engine (higher precision, recommended for production benchmarks)
node --allow-natives-syntax ./node_modules/.bin/modestbench run --engine accurate
```

**Engine Comparison:**

| Feature | `tinybench` (default) | `accurate` |
|---------|----------------------|------------|
| Speed | ⚡ Very fast | 🐢 Slower (more thorough) |
| Statistical Quality | ✅ Good | ⭐ Excellent |
| Outlier Removal | ✅ IQR-based | ✅ IQR-based |
| V8 Optimization Guards | ❌ No | ✅ Yes (prevents JIT interference) |
| Requirements | None | `--allow-natives-syntax` flag |
| Best For | Development, CI | Production benchmarks, publications |

:::tip[When to Use Accurate Engine]
Use the `accurate` engine when:

- Publishing benchmark results
- Making critical performance decisions
- Comparing micro-optimizations
- Needing the highest statistical quality

Use the default `tinybench` engine when:

- Rapid iteration during development
- CI/CD performance regression tests
- General performance comparisons

:::

Run specific files or directories:

```bash
# Run a specific file
modestbench run benchmarks/critical.bench.js

# Run all benchmarks in a directory (searches recursively)
modestbench run benchmarks/

# Run multiple paths
modestbench run benchmarks/ tests/perf/

# Use glob patterns
modestbench run "tests/**/*.bench.ts"
```

## View Results

modestbench provides clean, colorized output in interactive terminals:

```text

           ▄▄▄▄▄▄▄
        ▄▄▄▄    ▄▄▄▄▄
    ▄▄▄▄▄           ▄▄▄▄▄
     ▄     ▄▄▄▄▄▄▄     ▄
        ▄▄▄▄▄▄▄▄▄ ▄▄      modestbench
       ▄▄       ▄▄▄▄▄▄
      ▄▄      ▄▄▄▄ ▄ ▄▄   node.js: v24.10.0
      ▄      ▄▄▄   ▄▄▄▄   platform: darwin arm64
     ▄       ▄▄▄       ▄  cpu: Apple M4 Max (16 cores)
    ▀▀▄▄▄           ▄▄▄▀▀ mem: 48.0 GB
        ▀▄▄▄     ▄▄▄▀
           ▀▀▄▄▄▀▀


▓▓ examples/benchmarks/advanced-operations.bench.js

  ░░ Array Algorithms
    √ Array.findIndex(): 166.67ns • ±1.36% • 6.36M ops/sec
    √ Linear Search    : 166.67ns • ±1.33% • 6.30M ops/sec
  √ 2 tasks passed


  ░░ String Operations
    √ RegExp.test()    : 23.35ns • ±19.75% • 32.04M ops/sec
    √ String.includes(): 17.91ns • ±17.13% • 42.13M ops/sec
    √ String.indexOf() : 18.22ns • ±17.33% • 41.29M ops/sec
  √ 3 tasks passed

 √ All 5 tasks passed

██ Results

  Files: 1
  Suites: 2
  Tasks: 5
√ All tests passed: 5
≈ Duration: 6.96s

Rad. ☮
```

:::note[Output Format]
The output above is from the `human` reporter, used automatically in interactive terminals. In CI/CD or when piping output, modestbench uses the `simple` reporter for clean, plain-text output without colors.
:::

## Common Options

### Control Benchmark Duration

```bash
# Limit by iteration count (fast, predictable sample size)
modestbench run --iterations 100

# Limit by time budget (ensures consistent time investment)
modestbench run --time 5000

# Limit by whichever comes first (safety bounds)
modestbench run --iterations 1000 --time 10000
```

### Filter by Tags

```bash
# Run only fast benchmarks
modestbench run --tags fast

# Run benchmarks with multiple tags (OR logic)
modestbench run --tags string,array,algorithm

# Exclude specific benchmarks
modestbench run --exclude-tags slow,experimental
```

### Multiple Output Formats

```bash
# Generate multiple reports at once
modestbench run --reporters human,json,csv

# Save reports to a specific directory
modestbench run --reporters json,csv --output ./results
```

## Next Steps

- Learn about [Configuration](/guides/configuration/) options
- Explore the [CLI Reference](/guides/cli/) for all commands and flags
- Understand [Output Formats](/guides/output/) for integrations
- Check out [Advanced Usage](/guides/advanced/) for complex scenarios

## Quick Tips

:::tip[Warmup Iterations]
Use `--warmup` to run warmup iterations before measurement:

```bash
modestbench run --warmup 100
```

This helps stabilize JIT compilation for more accurate results.
:::

:::caution[Time Budget]
Very high time budgets can cause issues with extremely fast operations. modestbench caps time at 2000ms internally to prevent overflow errors.
:::

:::note[Historical Tracking]
Results are automatically saved to `.modestbench/history/`. Use `modestbench history list` to view past runs!
:::
