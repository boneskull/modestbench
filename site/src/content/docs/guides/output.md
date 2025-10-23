---
title: Output Formats
description: Understanding modestbench reporter output formats
---

modestbench supports multiple output formats through its reporter system. You can use multiple reporters simultaneously to get results in different formats.

## Default Reporter Selection

modestbench automatically selects the appropriate reporter based on your environment:

- **Interactive terminals** (TTY with color support): `human` reporter with colors and progress bars
- **Non-TTY environments** (CI/CD, piped output): `simple` reporter with plain text output
- **Forced color mode** (`FORCE_COLOR=1`): `human` reporter even in non-TTY environments

You can always override the default by explicitly specifying `--reporters`.

## Human Reporter

The human reporter provides color-coded terminal output with real-time progress bars and formatted results. This is the default when running in an interactive terminal (TTY) with color support.

### Human Reporter Features

- **Real-time progress bars** - Visual feedback during benchmark execution
- **Color-coded results** - Green for pass, red for fail, cyan for info
- **Performance summaries** - Operations per second, mean time, standard deviation
- **Environment information** - Node.js version, platform, CPU, memory
- **Structured output** - File → Suite → Task hierarchy

### Human Reporter Example Output

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

### Human Reporter Usage

```bash
# Human reporter is default
modestbench

# Explicitly specify
modestbench --reporters human

# Quiet mode (suppresses progress, keeps results)
modestbench --reporters human --quiet
```

### Output Streams

- **stdout** - Final results and summaries
- **stderr** - Progress bars and real-time updates

:::tip[CI/CD Usage]
In CI/CD environments, modestbench automatically uses the `simple` reporter for clean, parseable output. Use `--quiet` to suppress progress messages if using the `human` reporter explicitly.
:::

## Simple Reporter

The simple reporter provides clean, text-only output without colors or progress bars. This is the default in non-TTY environments (CI/CD, piped output) or when `FORCE_COLOR` is not set.

### Simple ReporterFeatures

- **Plain text output** - No ANSI colors or escape codes
- **No progress bars** - Clean output suitable for logs and pipes
- **Structured results** - Same hierarchy as human reporter (File → Suite → Task)
- **Machine-readable** - Perfect for parsing and CI/CD logs

### Simple Reporter Example Output

```text
modestbench

Environment:
  Node.js: v24.10.0
  Platform: darwin arm64
  CPU: Apple M4 Max (16 cores)
  Memory: 48.0 GB

Found 1 benchmark file(s)

> benchmarks/example.bench.js

  > Array Operations
    ✓ Array.push()
      810.05μs ±2.45% (1.23M ops/sec)
    ✓ Array spread
      81.01ms ±4.12% (12.34K ops/sec)
  ✓ 2 passed

  ✓ All 2 tasks passed

Results

✓ All tests passed: 2
Files: 1
Suites: 1
Duration: 1.82s

All benchmarks completed successfully!
```

### Simple Reporter Usage

```bash
# Simple reporter is default in non-TTY environments
modestbench | tee results.log

# Explicitly specify simple reporter
modestbench --reporters simple

# Force human reporter in non-TTY (requires FORCE_COLOR=1)
FORCE_COLOR=1 modestbench --reporters human
```

### When to Use

- **CI/CD pipelines** - Clean logs without ANSI codes
- **Piped output** - `modestbench | grep "passed"`
- **Log files** - Readable output without color codes
- **Automated parsing** - Consistent text format

## JSON Reporter

The JSON reporter outputs structured data perfect for programmatic analysis, CI/CD integration, and historical tracking.

### Output Structure

```json
{
  "config": {
    "iterations": 1000,
    "time": 1000,
    "warmup": 50,
    "timeout": 30000,
    "bail": false,
    "limitBy": "iterations"
  },
  "environment": {
    "nodeVersion": "v24.10.0",
    "platform": "darwin",
    "arch": "arm64",
    "cpu": {
      "model": "Apple M4 Max",
      "cores": 16,
      "speed": 3200
    },
    "memory": {
      "total": 51539607552,
      "totalGB": 48.0
    },
    "env": {
      "CI": "false",
      "NODE_ENV": "development"
    }
  },
  "results": [
    {
      "file": "benchmarks/example.bench.js",
      "suite": "Array Operations",
      "task": "Array.push()",
      "status": "passed",
      "opsPerSecond": 1234567.89,
      "stats": {
        "mean": 0.00081005,
        "min": 0.000785,
        "max": 0.000853,
        "stdDev": 0.00002,
        "variance": 0.0000004,
        "p95": 0.00083,
        "p99": 0.000845,
        "marginOfError": 2.45,
        "iterations": 1000
      },
      "tags": ["array", "fast"]
    },
    {
      "file": "benchmarks/example.bench.js",
      "suite": "Array Operations",
      "task": "Array spread",
      "status": "passed",
      "opsPerSecond": 12345.67,
      "stats": {
        "mean": 0.08101,
        "min": 0.078,
        "max": 0.085,
        "stdDev": 0.00334,
        "variance": 0.00001116,
        "p95": 0.084,
        "p99": 0.0848,
        "marginOfError": 4.12,
        "iterations": 1000
      },
      "tags": ["array", "slow"]
    }
  ],
  "run": {
    "id": "run-2025-10-07-001",
    "startTime": "2025-10-07T10:30:00.000Z",
    "endTime": "2025-10-07T10:30:15.420Z",
    "duration": 15420,
    "status": "completed"
  },
  "summary": {
    "totalFiles": 1,
    "totalSuites": 1,
    "totalTasks": 2,
    "passedTasks": 2,
    "failedTasks": 0,
    "skippedTasks": 0
  }
}
```

### Field Reference

#### Run Information

- `id` - Unique run identifier
- `startTime` - ISO 8601 timestamp when run started
- `endTime` - ISO 8601 timestamp when run completed
- `duration` - Total duration in milliseconds
- `status` - Run status: `"completed"`, `"failed"`, or `"interrupted"`

#### Environment Information

- `nodeVersion` - Node.js version string
- `platform` - Operating system platform
- `arch` - CPU architecture
- `cpu.model` - CPU model name
- `cpu.cores` - Number of CPU cores
- `cpu.speed` - CPU speed in MHz
- `memory.total` - Total memory in bytes
- `memory.totalGB` - Total memory in GB (formatted)
- `env.CI` - CI environment detected
- `env.NODE_ENV` - Node.js environment mode

#### Task Results

- `file` - Benchmark file path
- `suite` - Suite name
- `task` - Task name
- `status` - Task status: `"passed"`, `"failed"`, or `"skipped"`
- `opsPerSecond` - Operations per second (throughput)
- `stats.mean` - Mean execution time (seconds)
- `stats.min` - Minimum execution time
- `stats.max` - Maximum execution time
- `stats.stdDev` - Standard deviation
- `stats.variance` - Variance
- `stats.p95` - 95th percentile
- `stats.p99` - 99th percentile
- `stats.marginOfError` - Margin of error percentage
- `stats.iterations` - Actual iterations completed
- `tags` - Array of task tags

### JSON Reporter Usage

```bash
# JSON output to stdout
modestbench --reporters json

# JSON output to file
modestbench --reporters json --output ./results
# Creates: ./results/results.json

# Multiple reporters
modestbench --reporters human,json --output ./results
```

### Integration Examples

#### jq Processing

```bash
# Extract task names with ops/sec
modestbench --reporters json | jq '.results[] | {task: .task, opsPerSecond}'

# Find slowest tasks
modestbench --reporters json | jq '.results | sort_by(.opsPerSecond) | .[0:5]'

# Calculate average ops/sec
modestbench --reporters json | jq '[.results[].opsPerSecond] | add / length'
```

#### Node.js Script

```javascript
import { readFileSync } from 'fs';

const results = JSON.parse(readFileSync('./results/results.json', 'utf8'));

// Check for performance regressions
const baseline = JSON.parse(readFileSync('./baseline.json', 'utf8'));

for (const result of results.results) {
  const baselineResult = baseline.results.find(
    (r) => r.file === result.file && r.task === result.task,
  );

  if (baselineResult) {
    const regression =
      (baselineResult.opsPerSecond - result.opsPerSecond) /
      baselineResult.opsPerSecond;

    if (regression > 0.1) {
      console.error(
        `⚠️  ${result.task}: ${(regression * 100).toFixed(1)}% slower`,
      );
      process.exit(1);
    }
  }
}
```

## CSV Reporter

The CSV reporter outputs tabular data suitable for spreadsheets, data analysis tools, and long-term tracking.

### Output Format

```csv
file,suite,task,status,opsPerSecond,mean,min,max,stdDev,variance,p95,p99,marginOfError,iterations,tags
benchmarks/example.bench.js,Array Operations,Array.push(),passed,1234567.89,0.00081005,0.00078500,0.00085300,0.00002000,0.0000004,0.00083000,0.00084500,2.45,1000,"array,fast"
benchmarks/example.bench.js,Array Operations,Array spread,passed,12345.67,0.08101000,0.07800000,0.08500000,0.00334000,0.00001116,0.08400000,0.08480000,4.12,1000,"array,slow"
```

### Column Reference

| Column          | Description            | Units                         |
| --------------- | ---------------------- | ----------------------------- |
| `file`          | Benchmark file path    | string                        |
| `suite`         | Suite name             | string                        |
| `task`          | Task name              | string                        |
| `status`        | Task status            | `passed`, `failed`, `skipped` |
| `opsPerSecond`  | Operations per second  | number                        |
| `mean`          | Mean execution time    | seconds                       |
| `min`           | Minimum execution time | seconds                       |
| `max`           | Maximum execution time | seconds                       |
| `stdDev`        | Standard deviation     | seconds                       |
| `variance`      | Variance               | seconds²                      |
| `p95`           | 95th percentile        | seconds                       |
| `p99`           | 99th percentile        | seconds                       |
| `marginOfError` | Margin of error        | percentage                    |
| `iterations`    | Actual iterations      | number                        |
| `tags`          | Comma-separated tags   | string                        |

### CSV Reporter Usage

```bash
# CSV output to stdout
modestbench --reporters csv

# CSV output to file
modestbench --reporters csv --output ./results
# Creates: ./results/results.csv

# Multiple reporters
modestbench --reporters human,csv --output ./results
```

### Analysis Examples

#### Excel/Google Sheets

1. Run benchmarks: `modestbench --reporters csv --output ./results`
2. Import `results.csv` into Excel or Google Sheets
3. Create pivot tables, charts, and statistical analysis

#### Python Analysis

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load CSV
df = pd.read_csv('results.csv')

# Plot ops/sec comparison
df.plot(x='task', y='opsPerSecond', kind='bar',
        title='Benchmark Performance Comparison')
plt.ylabel('Operations per Second')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('benchmark-comparison.png')

# Statistical summary
print(df.describe())

# Find outliers
outliers = df[df['marginOfError'] > 5]
print(f"Tasks with high variance: {outliers['task'].tolist()}")
```

#### Historical Tracking

```bash
#!/bin/bash
# Track performance over time

DATE=$(date +%Y-%m-%d)
modestbench --reporters csv --output "./history/${DATE}"

# Append to master CSV
tail -n +2 "./history/${DATE}/results.csv" >> ./history/all-results.csv
```

## Using Multiple Reporters

Run multiple reporters simultaneously to get output in different formats:

```bash
modestbench --reporters human,json,csv --output ./results
```

This creates:

- Human output to terminal (stdout/stderr)
- `./results/results.json`
- `./results/results.csv`

### Common Combinations

#### Development

```bash
# Human output only for quick feedback
modestbench
```

#### CI/CD

```bash
# JSON + CSV for analysis (simple reporter used automatically)
modestbench --reporters json,csv --output ./results --quiet

# Or let auto-detection handle it
modestbench --output ./results
```

#### Documentation

```bash
# All formats for comprehensive reporting
modestbench --reporters human,json,csv --output ./benchmark-results
```

## Reporter Behavior

### When `--output` is Specified

- **JSON reporter**: Writes to `{output}/results.json`
- **CSV reporter**: Writes to `{output}/results.csv`
- **Human/Simple reporters**: Still write to stdout/stderr

### When `--output` is NOT Specified

- **JSON reporter**: Writes to stdout
- **CSV reporter**: Writes to stdout
- **Human/Simple reporters**: Write to stdout/stderr

:::caution[Multiple Data Reporters]
Using both JSON and CSV without `--output` will mix their output on stdout. Always use `--output` when using multiple data reporters.
:::

### Quiet Mode

The `--quiet` flag affects the human and simple reporters:

- Suppresses progress bars and status messages (stderr)
- Keeps final results output
- Does NOT affect JSON or CSV output

:::note[Simple Reporter]
The `simple` reporter has no progress bars by default, so `--quiet` primarily affects status messages.
:::

## Next Steps

- Learn about [Configuration](/guides/configuration/) for reporter setup
- See [CLI Reference](/guides/cli/) for command-line options
- Explore [Advanced Usage](/guides/advanced/) for complex scenarios
