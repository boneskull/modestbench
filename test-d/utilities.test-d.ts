import {
  type Brand,
  type DeepPartial,
  type DeepReadonly,
  ExitCodes,
  failure,
  isDefined,
  isPositiveNumber,
  type MaybePromise,
  type ModestBenchConfig,
  type NonEmptyArray,
  type Option,
  type ProgressState,
  type Result,
  type RunConfiguration,
  success,
  type ThresholdConfig,
} from 'modestbench';
import { describe, it } from 'node:test';
import { expectAssignable, expectType } from 'tsd';

describe('Utility Types and Functions', () => {
  describe('CLI Types', () => {
    it('should export ExitCodes with correct values', () => {
      expectType<0>(ExitCodes.SUCCESS);
      expectType<1>(ExitCodes.BENCHMARK_FAILURES);
      expectType<2>(ExitCodes.CONFIG_ERROR);
      expectType<3>(ExitCodes.DISCOVERY_ERROR);
      expectType<4>(ExitCodes.VALIDATION_ERROR);
      expectType<5>(ExitCodes.RUNTIME_ERROR);
    });
  });

  describe('Brand', () => {
    it('should create nominal types for type safety', () => {
      type UserId = Brand<string, 'UserId'>;
      const id = 'user-123' as UserId;
      expectType<UserId>(id);
      // Brand types are structurally compatible with their base type in TypeScript
      expectAssignable<string>(id);
    });
  });

  describe('Result', () => {
    it('should support success case', () => {
      const successResult: Result<string, Error> = {
        data: 'result',
        success: true,
      };
      expectAssignable<Result<string, Error>>(successResult);
    });

    it('should support failure case', () => {
      const failureResult: Result<string, Error> = {
        error: new Error('Failed'),
        success: false,
      };
      expectAssignable<Result<string, Error>>(failureResult);
    });
  });

  describe('Option', () => {
    it('should represent nullable values', () => {
      const opt: Option<string> = 'value';
      expectAssignable<null | string | undefined>(opt);
    });

    it('should accept null and undefined', () => {
      const nullOpt: Option<string> = null;
      const undefinedOpt: Option<string> = undefined;
      expectAssignable<null | string | undefined>(nullOpt);
      expectAssignable<null | string | undefined>(undefinedOpt);
    });
  });

  describe('MaybePromise', () => {
    it('should accept sync or async values', () => {
      const maybeAsync: MaybePromise<number> = 42;
      expectAssignable<number | Promise<number>>(maybeAsync);
    });

    it('should accept Promise values', () => {
      const asyncValue: MaybePromise<string> = Promise.resolve('async');
      expectAssignable<Promise<string> | string>(asyncValue);
    });
  });

  describe('NonEmptyArray', () => {
    it('should enforce at least one element', () => {
      const arr: NonEmptyArray<string> = ['first'];
      expectType<NonEmptyArray<string>>(arr);
      expectAssignable<string[]>(arr);
    });

    it('should support multiple elements', () => {
      const multiArr: NonEmptyArray<number> = [1, 2, 3, 4, 5];
      expectType<NonEmptyArray<number>>(multiArr);
    });
  });

  describe('DeepPartial', () => {
    it('should make all nested properties optional', () => {
      type Config = { a: { b: { c: string } } };
      const partial: DeepPartial<Config> = { a: { b: {} } };
      expectType<DeepPartial<Config>>(partial);
    });
  });

  describe('DeepReadonly', () => {
    it('should make all nested properties readonly', () => {
      type Mutable = { a: { b: string } };
      const readonly: DeepReadonly<Mutable> = { a: { b: 'test' } };
      expectType<DeepReadonly<Mutable>>(readonly);
    });
  });

  describe('Utility Functions', () => {
    it('should export type guard functions', () => {
      expectAssignable<(value: unknown) => boolean>(isDefined);
      expectAssignable<(value: unknown) => boolean>(isPositiveNumber);
    });

    it('should export Result factory functions', () => {
      expectAssignable<(data: unknown) => Result<unknown, never>>(success);
      expectAssignable<(error: unknown) => Result<never, unknown>>(failure);
    });

    it('should work with success helper', () => {
      const result = success('data');
      expectType<Result<string, never>>(result);
    });

    it('should work with failure helper', () => {
      const error = new Error('oops');
      const result = failure(error);
      expectAssignable<Result<never, unknown>>(result);
    });
  });

  describe('Configuration Types', () => {
    describe('RunConfiguration', () => {
      it('should extend ModestBenchConfig with runtime options', () => {
        const config: RunConfiguration = {
          cwd: '/path/to/workspace',
          env: { CI: 'true', NODE_ENV: 'test' },
          files: ['benchmark1.bench.ts', 'benchmark2.bench.ts'],
          iterations: 100,
          time: 1000,
        };

        expectType<string | undefined>(config.cwd);
        expectType<Record<string, string> | undefined>(config.env);
        expectType<string[] | undefined>(config.files);
        expectAssignable<Partial<ModestBenchConfig>>(config);
      });
    });

    describe('ThresholdConfig', () => {
      it('should define performance thresholds', () => {
        const thresholds: ThresholdConfig = {
          maxMarginOfError: 5,
          maxMean: 100000,
          maxP95: 150000,
          maxP99: 200000,
          maxStdDev: 10000,
          minOpsPerSecond: 10000,
        };

        expectType<number | undefined>(thresholds.maxMean);
        expectType<number | undefined>(thresholds.maxP95);
        expectType<number | undefined>(thresholds.maxP99);
        expectType<number | undefined>(thresholds.maxStdDev);
        expectType<number | undefined>(thresholds.maxMarginOfError);
        expectType<number | undefined>(thresholds.minOpsPerSecond);
      });
    });
  });

  describe('Progress Types', () => {
    describe('ProgressState', () => {
      it('should track benchmark execution progress', () => {
        const state: ProgressState = {
          elapsed: 5000,
          filesCompleted: 5,
          percentage: 50,
          suitesCompleted: 10,
          tasksCompleted: 25,
          totalFiles: 10,
          totalSuites: 20,
          totalTasks: 50,
        };

        expectType<number>(state.totalFiles);
        expectType<number>(state.totalSuites);
        expectType<number>(state.totalTasks);
        expectType<number>(state.filesCompleted);
        expectType<number>(state.suitesCompleted);
        expectType<number>(state.tasksCompleted);
        expectType<number>(state.percentage);
        expectType<number>(state.elapsed);
        expectType<string | undefined>(state.currentFile);
        expectType<string | undefined>(state.currentSuite);
        expectType<string | undefined>(state.currentTask);
      });
    });
  });
});
