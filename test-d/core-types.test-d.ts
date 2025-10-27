import {
  type BenchmarkFile,
  type BenchmarkRun,
  type CiInfo,
  type CpuInfo,
  type EnvironmentInfo,
  type FileResult,
  type GitInfo,
  type MemoryInfo,
  type ModestBenchConfig,
  type RunId,
  type RunSummary,
  type SuiteResult,
  type TaskResult,
  type ThresholdConfig,
} from 'modestbench';
import { describe, it } from 'node:test';
import { createRunId } from '../src/utils/identifiers.js';
import { expectType } from 'tsd';

describe('Core Data Types', () => {
  describe('BenchmarkRun', () => {
    it('should have correct structure with all required properties', () => {
      const run: BenchmarkRun = {
        config: {
          bail: false,
          exclude: [],
          excludeTags: [],
          iterations: 100,
          limitBy: 'iterations',
          metadata: {},
          outputDir: '.modestbench',
          pattern: '**/*.bench.ts',
          quiet: false,
          reporterConfig: {},
          reporters: ['human'],
          tags: [],
          thresholds: {},
          time: 1000,
          timeout: 30000,
          verbose: false,
          warmup: 10,
        },
        duration: 1000,
        endTime: new Date(),
        environment: {
          arch: 'x64',
          availableMemory: 8000000000,
          cpu: { cores: 8, model: 'Intel', speed: 2400 },
          env: {},
          hostname: 'localhost',
          memory: { free: 8000000000, total: 16000000000, used: 8000000000 },
          nodeVersion: 'v20.0.0',
          platform: 'darwin',
        },
        files: [],
        id: createRunId('run-123'),
        startTime: new Date(),
        summary: {
          failedTasks: 0,
          fastest: null,
          overallMean: 10000,
          passedTasks: 1,
          slowest: null,
          totalFiles: 1,
          totalOperations: 100,
          totalSuites: 1,
          totalTasks: 1,
        },
      };

      expectType<RunId>(run.id);
      expectType<Date>(run.startTime);
      expectType<Date>(run.endTime);
      expectType<number>(run.duration);
      expectType<readonly FileResult[]>(run.files);
      expectType<RunSummary>(run.summary);
      expectType<EnvironmentInfo>(run.environment);
      expectType<ModestBenchConfig>(run.config);
      expectType<GitInfo | undefined>(run.git);
      expectType<CiInfo | undefined>(run.ci);
    });
  });

  describe('TaskResult', () => {
    it('should have correct performance metrics', () => {
      const result: TaskResult = {
        cv: 5,
        iterations: 100,
        marginOfError: 2.5,
        max: 11000,
        mean: 10000,
        min: 9000,
        name: 'benchmark task',
        opsPerSecond: 100000,
        p95: 10500,
        p99: 10900,
        stdDev: 500,
        variance: 250000,
      };

      expectType<string>(result.name);
      expectType<number>(result.mean);
      expectType<number>(result.min);
      expectType<number>(result.max);
      expectType<number>(result.stdDev);
      expectType<number>(result.variance);
      expectType<number>(result.p95);
      expectType<number>(result.p99);
      expectType<number>(result.opsPerSecond);
      expectType<number>(result.marginOfError);
      expectType<number>(result.iterations);
      expectType<Error | undefined>(result.error);
      expectType<Record<string, unknown> | undefined>(result.metadata);
      expectType<string[] | undefined>(result.tags);
      expectType<number>(result.cv);
    });
  });

  describe('SuiteResult', () => {
    it('should contain task results and timing', () => {
      const result: SuiteResult = {
        duration: 1000,
        endTime: new Date(),
        name: 'test suite',
        startTime: new Date(),
        tasks: [],
      };

      expectType<string>(result.name);
      expectType<readonly TaskResult[]>(result.tasks);
      expectType<Date>(result.startTime);
      expectType<Date>(result.endTime);
      expectType<number>(result.duration);
      expectType<Error | undefined>(result.error);
      expectType<Partial<ModestBenchConfig> | undefined>(result.config);
    });
  });

  describe('FileResult', () => {
    it('should contain suite results and file info', () => {
      const result: FileResult = {
        duration: 1000,
        endTime: new Date(),
        filePath: '/path/to/benchmark.bench.ts',
        startTime: new Date(),
        suites: [],
      };

      expectType<string>(result.filePath);
      expectType<readonly SuiteResult[]>(result.suites);
      expectType<Date>(result.startTime);
      expectType<Date>(result.endTime);
      expectType<number>(result.duration);
      expectType<Error | undefined>(result.error);
    });
  });

  describe('RunSummary', () => {
    it('should have aggregated statistics', () => {
      const summary: RunSummary = {
        failedTasks: 1,
        fastest: null,
        overallMean: 10000,
        passedTasks: 4,
        slowest: null,
        totalFiles: 1,
        totalOperations: 500,
        totalSuites: 2,
        totalTasks: 5,
      };

      expectType<number>(summary.totalFiles);
      expectType<number>(summary.totalSuites);
      expectType<number>(summary.totalTasks);
      expectType<number>(summary.totalOperations);
      expectType<number>(summary.passedTasks);
      expectType<number>(summary.failedTasks);
      expectType<number>(summary.overallMean);
      expectType<null | TaskResult>(summary.fastest);
      expectType<null | TaskResult>(summary.slowest);
    });
  });

  describe('ModestBenchConfig', () => {
    it('should have all configuration options', () => {
      const config: ModestBenchConfig = {
        bail: false,
        exclude: ['**/node_modules/**'],
        excludeTags: ['slow'],
        iterations: 100,
        limitBy: 'iterations',
        metadata: { author: 'test' },
        outputDir: '.modestbench',
        pattern: '**/*.bench.ts',
        quiet: false,
        reporterConfig: { json: { prettyPrint: true } },
        reporters: ['human', 'json'],
        tags: ['performance'],
        thresholds: {
          maxMean: 100000,
          minOpsPerSecond: 10000,
        },
        time: 1000,
        timeout: 30000,
        verbose: false,
        warmup: 10,
      };

      expectType<number>(config.iterations);
      expectType<number>(config.time);
      expectType<number>(config.timeout);
      expectType<number>(config.warmup);
      expectType<boolean>(config.quiet);
      expectType<boolean>(config.verbose);
      expectType<boolean>(config.bail);
      expectType<string[]>(config.reporters);
      expectType<string | string[]>(config.pattern);
      expectType<string[]>(config.exclude);
      expectType<string[]>(config.tags);
      expectType<string[]>(config.excludeTags);
      expectType<string>(config.outputDir);
      expectType<'all' | 'any' | 'iterations' | 'time'>(config.limitBy);
      expectType<ThresholdConfig>(config.thresholds);
      expectType<Record<string, unknown>>(config.reporterConfig);
      expectType<Record<string, unknown>>(config.metadata);
    });
  });

  describe('EnvironmentInfo', () => {
    it('should capture system details', () => {
      const env: EnvironmentInfo = {
        arch: 'x64',
        availableMemory: 8000000000,
        cpu: {
          cores: 8,
          model: 'Intel Core i7',
          speed: 2400,
        },
        env: { CI: 'true', NODE_ENV: 'test' },
        hostname: 'localhost',
        memory: {
          free: 8000000000,
          total: 16000000000,
          used: 8000000000,
        },
        nodeVersion: 'v20.0.0',
        platform: 'darwin',
      };

      expectType<string>(env.platform);
      expectType<string>(env.arch);
      expectType<string>(env.nodeVersion);
      expectType<string>(env.hostname);
      expectType<CpuInfo>(env.cpu);
      expectType<MemoryInfo>(env.memory);
      expectType<number>(env.availableMemory);
      expectType<Record<string, string>>(env.env);
    });
  });

  describe('BenchmarkFile', () => {
    it('should include file content and metadata', () => {
      const file: BenchmarkFile = {
        content: 'export const benchmark = () => {}',
        exports: { benchmark: () => {} },
        filePath: '/path/to/benchmark.bench.ts',
        metadata: {
          exportNames: ['benchmark'],
          hasDefaultExport: false,
          mtime: new Date(),
          size: 1024,
        },
      };

      expectType<string>(file.filePath);
      expectType<string>(file.content);
      expectType<unknown>(file.exports);
      expectType<{
        readonly exportNames: string[];
        readonly hasDefaultExport: boolean;
        readonly mtime: Date;
        readonly size: number;
      }>(file.metadata);
    });
  });
});
