/**
 * ModestBench Core Engine
 *
 * Main orchestrator for benchmark discovery, validation, and execution.
 * Implements the BenchmarkEngine interface with dependency injection
 * architecture.
 */

import { Bench } from 'tinybench';

import type {
  BenchmarkDefinition,
  BenchmarkEngine,
  BenchmarkRun,
  BenchmarkSuite,
  BenchmarkTask,
  CiInfo,
  ConfigurationManager,
  EnvironmentInfo,
  ErrorManager,
  ExecutionPhase,
  FileLoader,
  FileResult,
  GitInfo,
  HistoryStorage,
  ModestBenchConfig,
  ProgressManager,
  Reporter,
  ReporterRegistry,
  RunConfiguration,
  SuiteResult,
  TaskResult,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js';

/**
 * Dependencies required by the BenchmarkEngine
 */
interface EngineDependencies {
  readonly configManager: ConfigurationManager;
  readonly errorManager: ErrorManager;
  readonly fileLoader: FileLoader;
  readonly historyStorage: HistoryStorage;
  readonly progressManager: ProgressManager;
  readonly reporterRegistry: ReporterRegistry;
}

/**
 * Main benchmark execution engine with dependency injection
 */
export class ModestBenchEngine implements BenchmarkEngine {
  public readonly configManager: ConfigurationManager;

  public readonly errorManager: ErrorManager;

  public readonly fileLoader: FileLoader;

  public readonly historyStorage: HistoryStorage;

  public readonly progressManager: ProgressManager;

  public readonly reporterRegistry: ReporterRegistry;

  constructor(dependencies: EngineDependencies) {
    this.configManager = dependencies.configManager;
    this.fileLoader = dependencies.fileLoader;
    this.reporterRegistry = dependencies.reporterRegistry;
    this.historyStorage = dependencies.historyStorage;
    this.progressManager = dependencies.progressManager;
    this.errorManager = dependencies.errorManager;
  }

  /**
   * Discover benchmark files matching the pattern(s)
   */
  async discover(
    pattern: string | string[],
    exclude?: string[],
  ): Promise<string[]> {
    try {
      return await this.fileLoader.discover(pattern, exclude);
    } catch (error) {
      const discoveryError =
        error instanceof Error ? error : new Error(String(error));
      this.errorManager.handleError(discoveryError, {
        metadata: { exclude, pattern },
        phase: 'discovery',
        timestamp: new Date(),
      });

      throw new Error(`File discovery failed: ${discoveryError.message}`);
    }
  }

  /**
   * Execute benchmarks with the given configuration
   */
  async execute(
    config: RunConfiguration,
    reporters: Reporter[] = [],
    signal?: AbortSignal,
  ): Promise<BenchmarkRun> {
    const startTime = new Date();
    let currentPhase: ExecutionPhase = 'discovery';

    try {
      // 1. Merge configuration with defaults
      currentPhase = 'discovery';
      const mergedConfig = await this.configManager.load(
        undefined, // No specific config path for now
        config as Record<string, unknown>,
      );

      // 2. Discover files if not explicitly provided
      const files =
        config.files ||
        (await this.discover(mergedConfig.pattern, mergedConfig.exclude));

      if (files.length === 0) {
        const error = new Error(
          'No benchmark files found matching the pattern',
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
          `Validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
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
          const benchmarkDef = benchmarkFile.exports as BenchmarkDefinition;

          if (benchmarkDef?.suites && typeof benchmarkDef.suites === 'object') {
            const fileTags = benchmarkDef.tags;

            for (const [_suiteName, suiteData] of Object.entries(
              benchmarkDef.suites,
            )) {
              // Use shared filtering logic
              const { anyTaskMatches, suiteMatches, tasksToRun } =
                this.getFilteredTasksForSuite(
                  suiteData,
                  fileTags,
                  mergedConfig.tags,
                  mergedConfig.excludeTags,
                );

              // Count suite only if it or any of its tasks match
              if (suiteMatches || anyTaskMatches) {
                totalSuites++;
                totalTasks += tasksToRun.length;
              }
            }
          }
        } catch (error) {
          // If we can't load a file for counting, we'll handle it during execution
          // Only show warning if not in quiet mode
          if (!mergedConfig.quiet) {
            console.warn(
              `Warning: Could not pre-load ${filePath} for task counting:`,
              error,
            );
          }
        }
      }

      // Create initial run structure for progress tracking
      const gitInfo = await this.getGitInfo();
      const ciInfo = await this.getCiInfo();

      const initialRun: BenchmarkRun = {
        config: mergedConfig,
        duration: 0,
        endTime: startTime,
        environment: await this.getEnvironmentInfo(),
        files: [],
        id: runId,
        startTime,
        ...(gitInfo && { git: gitInfo }),
        ...(ciInfo && { ci: ciInfo }),
        summary: {
          failedTasks: 0,
          fastest: null,
          overallMean: 0,
          passedTasks: 0,
          slowest: null,
          totalFiles: files.length,
          totalOperations: 0,
          totalSuites,
          totalTasks,
        },
      };

      this.progressManager.initialize(initialRun);

      // Register progress callbacks with reporters that support them
      for (const reporter of reporters) {
        if (typeof reporter.onProgress === 'function') {
          this.progressManager.onProgress((state) => {
            void reporter.onProgress(state);
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
            reporters,
            signal,
          );
          fileResults.push(fileResult);

          // Call reporter onFileEnd
          await this.callReporters(reporters, 'onFileEnd', fileResult);

          // Update progress
          this.progressManager.update({
            currentFile: filePath,
            filesCompleted: fileResults.length,
          });
        } catch (error) {
          const fileError =
            error instanceof Error ? error : new Error(String(error));
          this.errorManager.handleError(fileError, {
            file: filePath,
            phase: currentPhase,
            timestamp: new Date(),
          });

          // Call reporter onError
          await this.callReporters(reporters, 'onError', fileError);

          // Create error result for this file
          const now = new Date();
          const errorResult = {
            duration: 0,
            endTime: now,
            error: fileError,
            filePath,
            startTime: now,
            suites: [],
          };
          fileResults.push(errorResult);

          // Call reporter onFileEnd for error case
          await this.callReporters(reporters, 'onFileEnd', errorResult);
        }
      }

      // Calculate summary statistics
      const finalTotalSuites = fileResults.reduce(
        (sum, file) => sum + file.suites.length,
        0,
      );
      const allTasks = fileResults.flatMap((file) =>
        file.suites.flatMap((suite: SuiteResult) => suite.tasks),
      );
      const finalTotalTasks = allTasks.length;
      const failedTasks = allTasks.filter((task) => task.error).length;
      const passedTasks = finalTotalTasks - failedTasks;

      let fastest: null | TaskResult = null;
      let slowest: null | TaskResult = null;
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
        duration: endTime.getTime() - startTime.getTime(),
        endTime,
        files: fileResults,
        summary: {
          failedTasks,
          fastest,
          overallMean,
          passedTasks,
          slowest,
          totalFiles: files.length,
          totalOperations,
          totalSuites: finalTotalSuites,
          totalTasks: finalTotalTasks,
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
   * Get all available reporters
   */
  getReporters(): Record<string, Reporter> {
    return this.reporterRegistry.getAll();
  }

  /**
   * Register a custom reporter
   */
  registerReporter(name: string, reporter: Reporter): void {
    this.reporterRegistry.register(name, reporter);
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
            file,
            phase: 'validation',
            timestamp: new Date(),
          });

          errors.push({
            code: 'FILE_VALIDATION_ERROR',
            file,
            message: `Failed to validate file: ${validationError.message}`,
            severity: 'error' as const,
          });
        }
      }

      return {
        errors,
        files: validatedFiles,
        valid: errors.length === 0,
        warnings,
      };
    } catch (error) {
      throw new Error(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Helper method to call a lifecycle method on all reporters
   */
  private async callReporters(
    reporters: Reporter[],
    method: keyof Reporter,
    ...args: unknown[]
  ): Promise<void> {
    for (const reporter of reporters) {
      try {
        const reporterMethod = reporter[method];
        if (typeof reporterMethod === 'function') {
          const result = (
            reporterMethod as (...args: unknown[]) => unknown
          ).call(reporter, ...args);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (result && typeof (result as any).then === 'function') {
            await (result as Promise<void>);
          }
        }
      } catch (error) {
        // Log reporter errors but don't fail the benchmark run
        console.error(`Reporter error in ${method}:`, error);
      }
    }
  }

  /**
   * Execute a single benchmark file and return its results
   */
  private async executeBenchmarkFile(
    filePath: string,
    config: ModestBenchConfig,
    reporters: Reporter[] = [],
    signal?: AbortSignal,
  ): Promise<FileResult> {
    const startTime = new Date();

    try {
      // Load the benchmark file using the file loader
      const benchmarkFile = await this.fileLoader.load(filePath);
      const benchmarkDef = benchmarkFile.exports as BenchmarkDefinition;

      if (!benchmarkDef || typeof benchmarkDef !== 'object') {
        throw new Error(
          'Benchmark file must export a default object with suites',
        );
      }

      const suiteResults: SuiteResult[] = [];
      const fileTags = benchmarkDef.tags;

      // Process each suite in the file
      if (benchmarkDef.suites && typeof benchmarkDef.suites === 'object') {
        for (const [suiteName, suiteData] of Object.entries(
          benchmarkDef.suites,
        )) {
          // Use shared filtering logic
          const { anyTaskMatches, suiteMatches } =
            this.getFilteredTasksForSuite(
              suiteData,
              fileTags,
              config.tags,
              config.excludeTags,
            );

          // Skip suite only if neither the suite nor any of its tasks match
          if (!suiteMatches && !anyTaskMatches) {
            continue;
          }

          await this.callReporters(reporters, 'onSuiteStart', suiteName);
          const suiteResult = await this.executeBenchmarkSuite(
            suiteName,
            suiteData,
            config,
            reporters,
            signal,
            fileTags,
          );
          await this.callReporters(reporters, 'onSuiteEnd', suiteResult);
          suiteResults.push(suiteResult);
        }
      }

      const endTime = new Date();

      return {
        config: benchmarkDef.config,
        duration: endTime.getTime() - startTime.getTime(),
        endTime,
        filePath,
        startTime,
        suites: suiteResults,
      };
    } catch (error) {
      const endTime = new Date();
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      return {
        duration: endTime.getTime() - startTime.getTime(),
        endTime,
        error: executionError,
        filePath,
        startTime,
        suites: [],
      };
    }
  }

  /**
   * Execute a single benchmark suite and return its results
   */
  private async executeBenchmarkSuite(
    suiteName: string,
    suiteData: BenchmarkSuite,
    config: ModestBenchConfig,
    reporters: Reporter[] = [],
    signal?: AbortSignal,
    fileTags?: string[],
  ): Promise<SuiteResult> {
    const startTime = new Date();

    try {
      const taskResults: TaskResult[] = [];

      // Use shared filtering logic to determine which tasks will run
      const { tasksToRun } = this.getFilteredTasksForSuite(
        suiteData,
        fileTags,
        config.tags,
        config.excludeTags,
      );

      // Only run setup/teardown if there are tasks to execute
      if (tasksToRun.length === 0) {
        // No tasks match the filters, return empty suite result
        const endTime = new Date();
        return {
          duration: endTime.getTime() - startTime.getTime(),
          endTime,
          name: suiteName,
          startTime,
          tasks: [],
          ...(suiteData.config !== undefined && { config: suiteData.config }),
          ...(suiteData.metadata !== undefined && {
            metadata: suiteData.metadata,
          }),
          ...(suiteData.tags !== undefined && { tags: suiteData.tags }),
        };
      }

      // Run suite setup if provided
      if (suiteData.setup && typeof suiteData.setup === 'function') {
        try {
          await suiteData.setup();
        } catch (error) {
          const setupError =
            error instanceof Error
              ? error
              : new Error(`Setup failed: ${String(error)}`);
          throw new Error(`Suite setup failed: ${setupError.message}`);
        }
      }

      try {
        // Process each task that passed filtering
        for (const [taskName, taskData] of tasksToRun) {
          await this.callReporters(reporters, 'onTaskStart', taskName);

          // Mark task as in-progress (shows as 0.5 progress for current task)
          this.progressManager.update({
            tasksCompleted: taskResults.length + 0.5,
          });

          const taskResult = await this.executeBenchmarkTask(
            taskName,
            taskData,
            config,
            reporters,
            signal,
          );
          await this.callReporters(reporters, 'onTaskResult', taskResult);
          taskResults.push(taskResult);

          // Update task-level progress - task is now complete
          this.progressManager.update({
            tasksCompleted: taskResults.length,
          });
        }
      } finally {
        // Run suite teardown if provided (always runs, even if benchmarks fail)
        if (suiteData.teardown && typeof suiteData.teardown === 'function') {
          try {
            await suiteData.teardown();
          } catch (error) {
            // Log teardown errors but don't fail the suite
            const teardownError =
              error instanceof Error ? error : new Error(String(error));
            console.error(
              `Warning: Suite teardown failed for "${suiteName}":`,
              teardownError.message,
            );
          }
        }
      }

      const endTime = new Date();

      return {
        duration: endTime.getTime() - startTime.getTime(),
        endTime,
        name: suiteName,
        startTime,
        tasks: taskResults,
        ...(suiteData.config !== undefined && { config: suiteData.config }),
        ...(suiteData.metadata !== undefined && {
          metadata: suiteData.metadata,
        }),
        ...(suiteData.tags !== undefined && { tags: suiteData.tags }),
      };
    } catch (error) {
      const endTime = new Date();
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      return {
        duration: endTime.getTime() - startTime.getTime(),
        endTime,
        error: executionError,
        name: suiteName,
        startTime,
        tasks: [],
      };
    }
  }

  /**
   * Execute a single benchmark task using tinybench
   */
  private async executeBenchmarkTask(
    taskName: string,
    taskData: BenchmarkTask,
    config: ModestBenchConfig,
    _reporters: Reporter[] = [],
    signal?: AbortSignal,
  ): Promise<TaskResult> {
    let progressInterval: NodeJS.Timeout | undefined;

    try {
      if (!taskData.fn || typeof taskData.fn !== 'function') {
        throw new Error('Benchmark task must have a "fn" function property');
      }

      // Import tinybench dynamically
      // const { Bench } = await import('tinybench');

      // Create benchmark instance using static import
      // Determine effective time and iterations based on limitBy mode
      let effectiveTime: number;
      let effectiveIterations: number;

      switch (config.limitBy) {
        case 'all':
          // Both must be met - tinybench default behavior

          effectiveTime = Math.min(config.time || 1000, 2000);
          effectiveIterations = config.iterations;
          break;

        case 'any':
          // Stop at whichever comes first
          // Since tinybench requires BOTH to be met, use iterations mode for faster completion
          // This means if iterations completes before time, it stops (time=1ms ensures time completes fast)
          effectiveTime = 1;
          effectiveIterations = config.iterations;
          break;

        case 'iterations':
          // Iterations is the limit, use minimal time
          effectiveTime = 1;
          effectiveIterations = config.iterations;
          break;

        case 'time':
          // Time is the limit, iterations is a minimum (use small value)
          effectiveTime = Math.min(config.time || 1000, 2000);
          effectiveIterations = 1; // Minimal iterations so time is the limiting factor
          break;

        default:
          // Fallback to iterations mode
          effectiveTime = 1;
          effectiveIterations = config.iterations;
      }

      const bench = new Bench({
        iterations: effectiveIterations,
        time: effectiveTime,
        warmupIterations: config.warmup,
        warmupTime: config.warmup > 0 ? Math.min(config.warmup || 0, 500) : 0,
      });

      // Add the task with signal for task-level abort support
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Pending https://github.com/tinylibs/tinybench/pull/364
      bench.add(taskName, taskData.fn, signal ? { signal } : undefined);

      // Set up periodic progress updates during execution
      progressInterval = setInterval(() => {
        // Force progress update to show current state with ETA
        this.progressManager.forceUpdate();
      }, 500); // Update every 500ms during execution
      progressInterval.unref(); // Allow process to exit even if timer is active

      try {
        // Run the benchmark
        await bench.run();
      } catch (error) {
        // Handle array length errors for extremely fast operations
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Invalid array length')) {
          // Retry with minimal time (1ms) for extremely fast operations
          // Use same limiting logic but with minimal time for fast ops
          let retryTime: number;
          switch (config.limitBy) {
            case 'all':
            case 'any':
              retryTime = 10;
              break;
            case 'iterations':
              retryTime = 1;
              break;
            case 'time':
              retryTime = 10;
              break;
            default:
              retryTime = 1;
          }

          const minimalBench = new Bench({
            iterations: config.iterations,
            time: retryTime,
            warmupIterations: config.warmup,
            warmupTime: 0,
          });
          minimalBench.add(
            taskName,
            taskData.fn,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Pending https://github.com/tinylibs/tinybench/pull/364
            signal ? { signal } : undefined,
          );
          try {
            await minimalBench.run();
          } catch {
            // If still failing, the operation is too fast even for tinybench
            throw new Error(
              `Benchmark operation is too fast to measure reliably (execution time < 1ns)`,
            );
          }
          const minimalResults = minimalBench.results[0];
          if (!minimalResults || minimalResults.error) {
            throw new Error(
              `Benchmark too fast to measure reliably: ${minimalResults?.error?.message || 'unknown error'}`,
            );
          }
          // Continue with minimal results
          const taskResult: TaskResult = {
            iterations: minimalResults.latency.samples?.length || 0,
            marginOfError: minimalResults.latency.rme || 0,
            max: minimalResults.latency.max || 0,
            mean: minimalResults.latency.mean || 0,
            metadata: taskData.metadata ?? {},
            min: minimalResults.latency.min || 0,
            name: taskName,
            opsPerSecond: minimalResults.throughput.mean || 0,
            p95: minimalResults.latency.p75 || 0,
            p99: minimalResults.latency.p99 || 0,
            stdDev: minimalResults.latency.sd || 0,
            ...(taskData.tags ? { tags: taskData.tags } : {}),
            variance: minimalResults.latency.variance || 0,
          };
          return taskResult;
        }
        throw error;
      }

      // Get results
      const results = bench.results[0];
      if (!results) {
        throw new Error('No benchmark results returned');
      }

      // Check if the task was aborted
      if (results.aborted) {
        // Task was aborted via signal - return minimal valid result with error
        const taskResult: TaskResult = {
          error: new Error('Benchmark aborted by user signal'),
          iterations: results.latency?.samples?.length || 0,
          marginOfError: 0,
          max: 0,
          mean: 0,
          metadata: taskData.metadata ?? {},
          min: 0,
          name: taskName,
          opsPerSecond: 0,
          p95: 0,
          p99: 0,
          stdDev: 0,
          ...(taskData.tags ? { tags: taskData.tags } : {}),
          variance: 0,
        };
        return taskResult;
      }

      // Check if tinybench detected an error during execution
      if (results.error) {
        const errorMessage =
          results.error instanceof Error
            ? results.error.message
            : String(results.error);

        // Handle array length errors for extremely fast operations
        if (errorMessage.includes('Invalid array length')) {
          // Retry with minimal time for extremely fast operations
          // Use same limiting logic but with minimal time for fast ops
          let retryTime: number;
          switch (config.limitBy) {
            case 'all':
            case 'any':
              retryTime = 10;
              break;
            case 'iterations':
              retryTime = 1;
              break;
            case 'time':
              retryTime = 10;
              break;
            default:
              retryTime = 1;
          }

          const minimalBench = new Bench({
            iterations: config.iterations,
            time: retryTime,
            warmupIterations: config.warmup,
            warmupTime: 0,
          });
          minimalBench.add(
            taskName,
            taskData.fn,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Pending https://github.com/tinylibs/tinybench/pull/364
            signal ? { signal } : undefined,
          );
          await minimalBench.run();
          const minimalResults = minimalBench.results[0];

          if (!minimalResults || minimalResults.error) {
            // If retry also fails, just accept it failed
            throw new Error(
              `Benchmark operation is too fast to measure reliably`,
            );
          }

          // Return minimal results
          const taskResult: TaskResult = {
            iterations: minimalResults.latency.samples?.length || 0,
            marginOfError: minimalResults.latency.rme || 0,
            max: minimalResults.latency.max || 0,
            mean: minimalResults.latency.mean || 0,
            metadata: taskData.metadata ?? {},
            min: minimalResults.latency.min || 0,
            name: taskName,
            opsPerSecond: minimalResults.throughput.mean || 0,
            p95: minimalResults.latency.p75 || 0,
            p99: minimalResults.latency.p99 || 0,
            stdDev: minimalResults.latency.sd || 0,
            ...(taskData.tags ? { tags: taskData.tags } : {}),
            variance: minimalResults.latency.variance || 0,
          };
          return taskResult;
        }

        throw results.error;
      }

      const taskResult: TaskResult = {
        iterations: results.latency.samples?.length || 0, // Use samples array length
        marginOfError: results.latency.rme || 0, // tinybench has relative margin of error
        max: results.latency.max || 0,
        mean: results.latency.mean || 0, // Keep in milliseconds from tinybench
        metadata: taskData.metadata ?? {},
        min: results.latency.min || 0,
        name: taskName,
        opsPerSecond: results.throughput.mean || 0, // tinybench provides hz (operations per second)
        p95: results.latency.p75 || 0, // Use p75 as closest to p95
        p99: results.latency.p99 || 0,
        stdDev: results.latency.sd || 0, // tinybench uses 'sd' for standard deviation
        ...(taskData.tags ? { tags: taskData.tags } : {}),
        variance: results.latency.variance || 0,
      };

      return taskResult;
    } catch (error) {
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      const errorResult: TaskResult = {
        error: executionError,
        iterations: 0,
        marginOfError: 0,
        max: 0,
        mean: 0,
        metadata: taskData.metadata ?? {},
        min: 0,
        name: taskName,
        opsPerSecond: 0,
        p95: 0,
        p99: 0,
        stdDev: 0,
        ...(taskData.tags ? { tags: taskData.tags } : {}),
        variance: 0,
      };
      return errorResult;
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  }

  /**
   * Generate a unique run ID
   */
  private generateRunId(): string {
    return `run-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
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
   * Get environment information
   */
  private async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    const os = await import('node:os');
    const process = await import('node:process');

    return {
      arch: process.arch,
      availableMemory: os.freemem(),
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        speed: os.cpus()[0]?.speed || 0,
      },
      env: {
        CI: process.env.CI || 'false',
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
      hostname: os.hostname(),
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        used: os.totalmem() - os.freemem(),
      },
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Get filtered tasks for a suite based on tag filtering Returns suite match
   * status and list of tasks to run
   */
  private getFilteredTasksForSuite(
    suiteData: BenchmarkSuite,
    fileTags: string[] | undefined,
    includeTags: string[],
    excludeTags: string[],
  ): {
    anyTaskMatches: boolean;
    suiteMatches: boolean;
    tasksToRun: Array<[string, BenchmarkTask]>;
  } {
    // Check if suite itself matches filters
    const mergedSuiteTags = this.mergeTags(fileTags, suiteData.tags);
    const suiteMatches = this.matchesTags(
      mergedSuiteTags,
      includeTags,
      excludeTags,
    );

    // Check which tasks match filters
    const tasksToRun: Array<[string, BenchmarkTask]> = [];
    if (suiteData.benchmarks && typeof suiteData.benchmarks === 'object') {
      for (const [taskName, taskData] of Object.entries(suiteData.benchmarks)) {
        // Merge task tags with suite and file tags (cascading)
        const mergedTaskTags = this.mergeTags(mergedSuiteTags, taskData.tags);

        // Check if task matches tag filters
        if (this.matchesTags(mergedTaskTags, includeTags, excludeTags)) {
          tasksToRun.push([taskName, taskData]);
        }
      }
    }

    return {
      anyTaskMatches: tasksToRun.length > 0,
      suiteMatches,
      tasksToRun,
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
   * Check if item tags match the filter criteria (OR logic)
   */
  private matchesTags(
    itemTags: string[] | undefined,
    includeTags: string[],
    excludeTags: string[],
  ): boolean {
    const tags = itemTags || [];

    // If exclude tags specified and any match, exclude this item
    if (
      excludeTags.length > 0 &&
      excludeTags.some((tag) => tags.includes(tag))
    ) {
      return false;
    }

    // If include tags specified, at least one must match
    if (includeTags.length > 0) {
      return includeTags.some((tag) => tags.includes(tag));
    }

    // No filters = include everything
    return true;
  }

  /**
   * Merge tags from parent to child (cascading)
   */
  private mergeTags(
    parentTags?: string[],
    childTags?: string[],
  ): string[] | undefined {
    const merged = new Set<string>();
    if (parentTags) {
      for (const tag of parentTags) {
        merged.add(tag);
      }
    }
    if (childTags) {
      for (const tag of childTags) {
        merged.add(tag);
      }
    }
    return merged.size > 0 ? Array.from(merged) : undefined;
  }
}
