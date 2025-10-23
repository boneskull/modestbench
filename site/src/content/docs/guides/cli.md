---
title: CLI Reference
description: Complete command-line interface reference for modestbench
---

## Commands

### `modestbench [pattern..]`

Run benchmarks with powerful discovery and filtering options. The `run` command is the default and can be omitted.

#### Basic Usage

```bash
# Run all benchmarks matching default pattern (./bench/**/*.bench.{js,mjs,cjs,ts})
modestbench

# Run all benchmarks in a directory (searches recursively)
modestbench benchmarks/

# Run specific files
modestbench benchmarks/critical.bench.js

# Run from multiple directories
modestbench src/perf/ tests/benchmarks/

# Mix files, directories, and glob patterns
modestbench file.bench.js benchmarks/ "tests/**/*.bench.ts"

# Explicit run command (optional)
modestbench run benchmarks/
```

#### Supported File Extensions

- JavaScript: `.js`, `.mjs`, `.cjs`
- TypeScript: `.ts`, `.mts`, `.cts`

#### Options

##### `--config <path>`

Specify a custom configuration file path.

```bash
modestbench --config ./custom-config.json
```

##### `--iterations <number>`

Number of samples to collect per benchmark task.

```bash
modestbench --iterations 5000
```

Higher values provide more accurate results but take longer to complete.

##### `--time <number>`

Time budget in milliseconds per benchmark task.

```bash
modestbench --time 10000
```

##### `--limit-by <mode>`

Control how benchmarks are limited. Options:

- `iterations` - Stop after N samples (fast, predictable)
- `time` - Run for T milliseconds (consistent time investment)
- `any` - Stop when either threshold is reached (default when both specified)
- `all` - Require both time AND iterations thresholds

```bash
# Explicit control
modestbench --iterations 500 --time 5000 --limit-by time

# Safety bounds (whichever comes first)
modestbench --iterations 1000 --time 10000 --limit-by any

# Statistical rigor (both required)
modestbench --iterations 100 --time 2000 --limit-by all
```

**Smart Defaults:**

- Only `--iterations` → Uses `iterations` mode (fast)
- Only `--time` → Uses `time` mode
- Both specified → Uses `any` mode (whichever comes first)
- Neither specified → Uses default iterations (100) with `iterations` mode

##### `--warmup <number>`

Number of warmup iterations before measurement begins.

```bash
modestbench --warmup 100
```

Helps stabilize JIT compilation for more consistent results.

##### `--engine <name>`

Select the benchmark engine. Options: `tinybench` (default) or `accurate`.

```bash
# Use the accurate engine for high-precision measurements
node --allow-natives-syntax ./node_modules/.bin/modestbench --engine accurate

# Use tinybench engine (default)
modestbench --engine tinybench
```

**Engine Differences:**

- **`tinybench`** (default): Fast, lightweight engine suitable for development and CI. Uses IQR-based outlier removal.
- **`accurate`**: High-precision engine with V8 optimization guards to prevent JIT compiler interference. Requires `--allow-natives-syntax` flag. Recommended for production benchmarks and critical performance measurements.

See the [Getting Started](/getting-started/#choosing-an-engine) guide for detailed comparison.

:::caution[Node.js Flag Required]
The `accurate` engine requires running Node.js with the `--allow-natives-syntax` flag. This flag must be passed to the Node.js runtime, not to modestbench:

```bash
# Using Node.js directly
node --allow-natives-syntax ./node_modules/.bin/modestbench --engine accurate

# Using npx (pass flag to Node.js)
npx --node-arg=--allow-natives-syntax modestbench --engine accurate

# Using package.json script
# package.json: "bench": "node --allow-natives-syntax ./node_modules/.bin/modestbench --engine accurate"
npm run bench
```

If the flag is not present, AccurateEngine will fall back to a less accurate mode and display a warning.
:::

##### `--timeout <number>`

Maximum time in milliseconds for a single task before timing out.

```bash
modestbench --timeout 60000
```

Default: 30000 (30 seconds)

##### `--bail`

Stop execution on first benchmark failure.

```bash
modestbench --bail
```

Useful in CI/CD to fail fast when performance regressions are detected.

##### `--reporters <reporters>`

Comma-separated list of reporters to use.

```bash
# Single reporter
modestbench --reporters json

# Multiple reporters simultaneously
modestbench --reporters human,json,csv
```

Available reporters:

- `human` - Color-coded terminal output (default for TTY with colors)
- `simple` - Plain text output (default for non-TTY environments)
- `json` - Structured JSON data
- `csv` - Tabular CSV format

:::note[Auto-Selection]
modestbench automatically selects `human` (TTY with color) or `simple` (non-TTY) as the default. Override with `--reporters` if needed.
:::

##### `--output <directory>`

Directory path for saving benchmark results and reports.

```bash
modestbench --reporters json,csv --output ./results
```

When specified:

- JSON reporter writes to `{output}/results.json`
- CSV reporter writes to `{output}/results.csv`
- Human reporter still writes to stdout/stderr

##### `--quiet`

Minimal output mode. Suppresses progress bars and non-essential messages.

```bash
modestbench --quiet
```

:::note[CI/CD Pipelines]
In non-TTY environments, modestbench automatically uses the `simple` reporter which has no progress bars. `--quiet` further suppresses status messages for completely clean output.
:::

##### `--verbose`

Detailed output mode with additional debugging information.

```bash
modestbench --verbose
```

##### `--tags <tags>`

Run only benchmarks with specific tags (OR logic - matches ANY).

```bash
# Single tag
modestbench --tags fast

# Multiple tags (matches ANY)
modestbench --tags string,array,algorithm
```

Tags cascade from file → suite → task levels. If a benchmark has ANY of the specified tags, it will run.

##### `--exclude-tags <tags>`

Exclude benchmarks with specific tags.

```bash
# Exclude one type
modestbench --exclude-tags slow

# Exclude multiple types
modestbench --exclude-tags experimental,unstable
```

:::tip[Tag Precedence]
`--exclude-tags` takes precedence over `--tags`. If a benchmark has both an included and excluded tag, it will be skipped.
:::

##### `--concurrent`

Run benchmark files concurrently (experimental).

```bash
modestbench --concurrent
```

:::caution[Experimental Feature]
Concurrent execution may produce inconsistent results on systems with limited resources.
:::

#### Complete Example

```bash
modestbench \
  --config ./config.json \
  --iterations 2000 \
  --warmup 50 \
  --reporters human,json,csv \
  --output ./results \
  --tags performance,algorithm \
  --exclude-tags experimental \
  --quiet \
  benchmarks/
```

### `modestbench init`

Initialize a project with configuration and example benchmarks.

#### Usage

```bash
# Interactive initialization
modestbench init

# Specify project type
modestbench init basic
modestbench init advanced
modestbench init library

# Specify config format
modestbench init --config-type typescript
modestbench init --config-type json
modestbench init --config-type yaml
modestbench init --config-type js
```

#### Project Types

- **basic** - Simple setup for small projects
  - 100 iterations
  - Human reporter
  - Minimal configuration

- **advanced** - Feature-rich setup
  - 1000 iterations
  - Warmup enabled
  - Human + JSON reporters
  - Organized suite structure

- **library** - Optimized for library performance testing
  - 5000 iterations
  - High warmup (100)
  - Human + JSON reporters
  - Comprehensive suite organization

#### What It Does

1. Generates a configuration file in your chosen format
2. Creates an example benchmark file
3. Appends `.modestbench/` to `.gitignore` to exclude historical data

### `modestbench history`

Manage benchmark history and compare results over time.

#### `history list`

List recent benchmark runs.

```bash
modestbench history list
```

#### `history show <run-id>`

Show detailed results for a specific run.

```bash
modestbench history show run-2025-10-07-001
```

#### `history compare <run-id-1> <run-id-2>`

Compare two benchmark runs.

```bash
modestbench history compare run-2025-10-07-001 run-2025-10-07-002
```

#### `history export`

Export historical data.

```bash
# Export to CSV
modestbench history export --format csv --output results.csv

# Export to JSON
modestbench history export --format json --output results.json
```

#### `history clean`

Clean old benchmark data.

```bash
# Clean runs older than 30 days
modestbench history clean --older-than 30d

# Keep only last 10 runs
modestbench history clean --keep 10

# Clean by size
modestbench history clean --max-size 100mb
```

## Global Options

These options work with all commands:

### `--help`

Show help information.

```bash
modestbench --help
modestbench --help  # shows run command help (default command)
modestbench history --help
```

### `--version`

Show version number.

```bash
modestbench --version
```

## Environment Variables

modestbench respects several environment variables:

### `DEBUG`

Enable debug mode with detailed logging.

```bash
DEBUG=1 modestbench
```

Shows full error stack traces and additional debugging information.

### `CI`

Automatically detected CI environment flag.

```bash
CI=true modestbench
```

When detected:

- Captures CI provider information
- Stores build details in results
- May adjust defaults for CI-friendly output

### `NODE_ENV`

Node.js environment mode. Stored in benchmark results for context.

```bash
NODE_ENV=production modestbench
```

### `FORCE_COLOR` / `NO_COLOR`

Control color output in terminal.

```bash
# Force color output
FORCE_COLOR=1 modestbench

# Disable color output
NO_COLOR=1 modestbench
```

## Configuration Priority

Command-line flags override configuration file settings:

```json
// modestbench.config.json
{
  "iterations": 1000,
  "reporters": ["human"]
}
```

```bash
# CLI flags take precedence
modestbench --iterations 5000 --reporters json
# Result: iterations=5000, reporters=["json"]
```

Priority order:

1. Default values (lowest)
2. Configuration file
3. CLI flags (highest)

## Examples

### Quick Development Testing

```bash
modestbench --iterations 10 --quiet
```

### Production Benchmarking

```bash
modestbench \
  --iterations 5000 \
  --warmup 100 \
  --reporters human,json,csv \
  --output ./results
```

### CI/CD Integration

```bash
modestbench \
  --reporters json,csv \
  --output ./benchmark-results \
  --quiet \
  --bail \
  --tags critical
```

### Regression Testing

```bash
# Run current benchmarks
modestbench --reporters json --output ./current

# Compare with baseline
modestbench history compare baseline-run-id $(modestbench history list --format json | jq -r '.[0].id')
```

## Next Steps

- Learn about [Configuration](/guides/configuration/) file options
- Understand [Output Formats](/guides/output/) for reporter details
- Explore [Advanced Usage](/guides/advanced/) for complex scenarios
