# Research: ModestBench Framework

**Generated**: 2025-10-06  
**Phase**: 0 - Technical Research

## Architecture Decisions

### Core Framework Choice: tinybench

- **Decision**: Use tinybench as the underlying benchmark engine
- **Rationale**: Well-established, actively maintained, provides accurate timing measurements
- **Integration**: Wrap tinybench instances within ModestBench suite/task abstractions
- **Configuration**: Support all tinybench options (iterations, warmup, setup/teardown)

### CLI Framework: yargs

- **Decision**: Use yargs for command-line argument parsing and help generation
- **Rationale**: Mature, feature-rich, excellent TypeScript support, built-in help generation
- **Features**: Command routing, argument validation, configuration file support
- **Commands**: `run`, `history`, `init`, `clear-history`

### Progress Tracking: ora vs cli-progress

**Analysis**:

- **ora**: Elegant spinners, good for single operations, limited progress bar support
- **cli-progress**: Full progress bar implementation, percentage tracking, ETA calculation
- **Decision**: Use **cli-progress** for multi-level progress bars (file → suite → task)
- **Rationale**: Better fits requirement for hierarchical progress with time estimates

### Logging/Output: consola

- **Decision**: Use consola for colorful, structured logging
- **Features**: ANSI colors, log levels, consistent formatting
- **Integration**: Base logger for all output, wrapped by reporter implementations
- **Benefits**: Built-in color support eliminates need for separate color library

### Reporter Architecture

**Pattern**: Plugin-based reporter system

- **Base Interface**: `Reporter` with `start()`, `progress()`, `complete()` methods
- **Built-in Reporters**:
  - `HumanReporter` (default, colorful, progress bars)
  - `JsonReporter` (machine-readable JSON output)
  - `CsvReporter` (spreadsheet-compatible CSV)
- **Extensibility**: Support custom reporters via configuration

## Data Models

### Benchmark File Structure

```typescript
interface BenchmarkFile {
  name: string;
  path: string;
  suites: BenchmarkSuite[];
  config?: Partial<TinybenchConfig>;
}

interface BenchmarkSuite {
  name: string;
  benchmarks: BenchmarkTask[];
  setup?: () => void;
  teardown?: () => void;
}

interface BenchmarkTask {
  name: string;
  fn: () => void | Promise<void>;
  config?: Partial<TinybenchConfig>;
}
```

### Historical Data Schema

```typescript
interface BenchmarkRun {
  id: string;
  timestamp: Date;
  results: BenchmarkResult[];
  config: RunConfiguration;
  environment: EnvironmentInfo;
}

interface BenchmarkResult {
  file: string;
  suite: string;
  task: string;
  duration: number; // milliseconds
  iterations: number;
  hz: number; // operations per second
  stats: BenchmarkStats;
}
```

### Progress Tracking Model

```typescript
interface ProgressState {
  files: {
    total: number;
    completed: number;
    current?: string;
  };
  suites: {
    total: number;
    completed: number;
    current?: string;
  };
  tasks: {
    total: number;
    completed: number;
    current?: string;
  };
  estimatedCompletion: Date;
}
```

## Development Dependencies Analysis

### Core Dependencies

- **tinybench**: ^2.6.0 (benchmark engine)
- **yargs**: ^17.7.2 (CLI framework)
- **consola**: ^3.2.3 (logging/colors)
- **cli-progress**: ^3.12.0 (progress bars)

### Development Dependencies

- **typescript**: ^5.2.0 (language)
- **@types/node**: ^20.8.0 (Node.js types)
- **eslint**: ^8.51.0 (linting)
- **@typescript-eslint/eslint-plugin**: ^6.7.4 (TypeScript linting)
- **@typescript-eslint/parser**: ^6.7.4 (TypeScript parser)
- **prettier**: ^3.0.3 (formatting)
- **bupkis**: Latest (assertions)

### Type Definitions Research

- **yargs**: Includes built-in TypeScript definitions
- **consola**: Includes built-in TypeScript definitions
- **cli-progress**: Requires @types/cli-progress from DefinitelyTyped
- **tinybench**: Includes built-in TypeScript definitions

## Configuration Strategy

### Configuration File Support

- **Format**: JSON, YAML, or .js/.ts files
- **Location**: `modestbench.config.{json,yaml,js,ts}` in project root
- **Schema**: Extends tinybench config + ModestBench-specific options
- **Priority**: CLI args > config file > defaults

### Example Configuration

```typescript
interface ModestBenchConfig {
  // Benchmark execution
  warmup?: boolean;
  iterations?: number;
  time?: number;

  // ModestBench specific
  reporters?: ('human' | 'json' | 'csv')[];
  outputDir?: string;
  historyLimit?: number; // max stored runs, null = unlimited

  // File discovery
  pattern?: string; // glob pattern for benchmark files
  exclude?: string[];

  // Progress tracking
  estimationWindow?: number; // samples for ETA calculation
}
```

## File Organization Patterns

### Benchmark File Discovery

- **Default Pattern**: `**/*.bench.{js,ts}`
- **Custom Patterns**: Via config or CLI `--pattern`
- **Exclusions**: `node_modules`, `dist`, `.git` by default

### Storage Structure

```
.modestbench/
├── history/
│   ├── runs/           # Individual run data
│   │   ├── 2025-10-06-001.json
│   │   └── 2025-10-06-002.json
│   └── index.json      # Run metadata index
└── cache/
    └── estimates.json  # Cached timing estimates
```

## Performance Considerations

### Memory Management

- **Streaming**: Process large benchmark suites without loading all results in memory
- **Chunking**: Batch historical data queries for large datasets
- **Cleanup**: Automatic cleanup of progress tracking resources

### Startup Optimization

- **Lazy Loading**: Load reporters and dependencies only when needed
- **Caching**: Cache file discovery and configuration parsing
- **Target**: <2s cold start time for typical projects

### Scale Testing Approach

- **Synthetic Benchmarks**: Generate test suites with 100, 500, 1000+ benchmarks
- **Memory Profiling**: Monitor memory usage during large runs
- **Performance Regression Tests**: Ensure startup time remains under targets

## Error Handling Strategy

### Graceful Degradation

- **Individual Benchmark Failures**: Continue suite execution, report failures
- **Suite Failures**: Continue to next suite, aggregate error reporting
- **Configuration Errors**: Clear error messages with suggested fixes

### Error Recovery

- **Partial Runs**: Save completed results even if run is interrupted
- **Resume Capability**: Ability to resume interrupted benchmark runs
- **Validation**: Pre-flight checks before starting execution

## Development Workflow Integration

### IDE Support

- **VS Code**: TypeScript language server, ESLint extension
- **Debugging**: Source maps for debugging TypeScript
- **Testing**: Node.js test runner integration

### Build Pipeline

- **Compilation**: TypeScript → JavaScript (ESM + CommonJS)
- **Bundling**: Optional bundling for distribution
- **Type Checking**: Strict TypeScript compilation
- **Linting**: ESLint + Prettier in CI/CD

## Research Conclusions

1. **Technical Stack Validated**: All specified dependencies are compatible and actively maintained
2. **Architecture Feasible**: Plugin-based reporter system provides required extensibility
3. **Performance Targets Achievable**: Similar tools achieve <2s startup times
4. **TypeScript Ecosystem Mature**: Strong type support across all dependencies
5. **Testing Strategy Solid**: node:test + bupkis provides modern testing foundation

**Next Phase**: Proceed to design contracts and data models with high confidence in technical approach.
