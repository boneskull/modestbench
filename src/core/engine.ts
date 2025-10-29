/**
 * ModestBench Core Engine
 *
 * Main orchestrator for benchmark discovery, validation, and execution.
 * Implements the BenchmarkEngine interface with dependency injection
 * architecture.
 */

import { randomBytes } from 'node:crypto';
import { relative as pathRelative } from 'node:path';

import type {
  BaselineSummaryData,
  BenchmarkDefinition,
  BenchmarkEngine,
  BenchmarkRun,
  BenchmarkSuite,
  BenchmarkTask,
  Budget,
  BudgetSummary,
  CiInfo,
  ConfigurationManager,
  EnvironmentInfo,
  FileLoader,
  FileResult,
  GitInfo,
  HistoryStorage,
  ModestBenchConfig,
  ProgressManager,
  Reporter,
  ReporterRegistry,
  RunConfiguration,
  RunId,
  SuiteResult,
  TaskId,
  TaskResult,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js';

import {
  BenchmarkExecutionError,
  BudgetExceededError,
  FileDiscoveryError,
  SchemaValidationError,
  SetupError,
  StructureValidationError,
} from '../errors/index.js';
import { BaselineStorageService } from '../services/baseline-storage.js';
import { BudgetEvaluator } from '../services/budget-evaluator.js';
import { createRunId, createTaskId } from '../types/index.js';

/**
 * Dependencies required by the BenchmarkEngine
 */
interface EngineDependencies {
  readonly configManager: ConfigurationManager;
  readonly fileLoader: FileLoader;
  readonly historyStorage: HistoryStorage;
  readonly progressManager: ProgressManager;
  readonly reporterRegistry: ReporterRegistry;
}

/**
 * Abstract benchmark execution engine with dependency injection
 *
 * Provides generic orchestration logic for benchmark discovery, validation, and
 * execution. Concrete implementations must provide the task execution logic via
 * the executeBenchmarkTask method.
 */
export abstract class ModestBenchEngine implements BenchmarkEngine {
  public readonly configManager: ConfigurationManager;

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
  }

  /**
   * Generate a unique run ID
   *
   * Uses crypto.randomBytes for cryptographically random 7-character IDs.
   * Format: 7 lowercase alphanumeric characters (e.g., "k3m9x2p")
   */
  private static generateRunId(this: void): RunId {
    // Generate random bytes, convert to hex, then to base36, take first 7 chars
    const hex = randomBytes(4).toString('hex');
    const num = parseInt(hex, 16);
    const id = num.toString(36).padStart(7, '0').substring(0, 7);
    return createRunId(id);
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
      throw new FileDiscoveryError(
        `File discovery failed: ${discoveryError.message}`,
        { cause: discoveryError },
      );
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

    try {
      // 1. Merge configuration with defaults
      const mergedConfig = await this.configManager.load(
        undefined, // No specific config path for now
        config as Record<string, unknown>,
      );

      // 2. Discover files if not explicitly provided
      const files =
        config.files ||
        (await this.discover(mergedConfig.pattern, mergedConfig.exclude));

      if (files.length === 0) {
        let msg = `No benchmark files found matching the pattern "${mergedConfig.pattern}`;
        if (mergedConfig.exclude?.length) {
          msg += ` and excluding "${mergedConfig.exclude.join(', ')}"`;
        }
        throw new FileDiscoveryError(msg);
      }

      // 3. Validate files
      const validationResult = await this.validate(files);
      if (!validationResult.valid) {
        throw new SchemaValidationError(
          `Validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
        );
      }

      // 4. Initialize progress tracking
      const runId = ModestBenchEngine.generateRunId();

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
        if (reporter.onProgress) {
          this.progressManager.onProgress((state) => {
            void reporter.onProgress?.(state);
          });
        }
      }

      // 5. Call reporter onStart lifecycle method
      await this.callReporters(reporters, 'onStart', initialRun);

      // 6. Execute benchmark files
      const fileResults: FileResult[] = [];

      for (const filePath of files) {
        try {
          // Normalize file path to be relative to cwd
          const cwd = config.cwd || process.cwd();
          const relativePath = pathRelative(cwd, filePath);

          // Call reporter onFileStart with relative path
          await this.callReporters(reporters, 'onFileStart', relativePath);

          const fileResult = await this.executeBenchmarkFile(
            filePath,
            mergedConfig,
            cwd,
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

          // Check for bail: stop execution if any task failed
          if (mergedConfig.bail) {
            const hasFailedTask = fileResult.suites.some((suite) =>
              suite.tasks.some((task) => task.error),
            );
            if (hasFailedTask) {
              break;
            }
          }
        } catch (error) {
          const fileError =
            error instanceof Error ? error : new Error(String(error));

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

          // Check bail flag for file-level errors
          if (mergedConfig.bail) {
            break;
          }
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
      // Evaluate budgets if configured
      let budgetSummary: BudgetSummary | undefined;

      if (config.budgets && Object.keys(config.budgets).length > 0) {
        const evaluator = new BudgetEvaluator();
        const baselineStorage = new BaselineStorageService(process.cwd());

        // Collect task results
        const taskResults = new Map<TaskId, TaskResult>();

        for (const file of fileResults) {
          for (const suite of file.suites) {
            for (const task of suite.tasks) {
              if (!task.error) {
                // file.filePath is already relative to cwd
                const taskId = createTaskId(
                  file.filePath,
                  suite.name,
                  task.name,
                );
                taskResults.set(taskId, task);
              }
            }
          }
        }

        // Load baseline data if needed for relative budgets
        let baselineData: Map<TaskId, BaselineSummaryData> | undefined;

        // Check if any budgets use relative thresholds
        const hasRelativeBudgets = Object.values(config.budgets).some(
          (budget) => (budget as Budget).relative,
        );

        if (hasRelativeBudgets) {
          const baselineName =
            config.baseline || (await baselineStorage.getDefault());

          if (baselineName) {
            const baseline = await baselineStorage.getBaseline(baselineName);

            if (baseline) {
              // Cast keys to TaskId since they come from validated baseline storage
              baselineData = new Map(
                Object.entries(baseline.summary) as [
                  TaskId,
                  BaselineSummaryData,
                ][],
              );
            } else {
              console.warn(
                `Warning: Baseline "${baselineName}" not found. Relative budgets will be skipped.`,
              );
            }
          } else {
            console.warn(
              'Warning: Relative budgets configured but no baseline specified. Relative budgets will be skipped.',
            );
          }
        }

        // Evaluate budgets
        budgetSummary = evaluator.evaluateRun(
          config.budgets as Record<string, Budget>,
          taskResults,
          baselineData,
        );

        // Notify reporters of budget results
        for (const reporter of reporters) {
          if (reporter.onBudgetResult) {
            await reporter.onBudgetResult(budgetSummary);
          }
        }

        // Handle budget failures based on budgetMode
        if (budgetSummary.failed > 0) {
          const mode = config.budgetMode || 'fail';

          if (mode === 'fail') {
            throw new BudgetExceededError(
              `${budgetSummary.failed} of ${budgetSummary.total} budget(s) exceeded`,
              budgetSummary,
            );
          } else if (mode === 'warn') {
            console.warn(
              `Warning: ${budgetSummary.failed} of ${budgetSummary.total} budget(s) exceeded`,
            );
          }
          // mode === 'report': just include in output, don't fail
        }
      }

      const endTime = new Date();
      const finalRun: BenchmarkRun = {
        ...initialRun,
        budgetSummary,
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
      // Re-throw our custom errors
      if (
        error instanceof FileDiscoveryError ||
        error instanceof SchemaValidationError ||
        error instanceof BenchmarkExecutionError
      ) {
        throw error;
      }

      const executionError =
        error instanceof Error ? error : new Error(String(error));

      // Re-throw the original error with more context
      throw new BenchmarkExecutionError(
        `Benchmark execution failed: ${executionError.message}`,
        { cause: executionError },
      );
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
   * Execute a single benchmark task
   *
   * This method must be implemented by concrete engine implementations to
   * provide the actual benchmark execution logic.
   *
   * @param taskName - Name of the task being executed
   * @param taskData - Task definition with function and metadata
   * @param config - Benchmark configuration
   * @param reporters - Array of active reporters
   * @param signal - Optional abort signal for cancellation
   * @returns Promise resolving to task execution result
   */
  protected abstract executeBenchmarkTask(
    taskName: string,
    taskData: BenchmarkTask,
    config: ModestBenchConfig,
    reporters: Reporter[],
    signal?: AbortSignal,
  ): Promise<TaskResult>;

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
    cwd: string,
    reporters: Reporter[] = [],
    signal?: AbortSignal,
  ): Promise<FileResult> {
    const startTime = new Date();

    try {
      // Load the benchmark file using the file loader
      const benchmarkFile = await this.fileLoader.load(filePath);
      const benchmarkDef = benchmarkFile.exports as BenchmarkDefinition;

      if (!benchmarkDef || typeof benchmarkDef !== 'object') {
        throw new StructureValidationError(
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
          const { anyTaskMatches, suiteMatches, tasksToRun } =
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

          // Emit suite init with task names for pre-calculation
          const taskNames = tasksToRun.map(([name]) => name);
          await this.callReporters(
            reporters,
            'onSuiteInit',
            suiteName,
            taskNames,
          );

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

      // Normalize file path to be relative to cwd
      const relativePath = pathRelative(cwd, filePath);

      return {
        config: benchmarkDef.config,
        duration: endTime.getTime() - startTime.getTime(),
        endTime,
        filePath: relativePath,
        startTime,
        suites: suiteResults,
      };
    } catch (error) {
      const endTime = new Date();
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      // Normalize file path to be relative to cwd
      const relativePath = pathRelative(cwd, filePath);

      return {
        duration: endTime.getTime() - startTime.getTime(),
        endTime,
        error: executionError,
        filePath: relativePath,
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
          throw new SetupError(`Suite setup failed: ${setupError.message}`, {
            cause: setupError,
          });
        }
      }

      // Merge suite-level config with global config
      // Suite-level config takes precedence over global config
      const mergedConfig = suiteData.config
        ? { ...config, ...suiteData.config }
        : config;

      try {
        // Process each task that passed filtering
        for (const [taskName, taskData] of tasksToRun) {
          await this.callReporters(reporters, 'onTaskStart', taskName);

          // Mark task as in-progress (shows as 0.5 progress for current task)
          const currentState = this.progressManager.getState();
          this.progressManager.update({
            currentTask: taskName,
            tasksCompleted: currentState.tasksCompleted + 0.5,
          });

          const taskResult = await this.executeBenchmarkTask(
            taskName,
            taskData,
            mergedConfig,
            reporters,
            signal,
          );
          await this.callReporters(reporters, 'onTaskResult', taskResult);
          taskResults.push(taskResult);

          // Update task-level progress - task is now complete (remove the 0.5 and add 1)
          this.progressManager.update({
            tasksCompleted: currentState.tasksCompleted + 1,
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
