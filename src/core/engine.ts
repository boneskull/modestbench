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
} from '../types/index.js';

/**
 * File loader interface for benchmark discovery and loading
 */
export interface FileLoader {
  discover(pattern: string, exclude?: string[]): Promise<string[]>;
  load(filePath: string): Promise<unknown>;
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

  constructor(dependencies: EngineDependencies) {
    this.configManager = dependencies.configManager;
    this.fileLoader = dependencies.fileLoader;
    this.reporterRegistry = dependencies.reporterRegistry;
    this.historyStorage = dependencies.historyStorage;
    this.progressManager = dependencies.progressManager;
  }

  /**
   * Execute benchmarks with the given configuration
   */
  async execute(config: RunConfiguration): Promise<BenchmarkRun> {
    try {
      // 1. Merge configuration with defaults
      const mergedConfig = await this.configManager.load(
        undefined, // No specific config path for now
        config as Record<string, unknown>
      );

      // 2. Discover files if not explicitly provided
      const files =
        config.files ||
        (await this.discover(mergedConfig.pattern, mergedConfig.exclude));

      if (files.length === 0) {
        throw new Error('No benchmark files found matching the pattern');
      }

      // 3. Validate files
      const validationResult = await this.validate(files);
      if (!validationResult.valid) {
        throw new Error(
          `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
      }

      // 4. Initialize progress tracking
      const runId = this.generateRunId();
      const startTime = new Date();

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
          totalSuites: 0,
          totalTasks: 0,
          failedTasks: 0,
          passedTasks: 0,
          fastest: null,
          slowest: null,
          overallMean: 0,
          totalOperations: 0,
        },
      };

      this.progressManager.initialize(initialRun);

      // 5. Execute benchmark files
      // TODO: Implement actual benchmark execution
      // This will involve loading and running each file
      // For now, return the initial structure
      const endTime = new Date();
      const finalRun: BenchmarkRun = {
        ...initialRun,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };

      // 6. Save to history
      await this.historyStorage.saveRun(finalRun);

      // 7. Return completed run
      return finalRun;
    } catch (error) {
      throw new Error(
        `Benchmark execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
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
          errors.push({
            file,
            message: `Failed to validate file: ${error instanceof Error ? error.message : String(error)}`,
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
      throw new Error(
        `File discovery failed: ${error instanceof Error ? error.message : String(error)}`
      );
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
}
