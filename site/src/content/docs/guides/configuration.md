---
title: Configuration
description: Complete reference for modestbench configuration options
---

## Configuration Files

modestbench supports multiple configuration file formats, powered by [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig):

### Supported Formats

- **JSON**: `modestbench.config.json`, `.modestbenchrc.json`, `.modestbenchrc`
- **YAML**: `modestbench.config.yaml`, `modestbench.config.yml`, `.modestbenchrc.yaml`, `.modestbenchrc.yml`
- **JavaScript**: `modestbench.config.js`, `modestbench.config.mjs`, `.modestbenchrc.js`, `.modestbenchrc.mjs`
- **TypeScript**: `modestbench.config.ts`
- **package.json**: Use a `"modestbench"` field

### Configuration Discovery

modestbench automatically searches for configuration files in the current directory and parent directories, following standard conventions.

## Generate a Configuration File

Use the `init` command to generate a configuration file:

```bash
modestbench init --config-type json   # JSON format
modestbench init --config-type yaml   # YAML format
modestbench init --config-type js     # JavaScript format
modestbench init --config-type ts     # TypeScript format
```

## Configuration Options Reference

### Complete Example

```jsonc
{
  "bail": false,
  "exclude": ["node_modules/**"],
  "excludeTags": ["slow", "experimental"],
  "iterations": 1000,
  "limitBy": "iterations",
  "outputDir": "./benchmark-results",
  "pattern": "benchmarks/**/*.bench.{js,ts}",
  "quiet": false,
  "reporters": ["human", "json"],
  "tags": ["fast", "critical"],
  "time": 5000,
  "timeout": 30000,
  "verbose": false,
  "warmup": 50
}
```

### Option Details

#### `pattern`

**Type:** `string | string[]`  
**Default:** `["**/*.bench.{js,ts,mjs,cjs,mts,cts}"]`

Glob pattern(s) to discover benchmark files. Can be a single string or array of patterns.

```json
{
  "pattern": "benchmarks/**/*.bench.js"
}
```

```json
{
  "pattern": [
    "benchmarks/**/*.bench.js",
    "tests/perf/**/*.bench.ts"
  ]
}
```

#### `exclude`

**Type:** `string[]`  
**Default:** `["node_modules/**"]`

Glob patterns for files/directories to exclude from discovery.

```json
{
  "exclude": [
    "node_modules/**",
    "build/**",
    "**/*.slow.bench.js"
  ]
}
```

#### `iterations`

**Type:** `number`  
**Default:** `100`

Number of samples to collect per benchmark task. Higher values provide more accurate results but take longer.

```json
{
  "iterations": 1000
}
```

:::tip[When to increase iterations]

- Increase for more stable, accurate measurements
- Decrease for faster feedback during development
- Library benchmarks often use 5000+

:::

#### `time`

**Type:** `number` (milliseconds)  
**Default:** `1000`

Time budget in milliseconds per benchmark task. Works with `limitBy` to control benchmark duration.

```json
{
  "time": 5000
}
```

:::caution[Time Budget Limits]
modestbench internally caps time at 2000ms to prevent overflow errors with extremely fast operations.
:::

#### `limitBy`

**Type:** `"iterations" | "time" | "any" | "all"`  
**Default:** Smart default based on which options are provided

Controls how benchmarks are limited:

- `iterations`: Stop after N samples (time budget set to 1ms)
- `time`: Run for T milliseconds (collect as many samples as possible)
- `any`: Stop when either threshold is reached (defaults to iterations behavior)
- `all`: Require both time AND iterations thresholds (tinybench default)

```json
{
  "limitBy": "time"
}
```

**Smart Defaults:**

- Only `iterations` provided → `"iterations"` mode (fast)
- Only `time` provided → `"time"` mode
- Both provided → `"any"` mode (whichever comes first)
- Neither provided → Uses default iterations (100) with `"iterations"` mode

#### `warmup`

**Type:** `number`  
**Default:** `0`

Number of warmup iterations before measurement begins. Helps stabilize JIT compilation.

```json
{
  "warmup": 50
}
```

:::tip[When to use warmup]
Use warmup iterations (50-100) for:

- Code that benefits from JIT optimization
- More consistent measurements
- Library benchmarking

:::

#### `timeout`

**Type:** `number` (milliseconds)  
**Default:** `30000`

Maximum time in milliseconds for a single task before timing out.

```json
{
  "timeout": 60000
}
```

#### `bail`

**Type:** `boolean`  
**Default:** `false`

Stop execution on first benchmark failure.

```json
{
  "bail": true
}
```

#### `reporters`

**Type:** `string[]`  
**Default:** Auto-selected based on environment

Array of reporter names to use for output. Available reporters:

- `human` - Color-coded terminal output with progress bars (default for TTY with colors)
- `simple` - Plain text output without colors (default for non-TTY environments)
- `json` - Structured JSON data for programmatic analysis
- `csv` - Tabular data for spreadsheets

```json
{
  "reporters": ["human", "json", "csv"]
}
```

:::note[Auto-Selection]
When not specified, modestbench automatically selects `human` (TTY + color support) or `simple` (non-TTY). The `human` reporter is used when `FORCE_COLOR=1` even in non-TTY environments.
:::

:::note[Multiple Reporters]
You can use multiple reporters simultaneously! Results will be output in all specified formats.
:::

#### `outputDir`

**Type:** `string`  
**Default:** `undefined`

Directory path for saving benchmark results and reports. When specified:

- JSON reporter writes to `{outputDir}/results.json`
- CSV reporter writes to `{outputDir}/results.csv`
- Human reporter still writes to stdout/stderr

```json
{
  "outputDir": "./benchmark-results"
}
```

#### `quiet`

**Type:** `boolean`  
**Default:** `false`

Minimal output mode. Suppresses progress bars and non-essential messages on stderr.

```json
{
  "quiet": true
}
```

:::tip[CI/CD Usage]
In CI/CD environments, modestbench automatically uses the `simple` reporter which has no progress bars. Use `quiet` to further suppress status messages for completely clean output.
:::

:::tip[quiet vs output]
`quiet` suppresses progress (stderr), not data output (stdout). Use it in CI to reduce noise while still getting results.
:::

#### `verbose`

**Type:** `boolean`  
**Default:** `false`

Detailed output mode with additional debugging information.

```json
{
  "verbose": true
}
```

#### `tags`

**Type:** `string[]`  
**Default:** `[]`

Array of tags to include. If non-empty, only benchmarks with ANY of these tags will run.

```json
{
  "tags": ["fast", "critical"]
}
```

Uses OR logic - benchmarks matching ANY tag will run.

#### `excludeTags`

**Type:** `string[]`  
**Default:** `[]`

Array of tags to exclude. Benchmarks with ANY of these tags will be skipped.

```json
{
  "excludeTags": ["slow", "experimental"]
}
```

:::note[Tag Precedence]
`excludeTags` takes precedence over `tags`. If a benchmark has both an included and excluded tag, it will be skipped.
:::

## Configuration Priority

Configuration is merged in the following order (later sources override earlier ones):

1. **Default values** - Built-in defaults
2. **Configuration file** - Project config file
3. **CLI flags** - Command-line arguments

Example:

```json
// modestbench.config.json
{
  "iterations": 1000,
  "reporters": ["human", "json"]
}
```

```bash
# CLI flags override config file
modestbench run --iterations 5000 --reporters csv
# Result: iterations=5000, reporters=["csv"]
```

## Format-Specific Examples

### JSON

```json
{
  "pattern": "benchmarks/**/*.bench.js",
  "iterations": 1000,
  "warmup": 50,
  "reporters": ["human", "json"],
  "outputDir": "./results"
}
```

### YAML

```yaml
pattern: benchmarks/**/*.bench.js
iterations: 1000
warmup: 50
reporters:
  - human
  - json
outputDir: ./results
```

### JavaScript

```javascript
// modestbench.config.js
export default {
  pattern: 'benchmarks/**/*.bench.js',
  iterations: 1000,
  warmup: 50,
  reporters: ['human', 'json'],
  outputDir: './results',
};
```

### TypeScript

```typescript
// modestbench.config.ts
import type { ModestBenchConfig } from 'modestbench';

const config: ModestBenchConfig = {
  pattern: 'benchmarks/**/*.bench.ts',
  iterations: 1000,
  warmup: 50,
  reporters: ['human', 'json'],
  outputDir: './results',
};

export default config;
```

### package.json

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "modestbench": {
    "pattern": "benchmarks/**/*.bench.js",
    "iterations": 1000,
    "reporters": ["human", "json"]
  }
}
```

## Environment-Specific Configuration

You can use JavaScript/TypeScript config files for dynamic configuration:

```javascript
// modestbench.config.js
const isCI = process.env.CI === 'true';

export default {
  iterations: isCI ? 5000 : 100,
  warmup: isCI ? 100 : 0,
  reporters: isCI ? ['json', 'csv'] : ['human'],
  quiet: isCI,
  outputDir: isCI ? './benchmark-results' : undefined,
};
```

## Next Steps

- See [CLI Reference](/guides/cli/) for command-line options
- Learn about [Output Formats](/guides/output/) for reporter details
- Explore [Advanced Usage](/guides/advanced/) for complex scenarios
