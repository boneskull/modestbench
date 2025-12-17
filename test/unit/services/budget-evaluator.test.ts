import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type {
  BaselineSummaryData,
  Budget,
  ResolvedBudgets,
  TaskId,
  TaskResult,
} from '../../../src/types/core.js';

import { BudgetEvaluator } from '../../../src/services/budget-evaluator.js';
import { createTaskId } from '../../../src/utils/identifiers.js';

/**
 * Helper to wrap flat budgets into ResolvedBudgets format for testing
 */
const toResolvedBudgets = (
  flatBudgets: Record<string, Budget>,
): ResolvedBudgets => ({
  exact: flatBudgets,
  patterns: [],
});

describe('BudgetEvaluator', () => {
  const evaluator = new BudgetEvaluator();

  describe('evaluateRun', () => {
    it('should return empty summary when no budgets configured', () => {
      const budgets = toResolvedBudgets({});
      const taskResults = new Map<TaskId, TaskResult>();

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary, 'to satisfy', {
        failed: 0,
        passed: 0,
        results: [],
        total: 0,
      });
    });

    it('should evaluate absolute maxTime budget', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/fastTask': {
          absolute: {
            maxTime: 10_000_000, // 10ms
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/fastTask'),
          {
            mean: 5_000_000, // 5ms - under budget
            opsPerSecond: 200000,
            p99: 6_000_000,
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary, 'to satisfy', {
        failed: 0,
        passed: 1,
        total: 1,
      });
      expect(summary.results[0], 'to satisfy', {
        passed: true,
        taskId: 'test.bench.js/default/fastTask',
        violations: [],
      });
    });

    it('should detect maxTime budget violation', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/slowTask': {
          absolute: {
            maxTime: 10_000_000, // 10ms
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/slowTask'),
          {
            mean: 15_000_000, // 15ms - over budget
            opsPerSecond: 66666,
            p99: 16_000_000,
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary, 'to satisfy', {
        failed: 1,
        passed: 0,
        total: 1,
      });
      expect(summary.results[0], 'to satisfy', {
        passed: false,
        taskId: 'test.bench.js/default/slowTask',
      });
      expect(summary.results[0]!.violations.length, 'to equal', 1);
      expect(summary.results[0]!.violations[0], 'to satisfy', {
        actual: 15_000_000,
        threshold: 10_000_000,
        type: 'maxTime',
      });
    });

    it('should evaluate absolute minOpsPerSec budget', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          absolute: {
            minOpsPerSec: 100000,
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 8_000_000,
            opsPerSecond: 125000, // Above minimum
            p99: 9_000_000,
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary.results[0], 'to satisfy', {
        passed: true,
        violations: [],
      });
    });

    it('should detect minOpsPerSec budget violation', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          absolute: {
            minOpsPerSec: 100000,
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 15_000_000,
            opsPerSecond: 66666, // Below minimum
            p99: 16_000_000,
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary.results[0], 'to satisfy', {
        passed: false,
      });
      expect(summary.results[0]!.violations[0], 'to satisfy', {
        actual: 66666,
        threshold: 100000,
        type: 'minOpsPerSec',
      });
    });

    it('should evaluate absolute maxP99 budget', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          absolute: {
            maxP99: 20_000_000, // 20ms
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 10_000_000,
            opsPerSecond: 100000,
            p99: 15_000_000, // Under budget
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary.results[0], 'to satisfy', {
        passed: true,
        violations: [],
      });
    });

    it('should detect maxP99 budget violation', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          absolute: {
            maxP99: 20_000_000,
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 10_000_000,
            opsPerSecond: 100000,
            p99: 25_000_000, // Over budget
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary.results[0]!.violations[0], 'to satisfy', {
        actual: 25_000_000,
        threshold: 20_000_000,
        type: 'maxP99',
      });
    });

    it('should evaluate relative maxRegression budget', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          relative: {
            maxRegression: 0.1, // 10%
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 11_000_000, // 10% slower than baseline
            opsPerSecond: 90909,
            p99: 12_000_000,
          } as TaskResult,
        ],
      ]);

      const baselineData = new Map<TaskId, BaselineSummaryData>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 10_000_000,
            opsPerSecond: 100000,
            p99: 11_000_000,
          },
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults, baselineData);

      expect(summary.results[0], 'to satisfy', {
        passed: true,
        violations: [],
      });
    });

    it('should detect maxRegression budget violation', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          relative: {
            maxRegression: 0.1, // 10%
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 15_000_000, // 50% slower than baseline
            opsPerSecond: 66666,
            p99: 16_000_000,
          } as TaskResult,
        ],
      ]);

      const baselineData = new Map<TaskId, BaselineSummaryData>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 10_000_000,
            opsPerSecond: 100000,
            p99: 11_000_000,
          },
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults, baselineData);

      expect(summary.results[0], 'to satisfy', {
        passed: false,
      });
      expect(summary.results[0]!.violations[0], 'to satisfy', {
        threshold: 0.1,
        type: 'maxRegression',
      });
    });

    it('should evaluate combined absolute and relative budgets', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          absolute: {
            maxTime: 15_000_000,
          },
          relative: {
            maxRegression: 0.2,
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 12_000_000, // Under absolute, 20% regression
            opsPerSecond: 83333,
            p99: 13_000_000,
          } as TaskResult,
        ],
      ]);

      const baselineData = new Map<TaskId, BaselineSummaryData>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 10_000_000,
            opsPerSecond: 100000,
            p99: 11_000_000,
          },
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults, baselineData);

      expect(summary.results[0], 'to satisfy', {
        passed: true,
        violations: [],
      });
    });

    it('should fail if any budget threshold is exceeded', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          absolute: {
            maxTime: 15_000_000, // Pass
            minOpsPerSec: 100000, // Fail
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 12_000_000,
            opsPerSecond: 83333, // Below minimum
            p99: 13_000_000,
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary.results[0], 'to satisfy', {
        passed: false,
      });
      expect(summary.results[0]!.violations.length, 'to equal', 1);
    });

    it('should skip tasks without matching budgets', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task1': {
          absolute: { maxTime: 10_000_000 },
        },
        // task2 has a budget but no result
        'test.bench.js/default/task2': {
          absolute: { maxTime: 10_000_000 },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task1'),
          {
            mean: 5_000_000,
            opsPerSecond: 200000,
            p99: 6_000_000,
          } as TaskResult,
        ],
        // task3 has a result but no budget
        [
          createTaskId('test.bench.js/default/task3'),
          {
            mean: 5_000_000,
            opsPerSecond: 200000,
            p99: 6_000_000,
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      // Only task1 has both a budget and result
      expect(summary.total, 'to equal', 1);
      expect(summary.results.length, 'to equal', 1);
      expect(
        summary.results[0]!.taskId,
        'to equal',
        'test.bench.js/default/task1',
      );
    });

    it('should skip relative budgets when baseline data is missing', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          relative: {
            maxRegression: 0.1,
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 15_000_000,
            opsPerSecond: 66666,
            p99: 16_000_000,
          } as TaskResult,
        ],
      ]);

      // No baseline data provided
      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(summary.total, 'to equal', 0);
      expect(summary.results.length, 'to equal', 0);
    });

    it('should include baseline values in result when evaluating relative budgets', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          relative: {
            maxRegression: 0.1,
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 11_000_000,
            opsPerSecond: 90909,
            p99: 12_000_000,
          } as TaskResult,
        ],
      ]);

      const baselineData = new Map<TaskId, BaselineSummaryData>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 10_000_000,
            opsPerSecond: 100000,
            p99: 11_000_000,
          },
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults, baselineData);

      expect(summary.results[0]!.baseline, 'to satisfy', {
        mean: 10_000_000,
        opsPerSecond: 100000,
        p99: 11_000_000,
      });
    });

    it('should generate descriptive violation messages', () => {
      const budgets = toResolvedBudgets({
        'test.bench.js/default/task': {
          absolute: {
            maxTime: 10_000_000,
          },
        },
      });

      const taskResults = new Map<TaskId, TaskResult>([
        [
          createTaskId('test.bench.js/default/task'),
          {
            mean: 15_000_000,
            opsPerSecond: 66666,
            p99: 16_000_000,
          } as TaskResult,
        ],
      ]);

      const summary = evaluator.evaluateRun(budgets, taskResults);

      expect(
        summary.results[0]!.violations[0]!.message,
        'to match',
        /exceeded/i,
      );
    });
  });
});
