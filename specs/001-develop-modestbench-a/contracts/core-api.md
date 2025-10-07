# Core API Contracts

## BenchmarkEngine Interface

### Primary Execution Engine

```typescript
interface BenchmarkEngine {
  /**
   * Execute a collection of benchmark files
   */
  execute(config: RunConfiguration): Promise<BenchmarkRun>;
  
  /**
   * Validate benchmark files without execution
   */
  validate(files: string[]): Promise<ValidationResult>;
  
  /**
   * Discover benchmark files based on patterns
   */
  discover(pattern: string, exclude?: string[]): Promise<string[]>;
  
  /**
   * Register custom reporter
   */
  registerReporter(name: string, reporter: Reporter): void;
  
  /**
   * Get available reporters
   */
  getReporters(): Record<string, Reporter>;
}
```

### Configuration Management

```typescript
interface ConfigurationManager {
  /**
   * Load configuration from file and CLI args
   */
  load(configPath?: string, cliArgs?: CliArgs): Promise<ModestBenchConfig>;
  
  /**
   * Validate configuration object
   */
  validate(config: Partial<ModestBenchConfig>): ValidationResult;
  
  /**
   * Merge configurations with precedence
   */
  merge(...configs: Partial<ModestBenchConfig>[]): ModestBenchConfig;
  
  /**
   * Get default configuration
   */
  getDefaults(): ModestBenchConfig;
}
```

## File System Contracts

### Benchmark File Loader

```typescript
interface BenchmarkFileLoader {
  /**
   * Load and parse a benchmark file
   */
  load(filePath: string): Promise<BenchmarkFile>;
  
  /**
   * Load multiple files in parallel
   */
  loadAll(filePaths: string[]): Promise<BenchmarkFile[]>;
  
  /**
   * Watch for file changes
   */
  watch(pattern: string, callback: (changes: FileChange[]) => void): FileWatcher;
  
  /**
   * Validate file structure
   */
  validate(filePath: string): Promise<ValidationResult>;
}

interface FileChange {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  timestamp: Date;
}

interface FileWatcher {
  close(): void;
}
```

### Historical Data Storage

```typescript
interface HistoryStorage {
  /**
   * Save benchmark run results
   */
  saveRun(run: BenchmarkRun): Promise<void>;
  
  /**
   * Load specific run by ID
   */
  loadRun(id: string): Promise<BenchmarkRun | null>;
  
  /**
   * Query runs with filters
   */
  queryRuns(query: HistoryQuery): Promise<BenchmarkRun[]>;
  
  /**
   * Get run metadata index
   */
  getIndex(): Promise<HistoryIndex>;
  
  /**
   * Clean up old runs based on retention policy
   */
  cleanup(policy: RetentionPolicy): Promise<CleanupResult>;
  
  /**
   * Export historical data
   */
  export(format: 'json' | 'csv', query?: HistoryQuery): Promise<string>;
}

interface HistoryQuery {
  since?: Date;
  until?: Date;
  pattern?: string;
  tags?: string[];
  limit?: number;
  status?: RunStatus[];
}

interface RetentionPolicy {
  maxRuns?: number;
  maxAge?: number; // days
  maxSize?: number; // bytes
}

interface CleanupResult {
  removedRuns: number;
  freedSpace: number; // bytes
  errors: string[];
}
```

## Progress Tracking Contracts

### Progress Manager

```typescript
interface ProgressManager {
  /**
   * Initialize progress tracking for a run
   */
  initialize(run: BenchmarkRun): void;
  
  /**
   * Update progress state
   */
  update(update: Partial<ProgressState>): void;
  
  /**
   * Get current progress state
   */
  getState(): ProgressState;
  
  /**
   * Calculate estimated completion time
   */
  estimateCompletion(): Date | null;
  
  /**
   * Register progress listener
   */
  onProgress(callback: (state: ProgressState) => void): void;
  
  /**
   * Clean up progress tracking resources
   */
  cleanup(): void;
}
```

### Time Estimation Engine

```typescript
interface TimeEstimationEngine {
  /**
   * Load historical timing data
   */
  loadEstimates(): Promise<void>;
  
  /**
   * Update estimates based on completed benchmarks
   */
  updateEstimate(key: string, duration: number): void;
  
  /**
   * Get estimated duration for benchmark
   */
  getEstimate(key: string): TimingEstimate | null;
  
  /**
   * Calculate total estimated time for run
   */
  estimateTotal(files: BenchmarkFile[]): number;
  
  /**
   * Persist estimates to cache
   */
  saveEstimates(): Promise<void>;
}
```

## Reporter System Contracts

### Reporter Registry

```typescript
interface ReporterRegistry {
  /**
   * Register a new reporter
   */
  register(name: string, reporter: Reporter): void;
  
  /**
   * Get reporter by name
   */
  get(name: string): Reporter | null;
  
  /**
   * Get all available reporters
   */
  getAll(): Record<string, Reporter>;
  
  /**
   * Create reporter instances for a run
   */
  createInstances(names: string[], config: ModestBenchConfig): Reporter[];
}
```

### Built-in Reporters

```typescript
interface HumanReporter extends Reporter {
  /**
   * Configure color output
   */
  setColorEnabled(enabled: boolean): void;
  
  /**
   * Configure progress bar style
   */
  setProgressStyle(style: ProgressStyle): void;
}

interface JsonReporter extends Reporter {
  /**
   * Configure output formatting
   */
  setFormatting(pretty: boolean, indent?: number): void;
  
  /**
   * Set output stream or file
   */
  setOutput(output: NodeJS.WriteStream | string): void;
}

interface CsvReporter extends Reporter {
  /**
   * Configure CSV format options
   */
  setOptions(options: CsvOptions): void;
  
  /**
   * Set output file path
   */
  setOutputFile(path: string): void;
}

interface ProgressStyle {
  format: string; // Progress bar format template
  width: number; // Character width
  chars: {
    complete: string;
    incomplete: string;
    head: string;
  };
}

interface CsvOptions {
  delimiter: string;
  quote: string;
  escape: string;
  header: boolean;
}
```

## Validation Contracts

### Validation Result

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

interface ValidationWarning {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}
```

### File Validator

```typescript
interface FileValidator {
  /**
   * Validate benchmark file structure
   */
  validateStructure(file: BenchmarkFile): ValidationResult;
  
  /**
   * Validate benchmark function
   */
  validateFunction(fn: Function): ValidationResult;
  
  /**
   * Validate configuration object
   */
  validateConfig(config: Partial<TinybenchConfig>): ValidationResult;
  
  /**
   * Check for performance anti-patterns
   */
  checkAntiPatterns(file: BenchmarkFile): ValidationResult;
}
```

## Error Handling Contracts

### Error Management

```typescript
interface ErrorManager {
  /**
   * Handle execution error
   */
  handleError(error: Error, context: ErrorContext): ExecutionError;
  
  /**
   * Register error handler
   */
  onError(handler: (error: ExecutionError) => void): void;
  
  /**
   * Get error statistics
   */
  getStats(): ErrorStats;
  
  /**
   * Clear error history
   */
  clearStats(): void;
}

interface ErrorContext {
  phase: ExecutionPhase;
  file?: string;
  suite?: string;
  task?: string;
  timestamp: Date;
}

interface ErrorStats {
  total: number;
  byPhase: Record<ExecutionPhase, number>;
  byType: Record<string, number>;
  recent: ExecutionError[];
}
```

## Plugin System Contracts

### Plugin Interface

```typescript
interface Plugin {
  name: string;
  version: string;
  
  /**
   * Initialize plugin
   */
  initialize(engine: BenchmarkEngine): Promise<void>;
  
  /**
   * Plugin lifecycle hooks
   */
  hooks?: {
    beforeRun?: (run: BenchmarkRun) => Promise<void>;
    afterRun?: (run: BenchmarkRun) => Promise<void>;
    beforeFile?: (file: BenchmarkFile) => Promise<void>;
    afterFile?: (file: BenchmarkFile, results: BenchmarkResult[]) => Promise<void>;
  };
  
  /**
   * Cleanup plugin resources
   */
  cleanup?(): Promise<void>;
}

interface PluginManager {
  /**
   * Load plugin from module
   */
  load(modulePath: string): Promise<Plugin>;
  
  /**
   * Register plugin instance
   */
  register(plugin: Plugin): void;
  
  /**
   * Get all loaded plugins
   */
  getPlugins(): Plugin[];
  
  /**
   * Execute plugin hooks
   */
  executeHooks(hookName: string, ...args: any[]): Promise<void>;
}
```

## Environment Contracts

### System Information

```typescript
interface SystemInfo {
  /**
   * Collect current environment information
   */
  collect(): Promise<EnvironmentInfo>;
  
  /**
   * Monitor system resources during execution
   */
  monitor(callback: (stats: ResourceStats) => void): ResourceMonitor;
  
  /**
   * Get system capabilities
   */
  getCapabilities(): SystemCapabilities;
}

interface ResourceStats {
  cpuUsage: number; // percentage
  memoryUsage: number; // bytes
  timestamp: Date;
}

interface ResourceMonitor {
  stop(): void;
}

interface SystemCapabilities {
  maxConcurrency: number;
  availableMemory: number;
  supportedFormats: string[];
  features: string[];
}
```