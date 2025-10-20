import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { TaskResult } from '../../src/types/index.js';

import { JsonReporter } from '../../src/reporters/json.js';

// Helper to create a mock task result matching the actual TaskResult interface
function createMockTaskResult(overrides: Partial<TaskResult> = {}): TaskResult {
  return {
    error: undefined,
    iterations: 100,
    marginOfError: 5,
    max: 1000,
    mean: 750,
    metadata: {},
    min: 500,
    name: 'test-task',
    opsPerSecond: 1333333.33,
    p95: 950,
    p99: 980,
    stdDev: 50,
    tags: [],
    variance: 2500,
    ...overrides,
  };
}

describe('JsonReporter', () => {
  describe('statistics calculation', () => {
    it('should calculate average ops/sec across multiple tasks', () => {
      const reporter = new JsonReporter();

      // Simulate tracking multiple tasks
      const task1 = createMockTaskResult({
        iterations: 100,
        marginOfError: 5,
        max: 1000,
        mean: 750,
        min: 500,
        opsPerSecond: 1000,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      const task2 = createMockTaskResult({
        iterations: 100,
        marginOfError: 5,
        max: 2000,
        mean: 1500,
        min: 1000,
        opsPerSecond: 2000,
        p95: 1900,
        p99: 1980,

        stdDev: 100,
        variance: 10000,
      });

      const task3 = createMockTaskResult({
        iterations: 100,
        marginOfError: 5,
        max: 3000,
        mean: 2250,
        min: 1500,
        opsPerSecond: 3000,
        p95: 2850,
        p99: 2970,

        stdDev: 150,
        variance: 22500,
      });

      // Call onTaskResult for each task
      reporter.onTaskResult(task1);
      reporter.onTaskResult(task2);
      reporter.onTaskResult(task3);

      // Access internal statistics
      const stats = (reporter as any).statistics;

      expect(stats.taskCount, 'to equal', 3);
      expect(stats.totalOpsPerSecond, 'to equal', 6000);

      // Average should be 6000 / 3 = 2000
      const avgOps = stats.totalOpsPerSecond / stats.taskCount;
      expect(avgOps, 'to equal', 2000);
    });

    it('should identify fastest task by ops/sec', () => {
      const reporter = new JsonReporter();

      const slowTask = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 1000,
        mean: 750,
        min: 500,
        name: 'slow-task',
        opsPerSecond: 1000,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      const fastTask = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 100,
        mean: 75,
        min: 50,
        name: 'fast-task',
        opsPerSecond: 5000,
        p95: 95,
        p99: 98,

        stdDev: 5,
        variance: 25,
      });

      const mediumTask = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 500,
        mean: 375,
        min: 250,
        name: 'medium-task',
        opsPerSecond: 2000,
        p95: 475,
        p99: 490,

        stdDev: 25,
        variance: 625,
      });

      reporter.onTaskResult(slowTask);
      reporter.onTaskResult(fastTask);
      reporter.onTaskResult(mediumTask);

      const stats = (reporter as any).statistics;

      expect(stats.fastestTask, 'not to be undefined');
      expect(stats.fastestTask?.name, 'to equal', 'fast-task');
      expect(stats.fastestTask?.opsPerSecond, 'to equal', 5000);
    });

    it('should identify slowest task by mean time', () => {
      const reporter = new JsonReporter();

      const fastTask = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 100,
        mean: 75,
        min: 50,
        name: 'fast-task',
        opsPerSecond: 5000,
        p95: 95,
        p99: 98,

        stdDev: 5,
        variance: 25,
      });

      const slowTask = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 2000,
        mean: 1500,
        min: 1000,
        name: 'slow-task',
        opsPerSecond: 1000,
        p95: 1900,
        p99: 1980,

        stdDev: 100,
        variance: 10000,
      });

      const mediumTask = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 500,
        mean: 375,
        min: 250,
        name: 'medium-task',
        opsPerSecond: 2000,
        p95: 475,
        p99: 490,

        stdDev: 25,
        variance: 625,
      });

      reporter.onTaskResult(fastTask);
      reporter.onTaskResult(slowTask);
      reporter.onTaskResult(mediumTask);

      const stats = (reporter as any).statistics;

      expect(stats.slowestTask, 'not to be undefined');
      expect(stats.slowestTask?.name, 'to equal', 'slow-task');
      expect(stats.slowestTask?.mean, 'to equal', 1500);
    });

    it('should count total iterations', () => {
      const reporter = new JsonReporter();

      const task1 = createMockTaskResult({
        iterations: 100,
        marginOfError: 5,
        max: 1000,
        mean: 750,
        min: 500,
        opsPerSecond: 1000,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      const task2 = createMockTaskResult({
        iterations: 250,
        marginOfError: 5,
        max: 2000,
        mean: 1500,
        min: 1000,
        opsPerSecond: 2000,
        p95: 1900,
        p99: 1980,

        stdDev: 100,
        variance: 10000,
      });

      reporter.onTaskResult(task1);
      reporter.onTaskResult(task2);

      const stats = (reporter as any).statistics;

      expect(stats.totalIterations, 'to equal', 350); // 100 + 250
    });

    it('should handle empty tasks case (no tasks)', () => {
      const reporter = new JsonReporter();

      const stats = (reporter as any).statistics;

      expect(stats.taskCount, 'to equal', 0);
      expect(stats.totalOpsPerSecond, 'to equal', 0);
      expect(stats.totalIterations, 'to equal', 0);
      expect(stats.fastestTask, 'to be undefined');
      expect(stats.slowestTask, 'to be undefined');
    });

    it('should handle single task case', () => {
      const reporter = new JsonReporter();

      const task = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 1000,
        mean: 750,
        min: 500,
        name: 'only-task',
        opsPerSecond: 2500,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      reporter.onTaskResult(task);

      const stats = (reporter as any).statistics;

      expect(stats.taskCount, 'to equal', 1);
      expect(stats.fastestTask?.name, 'to equal', 'only-task');
      expect(stats.slowestTask?.name, 'to equal', 'only-task');
      expect(stats.totalIterations, 'to equal', 100);
      expect(stats.totalOpsPerSecond, 'to equal', 2500);
    });

    it('should update statistics incrementally as tasks complete', () => {
      const reporter = new JsonReporter();

      const task1 = createMockTaskResult({
        iterations: 100,
        marginOfError: 5,
        max: 1000,
        mean: 750,
        min: 500,
        opsPerSecond: 1000,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      reporter.onTaskResult(task1);
      let stats = (reporter as any).statistics;

      expect(stats.taskCount, 'to equal', 1);
      expect(stats.totalOpsPerSecond, 'to equal', 1000);

      const task2 = createMockTaskResult({
        iterations: 200,
        marginOfError: 5,
        max: 2000,
        mean: 1500,
        min: 1000,
        opsPerSecond: 3000,
        p95: 1900,
        p99: 1980,

        stdDev: 100,
        variance: 10000,
      });

      reporter.onTaskResult(task2);
      stats = (reporter as any).statistics;

      expect(stats.taskCount, 'to equal', 2);
      expect(stats.totalOpsPerSecond, 'to equal', 4000);
      expect(stats.totalIterations, 'to equal', 300);
    });

    it('should handle tasks with equal performance for fastest/slowest', () => {
      const reporter = new JsonReporter();

      const task1 = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 1000,
        mean: 750,
        min: 500,
        name: 'task-1',
        opsPerSecond: 2000,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      const task2 = createMockTaskResult({
        iterations: 100,

        marginOfError: 5,
        max: 1000,
        mean: 750,
        min: 500,
        name: 'task-2',
        opsPerSecond: 2000,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      reporter.onTaskResult(task1);
      reporter.onTaskResult(task2);

      const stats = (reporter as any).statistics;

      // Should have both fastest and slowest set (likely both pointing to first task)
      expect(stats.fastestTask, 'not to be undefined');
      expect(stats.slowestTask, 'not to be undefined');
    });

    it('should handle failed tasks in statistics', () => {
      const reporter = new JsonReporter();

      const passedTask = createMockTaskResult({
        iterations: 100,
        marginOfError: 5,

        max: 1000,
        mean: 750,
        min: 500,
        name: 'passed-task',
        opsPerSecond: 2000,
        p95: 950,
        p99: 980,

        stdDev: 50,
        variance: 2500,
      });

      const failedTask = createMockTaskResult({
        error: new Error('Task failed'),
        iterations: 0,
        marginOfError: 0,

        max: 0,
        mean: 0,
        min: 0,
        name: 'failed-task',
        opsPerSecond: 0,
        p95: 0,
        p99: 0,

        stdDev: 0,
        variance: 0,
      });

      reporter.onTaskResult(passedTask);
      reporter.onTaskResult(failedTask);

      const stats = (reporter as any).statistics;

      // Only successful tasks are counted in statistics
      expect(stats.taskCount, 'to equal', 1);

      // Failed task has 0 ops/sec, so only passed task contributes
      expect(stats.totalOpsPerSecond, 'to equal', 2000);
    });
  });
});
