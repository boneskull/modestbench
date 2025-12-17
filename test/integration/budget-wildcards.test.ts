/**
 * Integration tests for budget wildcard patterns
 *
 * These tests verify the end-to-end flow of budget wildcard configuration, from
 * parsing through to evaluation.
 */

import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { TaskId, TaskResult } from '../../src/types/core.js';

import { safeParsePartialConfig } from '../../src/config/schema.js';
import { BudgetEvaluator } from '../../src/services/budget-evaluator.js';
import { createTaskId } from '../../src/utils/identifiers.js';

describe('Budget Wildcards Integration', () => {
  describe('configuration transformation', () => {
    it('should transform wildcard config with both exact and pattern budgets', () => {
      const config = {
        budgets: {
          '**/*': {
            '*': {
              '*': {
                relative: { maxRegression: 0.15 },
              },
            },
          },
          'test.bench.js': {
            default: {
              fastTask: {
                absolute: { maxTime: 5_000_000 },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;

        // Should have one exact match
        expect(Object.keys(resolved.exact).length, 'to equal', 1);
        expect(
          resolved.exact['test.bench.js/default/fastTask'],
          'to be defined',
        );
        expect(
          resolved.exact['test.bench.js/default/fastTask']?.absolute?.maxTime,
          'to equal',
          5_000_000,
        );

        // Should have one pattern
        expect(resolved.patterns.length, 'to equal', 1);
        expect(resolved.patterns[0]!.filePattern, 'to equal', '**/*');
        expect(
          resolved.patterns[0]!.budget.relative?.maxRegression,
          'to equal',
          0.15,
        );
      }
    });
  });

  describe('pattern precedence in configuration', () => {
    it('should correctly order patterns by specificity', () => {
      const config = {
        budgets: {
          // Most generic (specificity 0)
          '**/*': {
            '*': {
              '*': { relative: { maxRegression: 0.2 } },
            },
          },
          // Glob with specificity (specificity 1)
          '**/*.bench.js': {
            '*': {
              '*': { absolute: { maxTime: 100_000_000 } },
            },
          },
          // Exact file with wildcard suite (specificity 2)
          'test.bench.js': {
            '*': {
              '*': { absolute: { maxTime: 50_000_000 } },
            },
            // Exact file + exact suite (specificity 3)
            Performance: {
              '*': { absolute: { maxTime: 10_000_000 } },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;

        // All are patterns (have wildcards in suite or task)
        expect(resolved.patterns.length, 'to be greater than', 0);

        // Verify sorted by specificity descending
        for (let i = 0; i < resolved.patterns.length - 1; i++) {
          expect(
            resolved.patterns[i]!.specificity,
            'to be greater than or equal to',
            resolved.patterns[i + 1]!.specificity,
          );
        }
      }
    });
  });

  describe('budget evaluation with wildcards', () => {
    it('should apply wildcard budgets to matching tasks', () => {
      const config = {
        budgets: {
          '**/*': {
            '*': {
              '*': {
                absolute: { maxTime: 100_000_000 }, // 100ms for all
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        const evaluator = new BudgetEvaluator();

        // Create some task results
        const taskResults = new Map<TaskId, TaskResult>([
          [
            createTaskId('api.bench.js/User Routes/getUser'),
            {
              mean: 50_000_000, // 50ms - under budget
              opsPerSecond: 20,
              p99: 60_000_000,
            } as TaskResult,
          ],
          [
            createTaskId('db.bench.js/Query/selectAll'),
            {
              mean: 150_000_000, // 150ms - over budget
              opsPerSecond: 6.67,
              p99: 180_000_000,
            } as TaskResult,
          ],
        ]);

        const summary = evaluator.evaluateRun(resolved, taskResults);

        // One should pass, one should fail
        expect(summary.total, 'to equal', 2);
        expect(summary.passed, 'to equal', 1);
        expect(summary.failed, 'to equal', 1);
      }
    });

    it('should merge budgets from multiple matching patterns', () => {
      const config = {
        budgets: {
          // Global: set max regression
          '**/*': {
            '*': {
              '*': {
                relative: { maxRegression: 0.15 },
              },
            },
          },
          // More specific: add absolute time constraint
          'api.bench.js': {
            '*': {
              '*': {
                absolute: { maxTime: 50_000_000 },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        const evaluator = new BudgetEvaluator();

        const taskResults = new Map<TaskId, TaskResult>([
          [
            createTaskId('api.bench.js/User Routes/getUser'),
            {
              mean: 100_000_000, // 100ms - over absolute but under regression
              opsPerSecond: 10,
              p99: 120_000_000,
            } as TaskResult,
          ],
        ]);

        // Note: Without baseline data, relative budgets are skipped
        // So only absolute budget (maxTime) should be evaluated
        const summary = evaluator.evaluateRun(resolved, taskResults);

        expect(summary.total, 'to equal', 1);
        expect(summary.failed, 'to equal', 1); // Should fail absolute budget

        // Verify violation is for maxTime
        const violation = summary.results[0]!.violations[0];
        expect(violation?.type, 'to equal', 'maxTime');
      }
    });

    it('should let exact match override pattern budgets', () => {
      const config = {
        budgets: {
          // Global: strict time limit
          '**/*': {
            '*': {
              '*': {
                absolute: { maxTime: 10_000_000 }, // 10ms
              },
            },
          },
          // Specific task: more lenient
          'slow.bench.js': {
            Performance: {
              heavyTask: {
                absolute: { maxTime: 100_000_000 }, // 100ms
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        const evaluator = new BudgetEvaluator();

        const taskResults = new Map<TaskId, TaskResult>([
          [
            createTaskId('slow.bench.js/Performance/heavyTask'),
            {
              mean: 50_000_000, // 50ms - over global, under specific
              opsPerSecond: 20,
              p99: 60_000_000,
            } as TaskResult,
          ],
        ]);

        const summary = evaluator.evaluateRun(resolved, taskResults);

        // Should pass because exact match (100ms) overrides global (10ms)
        expect(summary.total, 'to equal', 1);
        expect(summary.passed, 'to equal', 1);
      }
    });

    it('should match file patterns with minimatch glob syntax', () => {
      const config = {
        budgets: {
          '**/api/**/*.bench.js': {
            '*': {
              '*': {
                absolute: { maxTime: 50_000_000 },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        const evaluator = new BudgetEvaluator();

        const taskResults = new Map<TaskId, TaskResult>([
          // Should match
          [
            createTaskId('benchmarks/api/users.bench.js/Routes/getUser'),
            {
              mean: 100_000_000, // Over budget
              opsPerSecond: 10,
              p99: 120_000_000,
            } as TaskResult,
          ],
          // Should NOT match (not in api directory)
          [
            createTaskId('benchmarks/db/queries.bench.js/Queries/selectAll'),
            {
              mean: 100_000_000,
              opsPerSecond: 10,
              p99: 120_000_000,
            } as TaskResult,
          ],
        ]);

        const summary = evaluator.evaluateRun(resolved, taskResults);

        // Only the api benchmark should be evaluated
        expect(summary.total, 'to equal', 1);
        expect(summary.failed, 'to equal', 1);

        // Verify it's the api task
        expect(
          summary.results[0]!.taskId,
          'to equal',
          'benchmarks/api/users.bench.js/Routes/getUser',
        );
      }
    });
  });
});
