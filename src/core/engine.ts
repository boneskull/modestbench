/**
 * ModestBench Core Engine
 *
 * Main orchestrator for benchmark discovery, validation, and execution.
 * Implements the BenchmarkEngine interface with dependency injection architecture.
 */

import type {
  BenchmarkEngine,
  BenchmarkRun,
  RunConfiguration,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Reporter,
  ConfigurationManager,
  HistoryStorage,
  ProgressManager,
  EnvironmentInfo,
  GitInfo,
  CiInfo,
  ErrorManager,
  ErrorContext,
  ExecutionPhase,
  FileResult,
  SuiteResult,
  TaskResult,
  ModestBenchConfig,
} from '../types/index.js';

import { Bench } from 'tinybench';
import type { BenchmarkFile } from './loader.js';

/**
 * File loader interface for benchmark discovery and loading
 */
export interface FileLoader {
  discover(pattern: string, exclude?: string[]): Promise<string[]>;
  load(filePath: string): Promise<BenchmarkFile>;
  validate(filePath: string): Promise<ValidationResult>;
}

/**
 * Reporter registry for managing output formatters
 */
export interface ReporterRegistry {
  register(name: string, reporter: Reporter): void;
  get(name: string): Reporter | undefined;
  getAll(): Record<string, Reporter>;
  getByNames(names: string[]): Reporter[];
}

/**
 * Dependencies required by the BenchmarkEngine
 */
export interface EngineDependencies {
  readonly configManager: ConfigurationManager;
  readonly fileLoader: FileLoader;
  readonly reporterRegistry: ReporterRegistry;
  readonly historyStorage: HistoryStorage;
  readonly progressManager: ProgressManager;
  readonly errorManager: ErrorManager;
}

/**
 * Main benchmark execution engine with dependency injection
 */
export class ModestBenchEngine implements BenchmarkEngine {
  private readonly configManager: ConfigurationManager;
  private readonly fileLoader: FileLoader;
  private readonly reporterRegistry: ReporterRegistry;
  private readonly historyStorage: HistoryStorage;
  private readonly progressManager: ProgressManager;
  private readonly errorManager: ErrorManager;

  constructor(dependencies: EngineDependencies) {
    this.configManager = dependencies.configManager;
    this.fileLoader = dependencies.fileLoader;
    this.reporterRegistry = dependencies.reporterRegistry;
    this.historyStorage = dependencies.historyStorage;
    this.progressManager = dependencies.progressManager;
    this.errorManager = dependencies.errorManager;
  }

  /**
   * Execute benchmarks with the given configuration
   */
  async execute(
    config: RunConfiguration,
    reporters: Reporter[] = []
  ): Promise<BenchmarkRun> {
    const startTime = new Date();
    let currentPhase: ExecutionPhase = 'discovery';

    try {
      // 1. Merge configuration with defaults
      currentPhase = 'discovery';
      const mergedConfig = await this.configManager.load(
        undefined, // No specific config path for now
        config as Record<string, unknown>
      );

      // 2. Discover files if not explicitly provided
      const files =
        config.files ||
        (await this.discover(mergedConfig.pattern, mergedConfig.exclude));

      if (files.length === 0) {
        const error = new Error(
          'No benchmark files found matching the pattern'
        );
        this.errorManager.handleError(error, {
          phase: currentPhase,
          timestamp: new Date(),
        });
        throw error;
      }

      // 3. Validate files
      currentPhase = 'validation';
      const validationResult = await this.validate(files);
      if (!validationResult.valid) {
        const error = new Error(
          `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
        this.errorManager.handleError(error, {
          phase: currentPhase,
          timestamp: new Date(),
        });
        throw error;
      }

      // 4. Initialize progress tracking
      currentPhase = 'setup';
      const runId = this.generateRunId();

      // Pre-calculate total tasks for progress tracking
      let totalTasks = 0;
      let totalSuites = 0;

      for (const filePath of files) {
        try {
          const benchmarkFile = await this.fileLoader.load(filePath);
          const benchmarkDef = benchmarkFile.exports as any;

          if (benchmarkDef?.suites && typeof benchmarkDef.suites === 'object') {
            for (const [suiteName, suiteData] of Object.entries(
              benchmarkDef.suites
            )) {
              totalSuites++;
              const suite = suiteData as any;
              if (suite?.benchmarks && typeof suite.benchmarks === 'object') {
                totalTasks += Object.keys(suite.benchmarks).length;
              }
            }
          }
        } catch (error) {
          // If we can't load a file for counting, we'll handle it during execution
          console.warn(
            `Warning: Could not pre-load ${filePath} for task counting:`,
            error
          );
        }
      }

      // Create initial run structure for progress tracking
      const gitInfo = await this.getGitInfo();
      const ciInfo = await this.getCiInfo();

      const initialRun: BenchmarkRun = {
        id: runId,
        files: [],
        duration: 0,
        startTime,
        endTime: startTime,
        config: mergedConfig,
        environment: await this.getEnvironmentInfo(),
        ...(gitInfo && { git: gitInfo }),
        ...(ciInfo && { ci: ciInfo }),
        summary: {
          totalFiles: files.length,
          totalSuites,
          totalTasks,
          failedTasks: 0,
          passedTasks: 0,
          fastest: null,
          slowest: null,
          overallMean: 0,
          totalOperations: 0,
        },
      };

      this.progressManager.initialize(initialRun);

      // Register progress callbacks with reporters that support them
      for (const reporter of reporters) {
        if (typeof reporter.onProgress === 'function') {
          this.progressManager.onProgress(state => {
            reporter.onProgress(state);
          });
        }
      }

      // 5. Call reporter onStart lifecycle method
      await this.callReporters(reporters, 'onStart', initialRun);

      // 6. Execute benchmark files
      currentPhase = 'execution';
      const fileResults: FileResult[] = [];

      for (const filePath of files) {
        try {
          // Call reporter onFileStart
          await this.callReporters(reporters, 'onFileStart', filePath);

          const fileResult = await this.executeBenchmarkFile(
            filePath,
            mergedConfig,
            reporters
          );
          fileResults.push(fileResult);

          // Call reporter onFileEnd
          await this.callReporters(reporters, 'onFileEnd', fileResult);

          // Update progress
          this.progressManager.update({
            filesCompleted: fileResults.length,
            currentFile: filePath,
          });
        } catch (error) {
          const fileError =
            error instanceof Error ? error : new Error(String(error));
          this.errorManager.handleError(fileError, {
            phase: currentPhase,
            file: filePath,
            timestamp: new Date(),
          });

          // Call reporter onError
          await this.callReporters(reporters, 'onError', fileError);

          // Create error result for this file
          const now = new Date();
          const errorResult = {
            filePath,
            suites: [],
            duration: 0,
            startTime: now,
            endTime: now,
            error: fileError,
          };
          fileResults.push(errorResult);

          // Call reporter onFileEnd for error case
          await this.callReporters(reporters, 'onFileEnd', errorResult);
        }
      }

      // Calculate summary statistics
      const finalTotalSuites = fileResults.reduce(
        (sum, file) => sum + file.suites.length,
        0
      );
      const allTasks = fileResults.flatMap(file =>
        file.suites.flatMap((suite: SuiteResult) => suite.tasks)
      );
      const finalTotalTasks = allTasks.length;
      const failedTasks = allTasks.filter(task => task.error).length;
      const passedTasks = finalTotalTasks - failedTasks;

      let fastest: TaskResult | null = null;
      let slowest: TaskResult | null = null;
      let totalOperations = 0;
      let totalTime = 0;

      for (const task of allTasks) {
        if (!task.error) {
          totalOperations += task.iterations;
          totalTime += task.mean * task.iterations;

          if (!fastest || task.mean < fastest.mean) {
            fastest = task;
          }
          if (!slowest || task.mean > slowest.mean) {
            slowest = task;
          }
        }
      }

      const overallMean = totalOperations > 0 ? totalTime / totalOperations : 0;

      const endTime = new Date();
      const finalRun: BenchmarkRun = {
        ...initialRun,
        files: fileResults,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: {
          totalFiles: files.length,
          totalSuites: finalTotalSuites,
          totalTasks: finalTotalTasks,
          failedTasks,
          passedTasks,
          fastest,
          slowest,
          overallMean,
          totalOperations,
        },
      };

      // 7. Save to history
      await this.historyStorage.saveRun(finalRun);

      // 8. Call reporter onEnd lifecycle method
      await this.callReporters(reporters, 'onEnd', finalRun);

      // 9. Return completed run
      return finalRun;
    } catch (error) {
      const executionError =
        error instanceof Error ? error : new Error(String(error));
      const handledError = this.errorManager.handleError(executionError, {
        phase: currentPhase,
        timestamp: new Date(),
      });

      // Re-throw the original error with more context
      throw new Error(`Benchmark execution failed: ${handledError.message}`);
    }
  }

  /**
   * Validate benchmark files without executing them
   */
  async validate(files: string[]): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const validatedFiles: string[] = [];

      // Validate each file
      for (const file of files) {
        try {
          const result = await this.fileLoader.validate(file);
          validatedFiles.push(file);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        } catch (error) {
          const validationError =
            error instanceof Error ? error : new Error(String(error));
          this.errorManager.handleError(validationError, {
            phase: 'validation',
            file,
            timestamp: new Date(),
          });

          errors.push({
            file,
            message: `Failed to validate file: ${validationError.message}`,
            code: 'FILE_VALIDATION_ERROR',
            severity: 'error' as const,
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        files: validatedFiles,
      };
    } catch (error) {
      throw new Error(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Discover benchmark files matching the pattern
   */
  async discover(pattern: string, exclude?: string[]): Promise<string[]> {
    try {
      return await this.fileLoader.discover(pattern, exclude);
    } catch (error) {
      const discoveryError =
        error instanceof Error ? error : new Error(String(error));
      this.errorManager.handleError(discoveryError, {
        phase: 'discovery',
        timestamp: new Date(),
        metadata: { pattern, exclude },
      });

      throw new Error(`File discovery failed: ${discoveryError.message}`);
    }
  }

  /**
   * Register a custom reporter
   */
  registerReporter(name: string, reporter: Reporter): void {
    this.reporterRegistry.register(name, reporter);
  }

  /**
   * Get all available reporters
   */
  getReporters(): Record<string, Reporter> {
    return this.reporterRegistry.getAll();
  }

  /**
   * Get the configuration manager
   */
  getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Get the file loader
   */
  getFileLoader(): FileLoader {
    return this.fileLoader;
  }

  /**
   * Get the history storage
   */
  getHistoryStorage(): HistoryStorage {
    return this.historyStorage;
  }

  /**
   * Get the progress manager
   */
  getProgressManager(): ProgressManager {
    return this.progressManager;
  }

  /**
   * Generate a unique run ID
   */
  private generateRunId(): string {
    return `run-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get environment information
   */
  private async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    const os = await import('node:os');
    const process = await import('node:process');

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: {
        model: os.cpus()[0]?.model || 'Unknown',
        cores: os.cpus().length,
        speed: os.cpus()[0]?.speed || 0,
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      availableMemory: os.freemem(),
      hostname: os.hostname(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CI: process.env.CI || 'false',
      },
    };
  }

  /**
   * Get Git information if available
   */
  private async getGitInfo(): Promise<GitInfo | undefined> {
    // TODO: Implement Git information extraction
    // This would use child_process to run git commands
    return undefined;
  }

  /**
   * Get CI/CD information if available
   */
  private async getCiInfo(): Promise<CiInfo | undefined> {
    const process = await import('node:process');

    if (!process.env.CI) {
      return undefined;
    }

    // Detect common CI providers
    if (process.env.GITHUB_ACTIONS) {
      return {
        provider: 'GitHub Actions',
        ...(process.env.GITHUB_RUN_NUMBER && {
          buildNumber: process.env.GITHUB_RUN_NUMBER,
        }),
        ...(process.env.GITHUB_REPOSITORY &&
          process.env.GITHUB_RUN_ID && {
            buildUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
          }),
        ...(process.env.GITHUB_EVENT_NAME === 'pull_request' &&
          process.env.GITHUB_REF_NAME && {
            pullRequest: process.env.GITHUB_REF_NAME,
          }),
        ...(process.env.GITHUB_REF_NAME && {
          branch: process.env.GITHUB_REF_NAME,
        }),
        ...(process.env.GITHUB_SHA && { commit: process.env.GITHUB_SHA }),
      };
    }

    // Default CI info
    return {
      provider: 'Unknown CI',
      ...(process.env.BRANCH && { branch: process.env.BRANCH }),
      ...(process.env.COMMIT && { commit: process.env.COMMIT }),
    };
  }

  /**
   * Execute a single benchmark file and return its results
   */
  private async executeBenchmarkFile(
    filePath: string,
    config: ModestBenchConfig,
    reporters: Reporter[] = []
  ): Promise<FileResult> {
    const startTime = new Date();

    try {
      // Load the benchmark file using the file loader
      const benchmarkFile = await this.fileLoader.load(filePath);
      const benchmarkDef = benchmarkFile.exports as any;

      if (!benchmarkDef || typeof benchmarkDef !== 'object') {
        throw new Error(
          'Benchmark file must export a default object with suites'
        );
      }

      const suiteResults: SuiteResult[] = [];

      // Process each suite in the file
      if (benchmarkDef.suites && typeof benchmarkDef.suites === 'object') {
        for (const [suiteName, suiteData] of Object.entries(
          benchmarkDef.suites
        )) {
          await this.callReporters(reporters, 'onSuiteStart', suiteName);
          const suiteResult = await this.executeBenchmarkSuite(
            suiteName,
            suiteData as any,
            config,
            reporters
          );
          await this.callReporters(reporters, 'onSuiteEnd', suiteResult);
          suiteResults.push(suiteResult);
        }
      }

      const endTime = new Date();

      return {
        filePath,
        suites: suiteResults,
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        config: benchmarkDef.config,
      };
    } catch (error) {
      const endTime = new Date();
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      return {
        filePath,
        suites: [],
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        error: executionError,
      };
    }
  }

  /**
   * Execute a single benchmark suite and return its results
   */
  private async executeBenchmarkSuite(
    suiteName: string,
    suiteData: any,
    config: ModestBenchConfig,
    reporters: Reporter[] = []
  ): Promise<SuiteResult> {
    const startTime = new Date();

    try {
      const taskResults: TaskResult[] = [];

      // Process each benchmark in the suite
      if (suiteData.benchmarks && typeof suiteData.benchmarks === 'object') {
        for (const [taskName, taskData] of Object.entries(
          suiteData.benchmarks
        )) {
          await this.callReporters(reporters, 'onTaskStart', taskName);

          // Mark task as in-progress (shows as 0.5 progress for current task)
          this.progressManager.update({
            tasksCompleted: taskResults.length + 0.5,
          });

          const taskResult = await this.executeBenchmarkTask(
            taskName,
            taskData as any,
            config,
            reporters
          );
          await this.callReporters(reporters, 'onTaskResult', taskResult);
          taskResults.push(taskResult);

          // Update task-level progress - task is now complete
          this.progressManager.update({
            tasksCompleted: taskResults.length,
          });
        }
      }

      const endTime = new Date();

      return {
        name: suiteName,
        tasks: taskResults,
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        config: suiteData.config,
        metadata: suiteData.metadata,
        tags: suiteData.tags,
      };
    } catch (error) {
      const endTime = new Date();
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      return {
        name: suiteName,
        tasks: [],
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        error: executionError,
      };
    }
  }

  /**
   * Execute a single benchmark task using tinybench
   */
  private async executeBenchmarkTask(
    taskName: string,
    taskData: any,
    config: ModestBenchConfig,
    reporters: Reporter[] = []
  ): Promise<TaskResult> {
    try {
      if (!taskData.fn || typeof taskData.fn !== 'function') {
        throw new Error('Benchmark task must have a "fn" function property');
      }

      // Import tinybench dynamically
      // const { Bench } = await import('tinybench');

      // Create benchmark instance using static import
      const bench = new Bench({
        time: config.time || 1000,
        iterations: config.iterations,
        warmupTime: config.warmup || 0,
        warmupIterations: 0,
      });

      // Add the task
      bench.add(taskName, taskData.fn);

      // Set up periodic progress updates during execution
      const progressInterval = setInterval(() => {
        // Force progress update to show current state with ETA
        this.progressManager.forceUpdate();
      }, 500); // Update every 500ms during execution

      try {
        // Run the benchmark
        await bench.run();
      } finally {
        // Clear the progress interval
        clearInterval(progressInterval);
      }

      // Get results
      const results = bench.results[0];
      if (!results) {
        throw new Error('No benchmark results returned');
      }

      // Check if tinybench detected an error during execution
      if (results.error) {
        throw results.error;
      }

      // Convert nanoseconds to milliseconds for mean calculation
      const meanMs = results.mean / 1_000_000;

      const taskResult = {
        name: taskName,
        mean: results.mean, // Keep in milliseconds from tinybench
        stdDev: results.sd || 0, // tinybench uses 'sd' for standard deviation
        min: results.min || 0,
        max: results.max || 0,
        iterations: results.samples?.length || 0, // Use samples array length
        opsPerSecond: results.hz || 0, // tinybench provides hz (operations per second)
        marginOfError: results.rme || 0, // tinybench has relative margin of error
        variance: results.variance || 0,
        p95: results.p75 || 0, // Use p75 as closest to p95
        p99: results.p99 || 0,
        metadata: taskData.metadata,
        tags: taskData.tags,
      };

      return taskResult;
    } catch (error) {
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      return {
        name: taskName,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        iterations: 0,
        opsPerSecond: 0,
        marginOfError: 0,
        variance: 0,
        p95: 0,
        p99: 0,
        error: executionError,
        metadata: taskData.metadata,
        tags: taskData.tags,
      };
    }
  }

  /**
   * Helper method to call a lifecycle method on all reporters
   */
  private async callReporters(
    reporters: Reporter[],
    method: keyof Reporter,
    ...args: any[]
  ): Promise<void> {
    for (const reporter of reporters) {
      try {
        const result = (reporter[method] as any)(...args);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        // Log reporter errors but don't fail the benchmark run
        console.error(`Reporter error in ${method}:`, error);
      }
    }
  }
}
