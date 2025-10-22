import {
  type BenchmarkDefinition,
  type BenchmarkSuite,
  type BenchmarkTask,
  type ModestBenchConfig,
} from 'modestbench';
import { describe, it } from 'node:test';
import { expectAssignable, expectType } from 'tsd';

describe('Benchmark Definition Types', () => {
  describe('BenchmarkDefinition', () => {
    it('should define file-level benchmark structure', () => {
      const def: BenchmarkDefinition = {
        suites: {
          'test suite': {
            benchmarks: {
              'test task': { fn: () => {} },
            },
          },
        },
      };

      expectAssignable<Record<string, BenchmarkSuite>>(def.suites);
      expectType<Partial<ModestBenchConfig> | undefined>(def.config);
      expectType<Record<string, unknown> | undefined>(def.metadata);
      expectType<string[] | undefined>(def.tags);
    });
  });

  describe('BenchmarkSuite', () => {
    it('should contain tasks with optional setup/teardown', () => {
      const suite: BenchmarkSuite = {
        benchmarks: {
          'task 1': { fn: () => {} },
          'task 2': { fn: async () => {} },
        },
      };

      expectType<Record<string, BenchmarkTask>>(suite.benchmarks);
      expectType<Partial<ModestBenchConfig> | undefined>(suite.config);
      expectAssignable<(() => unknown) | undefined>(suite.setup);
      expectAssignable<(() => unknown) | undefined>(suite.teardown);
      expectType<Record<string, unknown> | undefined>(suite.metadata);
      expectType<string[] | undefined>(suite.tags);
    });
  });

  describe('BenchmarkTask', () => {
    it('should define individual benchmark task', () => {
      const task: BenchmarkTask = {
        fn: () => {},
      };

      expectType<(...args: any[]) => unknown>(task.fn);
      expectType<Partial<ModestBenchConfig> | undefined>(task.config);
      expectType<Record<string, unknown> | undefined>(task.metadata);
      expectType<string[] | undefined>(task.tags);
    });

    it('should support async functions', () => {
      const asyncTask: BenchmarkTask = {
        fn: async () => {
          await Promise.resolve();
        },
      };

      expectType<(...args: any[]) => unknown>(asyncTask.fn);
    });

    it('should support configuration overrides', () => {
      const taskWithConfig: BenchmarkTask = {
        config: {
          iterations: 1000,
          time: 5000,
        },
        fn: () => {},
        metadata: {
          author: 'test',
          description: 'Test task',
        },
        tags: ['fast', 'unit'],
      };

      expectType<Partial<ModestBenchConfig> | undefined>(taskWithConfig.config);
      expectType<Record<string, unknown> | undefined>(taskWithConfig.metadata);
      expectType<string[] | undefined>(taskWithConfig.tags);
    });
  });
});
