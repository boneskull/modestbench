import {
  type BenchmarkEngine,
  type BenchmarkFile,
  type BenchmarkRun,
  type ConfigurationManager,
  type ErrorContext,
  type ErrorManager,
  type ExecutionError,
  type FileLoader,
  type FileResult,
  type HistoryStorage,
  type MaybePromise,
  type ModestBenchConfig,
  type ProgressManager,
  type ProgressState,
  type Reporter,
  type RunConfiguration,
  type SuiteResult,
  type TaskResult,
  type ValidationResult,
} from 'modestbench';
import { describe, it } from 'node:test';
import { expectType } from 'tsd';

describe('Interface Types', () => {
  describe('Reporter', () => {
    it('should define all lifecycle methods', () => {
      const reporter: Reporter = {
        onEnd: () => {},
        onError: () => {},
        onFileEnd: () => {},
        onFileStart: () => {},
        onProgress: () => {},
        onStart: () => {},
        onSuiteEnd: () => {},
        onSuiteStart: () => {},
        onTaskResult: () => {},
        onTaskStart: () => {},
      };

      expectType<(run: BenchmarkRun) => MaybePromise<void>>(reporter.onStart);
      expectType<(run: BenchmarkRun) => MaybePromise<void>>(reporter.onEnd);
      expectType<(file: string) => MaybePromise<void>>(reporter.onFileStart);
      expectType<(result: FileResult) => MaybePromise<void>>(
        reporter.onFileEnd,
      );
      expectType<(suite: string) => MaybePromise<void>>(reporter.onSuiteStart);
      expectType<(result: SuiteResult) => MaybePromise<void>>(
        reporter.onSuiteEnd,
      );
      expectType<(task: string) => MaybePromise<void>>(reporter.onTaskStart);
      expectType<(result: TaskResult) => MaybePromise<void>>(
        reporter.onTaskResult,
      );
      expectType<(error: Error) => MaybePromise<void>>(reporter.onError);
      expectType<(state: ProgressState) => MaybePromise<void>>(
        reporter.onProgress,
      );
    });
  });

  describe('BenchmarkEngine', () => {
    it('should define discovery and execution methods', () => {
      const engine: BenchmarkEngine = {
        discover: async () => [],
        execute: async () => ({}) as BenchmarkRun,
        getReporters: () => ({}),
        registerReporter: () => {},
        validate: async () => ({
          errors: [],
          files: [],
          valid: true,
          warnings: [],
        }),
      };

      expectType<
        (pattern: string | string[], exclude?: string[]) => Promise<string[]>
      >(engine.discover);
      expectType<(files: string[]) => Promise<ValidationResult>>(
        engine.validate,
      );
      expectType<
        (
          config: RunConfiguration,
          reporters?: Reporter[],
          signal?: AbortSignal,
        ) => Promise<BenchmarkRun>
      >(engine.execute);
      expectType<(name: string, reporter: Reporter) => void>(
        engine.registerReporter,
      );
      expectType<() => Record<string, Reporter>>(engine.getReporters);
    });
  });

  describe('ConfigurationManager', () => {
    it('should define configuration management methods', () => {
      const manager: ConfigurationManager = {
        getDefaults: () => ({}) as ModestBenchConfig,
        load: async () => ({}) as ModestBenchConfig,
        merge: () => ({}) as ModestBenchConfig,
        validate: () => ({ errors: [], files: [], valid: true, warnings: [] }),
      };

      expectType<() => ModestBenchConfig>(manager.getDefaults);
      expectType<
        (
          configPath?: string,
          cliArgs?: Record<string, unknown>,
        ) => Promise<ModestBenchConfig>
      >(manager.load);
      expectType<
        (...configs: Partial<ModestBenchConfig>[]) => ModestBenchConfig
      >(manager.merge);
      expectType<(config: Partial<ModestBenchConfig>) => ValidationResult>(
        manager.validate,
      );
    });
  });

  describe('ErrorManager', () => {
    it('should define error handling methods', () => {
      const manager: ErrorManager = {
        clearStats: () => {},
        formatError: () => '',
        getErrorCode: () => 'ERROR_001',
        getStats: () => ({
          byPhase: {} as Record<string, number>,
          byType: {} as Record<string, number>,
          recent: [],
          total: 0,
        }),
        handleError: () => ({}) as ExecutionError,
        isRecoverable: () => true,
        onError: () => {},
      };

      expectType<(error: Error, context: ErrorContext) => ExecutionError>(
        manager.handleError,
      );
      expectType<(error: ExecutionError) => boolean>(manager.isRecoverable);
      expectType<(error: ExecutionError) => string>(manager.formatError);
      expectType<(error: Error, context: ErrorContext) => string>(
        manager.getErrorCode,
      );
    });
  });

  describe('ProgressManager', () => {
    it('should define progress tracking methods', () => {
      const manager: ProgressManager = {
        cleanup: () => {},
        estimateCompletion: () => null,
        forceUpdate: () => {},
        getState: () => ({}) as ProgressState,
        initialize: () => {},
        onProgress: () => {},
        update: () => {},
      };

      expectType<(run: BenchmarkRun) => void>(manager.initialize);
      expectType<(state: Partial<ProgressState>) => void>(manager.update);
      expectType<() => ProgressState>(manager.getState);
      expectType<() => Date | null>(manager.estimateCompletion);
      expectType<() => void>(manager.cleanup);
      expectType<() => void>(manager.forceUpdate);
      expectType<(callback: (state: ProgressState) => void) => void>(
        manager.onProgress,
      );
    });
  });

  describe('HistoryStorage', () => {
    it('should define storage methods', () => {
      const storage: HistoryStorage = {
        cleanup: async () => ({
          freedBytes: 0,
          removedFiles: [],
          removedRuns: 0,
        }),
        export: async () => '',
        getIndex: async () => [],
        loadRun: async () => null,
        queryRuns: async () => [],
        saveRun: async () => {},
      };

      expectType<(run: BenchmarkRun) => Promise<void>>(storage.saveRun);
      expectType<(id: string) => Promise<BenchmarkRun | null>>(storage.loadRun);
    });
  });

  describe('FileLoader', () => {
    it('should define file loading methods', () => {
      const loader: FileLoader = {
        discover: async () => [],
        load: async () => ({}) as BenchmarkFile,
        validate: async () => ({
          errors: [],
          files: [],
          valid: true,
          warnings: [],
        }),
      };

      expectType<
        (pattern: string | string[], exclude?: string[]) => Promise<string[]>
      >(loader.discover);
      expectType<(filePath: string) => Promise<BenchmarkFile>>(loader.load);
      expectType<(filePath: string) => Promise<ValidationResult>>(
        loader.validate,
      );
    });
  });
});
