# Data Model: ModestBench Framework

**Generated**: 2025-10-06  
**Phase**: 1 - Design & Contracts

## Core Domain Models

### Benchmark Hierarchy

```typescript
/**
 * Root container for all benchmarks in a single file
 */
interface BenchmarkFile {
  readonly name: string;
  readonly path: string;
  readonly suites: BenchmarkSuite[];
  readonly config?: Partial<TinybenchConfig>;
  readonly metadata: FileMetadata;
}

interface FileMetadata {
  readonly created: Date;
  readonly modified: Date;
  readonly size: number;
  readonly checksum: string; // For change detection
}

/**
 * Logical grouping of related benchmarks within a file
 */
interface BenchmarkSuite {
  readonly name: string;
  readonly benchmarks: BenchmarkTask[];
  readonly setup?: () => void | Promise<void>;
  readonly teardown?: () => void | Promise<void>;
  readonly config?: Partial<TinybenchConfig>;
}

/**
 * Individual benchmark task - the atomic unit of measurement
 */
interface BenchmarkTask {
  readonly name: string;
  readonly fn: () => void | Promise<void>;
  readonly config?: Partial<TinybenchConfig>;
  readonly tags?: string[]; // For filtering/grouping
}
```

### Execution Models

```typescript
/**
 * Configuration for a benchmark run
 */
interface RunConfiguration {
  readonly files: string[]; // File paths to execute
  readonly pattern?: string; // Glob pattern for discovery
  readonly exclude?: string[]; // Exclusion patterns
  readonly reporters: ReporterType[];
  readonly outputDir?: string;
  readonly concurrent?: boolean; // Parallel suite execution
  readonly bail?: boolean; // Stop on first failure
  readonly config: Partial<TinybenchConfig>; // Base config for all benchmarks
}

/**
 * A complete benchmark execution session
 */
interface BenchmarkRun {
  readonly id: string; // UUID for this run
  readonly timestamp: Date;
  readonly configuration: RunConfiguration;
  readonly environment: EnvironmentInfo;
  readonly results: BenchmarkResult[];
  readonly duration: number; // Total run time in milliseconds
  readonly status: RunStatus;
  readonly errors?: ExecutionError[];
}

enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Result of executing a single benchmark task
 */
interface BenchmarkResult {
  readonly file: string;
  readonly suite: string;
  readonly task: string;
  readonly duration: number; // Average duration in milliseconds
  readonly iterations: number; // Number of iterations run
  readonly hz: number; // Operations per second
  readonly stats: BenchmarkStats;
  readonly timestamp: Date;
  readonly tags?: string[];
}

interface BenchmarkStats {
  readonly mean: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
  readonly stdDev: number;
  readonly variance: number;
  readonly samples: number[];
}
```

### System Environment

```typescript
/**
 * Environment information captured during benchmark run
 */
interface EnvironmentInfo {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly nodeVersion: string;
  readonly v8Version: string;
  readonly cpuModel: string;
  readonly cpuCores: number;
  readonly totalMemory: number; // bytes
  readonly freeMemory: number; // bytes at start
  readonly hostname: string;
  readonly timestamp: Date;
}

/**
 * Runtime error during benchmark execution
 */
interface ExecutionError {
  readonly file?: string;
  readonly suite?: string;
  readonly task?: string;
  readonly message: string;
  readonly stack?: string;
  readonly timestamp: Date;
  readonly phase: ExecutionPhase;
}

enum ExecutionPhase {
  DISCOVERY = 'discovery',
  VALIDATION = 'validation',
  SETUP = 'setup',
  EXECUTION = 'execution',
  TEARDOWN = 'teardown',
  REPORTING = 'reporting',
}
```

### Progress Tracking

```typescript
/**
 * Real-time progress state during benchmark execution
 */
interface ProgressState {
  readonly files: ProgressLevel;
  readonly suites: ProgressLevel;
  readonly tasks: ProgressLevel;
  readonly startTime: Date;
  readonly estimatedCompletion?: Date;
  readonly currentPhase: ExecutionPhase;
  readonly currentItem?: string; // Currently executing item name
}

interface ProgressLevel {
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly current?: string;
}

/**
 * Historical timing data for estimation
 */
interface TimingEstimate {
  readonly key: string; // file:suite:task identifier
  readonly averageDuration: number; // milliseconds
  readonly sampleCount: number;
  readonly lastUpdated: Date;
  readonly confidence: number; // 0-1, based on sample size and variance
}
```

### Configuration Management

```typescript
/**
 * Complete ModestBench configuration
 */
interface ModestBenchConfig {
  // Benchmark execution options
  readonly iterations?: number;
  readonly time?: number; // milliseconds
  readonly warmup?: boolean;
  readonly concurrent?: boolean;

  // File discovery
  readonly pattern?: string;
  readonly exclude?: string[];
  readonly include?: string[];

  // Output and reporting
  readonly reporters?: ReporterType[];
  readonly outputDir?: string;
  readonly quiet?: boolean;
  readonly verbose?: boolean;

  // Historical data
  readonly historyLimit?: number; // null = unlimited
  readonly historyDir?: string;

  // Progress tracking
  readonly estimationWindow?: number; // samples for ETA
  readonly progressInterval?: number; // milliseconds between updates

  // Performance
  readonly maxConcurrency?: number;
  readonly memoryLimit?: number; // bytes
  readonly timeout?: number; // milliseconds per benchmark
}

type ReporterType = 'human' | 'json' | 'csv' | 'silent';
```

### Storage Schema

```typescript
/**
 * Persisted historical data structure
 */
interface HistoryIndex {
  readonly runs: HistoryEntry[];
  readonly lastCleanup: Date;
  readonly totalRuns: number;
  readonly diskUsage: number; // bytes
}

interface HistoryEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly status: RunStatus;
  readonly fileCount: number;
  readonly benchmarkCount: number;
  readonly duration: number;
  readonly size: number; // file size in bytes
}

/**
 * Cached timing estimates for faster startup
 */
interface EstimateCache {
  readonly estimates: Record<string, TimingEstimate>;
  readonly lastUpdated: Date;
  readonly version: string; // Cache format version
}
```

## Entity Relationships

### Hierarchical Structure

- `BenchmarkFile` (1) → `BenchmarkSuite` (many)
- `BenchmarkSuite` (1) → `BenchmarkTask` (many)
- `BenchmarkRun` (1) → `BenchmarkResult` (many)
- `BenchmarkResult` (1) → `BenchmarkStats` (1)

### Cross-References

- `BenchmarkResult.{file,suite,task}` → Identifies source hierarchy
- `TimingEstimate.key` → Composite key for benchmark identification
- `HistoryEntry.id` → References full `BenchmarkRun` data

### Temporal Relationships

- `HistoryIndex` → Chronological list of `BenchmarkRun` instances
- `EstimateCache` → Aggregated historical timing data
- `ProgressState` → Real-time execution state

## Data Validation Rules

### File Structure Validation

- File names must be unique within a run
- Suite names must be unique within a file
- Task names must be unique within a suite
- Circular references in setup/teardown chains prohibited

### Configuration Validation

- `iterations` must be positive integer
- `time` must be positive number
- `historyLimit` must be positive integer or null
- `timeout` must be greater than expected benchmark duration

### Result Validation

- `duration` must be non-negative
- `iterations` must be positive
- `hz` must be non-negative
- `stats.samples` length must equal `iterations`

## Storage Implementation Strategy

### File System Layout

```
.modestbench/
├── history/
│   ├── index.json              # HistoryIndex
│   └── runs/
│       ├── 2025-10-06-001.json # BenchmarkRun data
│       └── 2025-10-06-002.json
├── cache/
│   └── estimates.json          # EstimateCache
└── config/
    └── defaults.json           # User defaults
```

### Data Serialization

- **JSON Format**: Human-readable, widely supported
- **Compression**: Optional gzip for large historical datasets
- **Streaming**: Support for processing large result sets
- **Atomic Writes**: Ensure data integrity during writes

### Migration Strategy

- **Version Field**: Track data format versions
- **Backward Compatibility**: Read older formats
- **Migration Scripts**: Automated upgrade of legacy data
- **Validation**: Verify data integrity after migration

## Memory Management

### Streaming Operations

- Process benchmark files one at a time
- Write results incrementally during execution
- Limit in-memory result accumulation

### Cache Management

- LRU eviction for timing estimates
- Periodic cleanup of stale cache entries
- Memory-mapped access for large history files

### Resource Cleanup

- Automatic cleanup of progress tracking resources
- Graceful shutdown procedures
- Temporary file cleanup on errors
