---
title: Code Analysis
description: Use V8 profiling to identify hot code paths and benchmark candidates
---

## Overview

**modestbench**'s code analysis feature (via the `analyze` command, alias `profile`) helps you identify which functions in your codebase consume the most execution time. This is invaluable for:

- **Finding benchmark candidates**: Discover which functions would benefit most from optimization
- **Guided performance work**: Focus your efforts on code that matters
- **Understanding bottlenecks**: See where your application spends time during execution

The analyzer uses Node.js's built-in V8 profiler (`--cpu-prof`) to capture real execution data, then filters and presents the results.

## Quick Start

Analyze any Node.js command to see hot code paths:

```bash
# Try the profiling demo (shows clear hot paths)
modestbench analyze "node examples/profiling-demo.js"

# Analyze your test suite
modestbench analyze "npm test"

# Analyze a specific script
modestbench analyze "node ./src/server.js"

# Analyze your application startup
modestbench analyze "node ./dist/index.js"
```

## Profile Storage

CPU profiles are stored in `.modestbench/profiles/` to keep your workspace clean. This directory is automatically gitignored.

You can analyze existing profiles with the `--input` flag:

```bash
modestbench analyze --input .modestbench/profiles/CPU.20231027.161625.89167.0.001.cpuprofile
```

## Understanding the Output

The profiler shows functions that consume the most CPU time:

```text
██ Profile Analysis

Command: npm test
Duration: 5.2s
Total Ticks: 8,234

██ Benchmark Candidates

Top functions by execution time:

  sortArray                                                 12.3%  (1,013 ticks)
  src/utils/sorting.js:42

  validateSchema                                             8.7%  (716 ticks)
  src/validators/schema.js:28

  parseInput                                                 6.1%  (502 ticks)
  src/parsers/input.js:15

... (showing top 3 of 45 user functions)
```

### What the Colors Mean

Functions are color-coded by execution percentage:

- **Red (≥10%)**: Critical hot paths - highest priority for benchmarking
- **Yellow (≥5%)**: Significant execution time - good candidates
- **Cyan (≥2%)**: Moderate impact - consider for optimization
- **White (<2%)**: Minor impact - usually not worth benchmarking

### Ticks Explained

A "tick" is a CPU time sample. The V8 profiler periodically samples what function is executing. More ticks = more time spent in that function. The percentage shows what portion of total execution time each function consumed.

## Smart Detection

By default, the profiler uses **smart detection** to focus on your code:

- ✅ **Includes**: Functions from your project directory
- ❌ **Excludes**: `node_modules` dependencies
- ❌ **Excludes**: Node.js internals (`node:*`, `internal/*`)

This filtering helps you focus on code you can actually optimize, rather than third-party libraries.

### Filtering Options

Override smart detection with explicit patterns:

```bash
# Focus on specific files
modestbench analyze "npm test" --filter-file "**/utils/**"

# Set minimum threshold (default: 1%)
modestbench analyze "npm test" --min-percent 5.0

# Show more results (default: 25)
modestbench analyze "npm test" --top 50
```

## Grouped View

Use `--group-by-file` to see results organized by source file:

```bash
modestbench analyze "npm test" --group-by-file
```

Output:

```text
██ Grouped by File

▓ src/utils/sorting.js                                      18.5%  (1,523 ticks)
  ▪ sortArray                                               12.3%  (1,013 ticks)  :42
  ▪ quickSort                                                4.2%  (346 ticks)    :98
  ▪ partition                                                2.0%  (164 ticks)    :125

▓ src/validators/schema.js                                  11.3%  (931 ticks)
  ▪ validateSchema                                           8.7%  (716 ticks)    :28
  ▪ checkRequired                                            2.6%  (215 ticks)    :145
```

This view is particularly useful for:

- Identifying files with multiple hot functions
- Understanding the overall performance impact of a module
- Prioritizing which files to focus optimization efforts on

## Analyzing Existing Profiles

If you already have V8 profile logs, you can analyze them directly:

```bash
# Analyze an existing profile
modestbench analyze --input isolate-0x123-v8.log
```

This is useful for:

- Analyzing profiles from production environments
- Comparing profiles from different runs
- Processing profiles generated with custom `NODE_OPTIONS`

## Workflow: From Profile to Benchmark

Here's a recommended workflow for using profiling data:

### 1. Profile Your Code

Start by profiling a representative workload:

```bash
# Profile your test suite (good for library development)
modestbench analyze "npm test"

# Or profile your application with typical usage
modestbench analyze "node ./dist/app.js --run-typical-task"
```

### 2. Identify Candidates

Look for functions that meet these criteria:

- **High execution percentage** (≥5%)
- **Pure/deterministic**: Same inputs → same outputs
- **Frequently called**: Optimization will have broad impact
- **In your codebase**: You can actually change them

:::tip[Good Benchmark Candidates]
Functions with 5%+ execution time that are pure, frequently called, and algorithmically interesting make the best benchmarks.
:::

### 3. Create Benchmarks

For each candidate, create a focused benchmark:

```bash
# Initialize if you haven't already
modestbench init

# Create a benchmark file
cat > benchmarks/sorting.bench.js << 'EOF'
import { sortArray } from '../src/utils/sorting.js';

const small = Array.from({ length: 100 }, () => Math.random());
const medium = Array.from({ length: 1000 }, () => Math.random());
const large = Array.from({ length: 10000 }, () => Math.random());

export default {
  suites: {
    'Array Sorting': {
      benchmarks: {
        'sortArray - small (100)': () => sortArray([...small]),
        'sortArray - medium (1000)': () => sortArray([...medium]),
        'sortArray - large (10000)': () => sortArray([...large]),
      },
    },
  },
};
EOF
```

### 4. Run and Track

Run your benchmarks to establish a baseline:

```bash
modestbench

# Track over time
modestbench history trends
```

## Common Use Cases

### Profiling Tests

Find hot paths in your test suite:

```bash
modestbench analyze "npm test"
```

**Why this is useful:**

- Tests often exercise core functionality
- High test execution time often indicates real performance issues
- Easy to reproduce and measure

### Profiling Application Startup

Identify slow initialization code:

```bash
modestbench analyze "node ./dist/app.js" --group-by-file
```

**Look for:**

- Heavy parsing/validation on startup
- Expensive module initialization
- Synchronous I/O during startup

### Profiling Specific Scenarios

Target specific operations:

```bash
# Profile data processing
modestbench analyze "node scripts/process-data.js"

# Profile API requests
modestbench analyze "node scripts/load-test.js"
```

## Command Reference

```bash
modestbench analyze [command]

Options:
  --input, -i           Path to existing *.cpuprofile file
  --filter-file         Filter functions by file glob pattern
  --min-percent         Minimum execution percentage (default: 0.5)
  --top, -n             Number of top functions to show (default: 25)
  --group-by-file       Group results by source file
  --color               Enable/disable colored output
```

## Tips and Best Practices

### Run Multiple Times

V8 profiling has some variability. Run 2-3 times to verify consistent results:

```bash
modestbench analyze "npm test"
# Run again
modestbench analyze "npm test"
```

Functions consistently appearing at the top are your best candidates.

### Use Representative Workloads

Profile code that exercises realistic scenarios:

```bash
# ❌ Not representative
modestbench analyze "node --eval 'console.log(1)'"

# ✅ Representative workload
modestbench analyze "npm test"
modestbench analyze "node ./scripts/typical-task.js"
```

### Combine with Benchmarking

Use profiling to discover candidates, benchmarking to measure improvements:

```bash
# 1. Profile to find hot paths
modestbench analyze "npm test" > profile-baseline.txt

# 2. Create benchmarks for hot functions
# ... create benchmarks ...

# 3. Run benchmarks to establish baseline
modestbench

# 4. Optimize the code
# ... make improvements ...

# 5. Re-run benchmarks to measure impact
modestbench

# 6. Profile again to verify
modestbench analyze "npm test" > profile-after.txt
```

### Consider Context

High percentage doesn't always mean "needs optimization":

- **Expected hot paths**: Core algorithms should take time
- **Appropriate complexity**: O(n²) algorithms might be fine for small n
- **Already fast enough**: Sometimes 5% of a fast program is still fast

Focus on functions where optimization would provide meaningful benefit.

## Programmatic Usage

Use the profiler in your own tools:

```typescript
import {
  runWithProfiling,
  parseProfile,
  filterProfile,
  ProfileHumanReporter,
  findPackageRoot,
} from 'modestbench';

// Run profiling
const logPath = await runWithProfiling('npm test', {
  cwd: process.cwd(),
});

// Parse results
const profileData = await parseProfile(logPath);

// Filter to user code
const packageRoot = await findPackageRoot(process.cwd());
const filtered = filterProfile(
  profileData,
  {
    smartDetection: true,
    minExecutionPercent: 2.0,
    topN: 50,
  },
  packageRoot,
);

// Display results
const reporter = new ProfileHumanReporter({ color: true });
reporter.report(filtered);
```

## Troubleshooting

### No Profile Generated

If you see "No profile log generated":

- Ensure the command actually runs Node.js code
- Check that the process completes successfully
- Try with a simpler command first: `modestbench analyze "node --eval 'console.log(1)'"`

### No Functions Shown

If the profiler shows 0 user functions:

- Your code might be too fast to profile (good problem!)
- Try running longer workloads
- Lower the `--min-percent` threshold
- Check that `--filter-file` patterns match your code

### Profile Data is Stale

Profile logs are reused if they exist. To get fresh data:

```bash
# Remove old logs
rm isolate-*.log

# Run profiling again
modestbench analyze "npm test"
```

## Next Steps

- Read the [Advanced Usage](/guides/advanced/) guide for benchmark patterns
- Learn about [Historical Tracking](/guides/advanced/#historical-tracking) to monitor improvements
- Explore the [CLI Reference](/guides/cli/) for all available options

:::tip[Profile Early, Profile Often]
Make profiling part of your regular workflow. Profile before optimization work to identify targets, and profile after to verify improvements.
:::
