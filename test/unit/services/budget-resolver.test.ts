import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { Budget, ResolvedBudgets } from '../../../src/types/core.js';

import {
  calculateSpecificity,
  createBudgetPattern,
  isGlobPattern,
  matchesFile,
  matchesSuiteOrTask,
  mergeBudgets,
  parseTaskId,
  resolveBudget,
} from '../../../src/services/budget-resolver.js';
import { createTaskId } from '../../../src/utils/identifiers.js';

describe('BudgetResolver', () => {
  describe('isGlobPattern', () => {
    it('should detect asterisk glob', () => {
      expect(isGlobPattern('*.bench.js'), 'to be true');
      expect(isGlobPattern('**/*.bench.js'), 'to be true');
    });

    it('should detect question mark glob', () => {
      expect(isGlobPattern('test?.bench.js'), 'to be true');
    });

    it('should detect bracket glob', () => {
      expect(isGlobPattern('[abc].bench.js'), 'to be true');
    });

    it('should not detect plain strings', () => {
      expect(isGlobPattern('test.bench.js'), 'to be false');
      expect(isGlobPattern('path/to/file.js'), 'to be false');
    });
  });

  describe('matchesFile', () => {
    it('should match exact file paths', () => {
      expect(matchesFile('test.bench.js', 'test.bench.js'), 'to be true');
      expect(
        matchesFile('api/users.bench.js', 'api/users.bench.js'),
        'to be true',
      );
    });

    it('should not match different exact paths', () => {
      expect(matchesFile('test.bench.js', 'other.bench.js'), 'to be false');
    });

    it('should match with simple glob', () => {
      expect(matchesFile('*.bench.js', 'test.bench.js'), 'to be true');
      expect(matchesFile('*.bench.js', 'api.bench.js'), 'to be true');
    });

    it('should match with double star glob', () => {
      expect(matchesFile('**/*.bench.js', 'test.bench.js'), 'to be true');
      expect(
        matchesFile('**/*.bench.js', 'nested/deep/test.bench.js'),
        'to be true',
      );
    });

    it('should match with path prefix glob', () => {
      expect(
        matchesFile('api/**/*.bench.js', 'api/users.bench.js'),
        'to be true',
      );
      expect(
        matchesFile('api/**/*.bench.js', 'api/v2/users.bench.js'),
        'to be true',
      );
      expect(
        matchesFile('api/**/*.bench.js', 'db/users.bench.js'),
        'to be false',
      );
    });

    it('should match with generic glob', () => {
      expect(matchesFile('**/*', 'anything.js'), 'to be true');
      expect(matchesFile('**/*', 'deep/nested/file.ts'), 'to be true');
    });
  });

  describe('matchesSuiteOrTask', () => {
    it('should match exact names', () => {
      expect(matchesSuiteOrTask('User Routes', 'User Routes'), 'to be true');
      expect(matchesSuiteOrTask('getUser', 'getUser'), 'to be true');
    });

    it('should not match different names', () => {
      expect(matchesSuiteOrTask('User Routes', 'API Routes'), 'to be false');
    });

    it('should match wildcard to any value', () => {
      expect(matchesSuiteOrTask('*', 'User Routes'), 'to be true');
      expect(matchesSuiteOrTask('*', 'anything'), 'to be true');
    });
  });

  describe('calculateSpecificity', () => {
    it('should score 0 for fully generic pattern', () => {
      const score = calculateSpecificity({
        filePattern: '**/*',
        suitePattern: '*',
        taskPattern: '*',
      });
      expect(score, 'to equal', 0);
    });

    it('should score 1 for glob file with wildcard suite/task', () => {
      const score = calculateSpecificity({
        filePattern: '**/*.bench.js',
        suitePattern: '*',
        taskPattern: '*',
      });
      expect(score, 'to equal', 1);
    });

    it('should score 2 for exact file with wildcard suite/task', () => {
      const score = calculateSpecificity({
        filePattern: 'test.bench.js',
        suitePattern: '*',
        taskPattern: '*',
      });
      expect(score, 'to equal', 2);
    });

    it('should score 2 for glob file with exact suite', () => {
      const score = calculateSpecificity({
        filePattern: '**/*.bench.js',
        suitePattern: 'User Routes',
        taskPattern: '*',
      });
      expect(score, 'to equal', 2);
    });

    it('should score 3 for exact file with exact suite', () => {
      const score = calculateSpecificity({
        filePattern: 'test.bench.js',
        suitePattern: 'User Routes',
        taskPattern: '*',
      });
      expect(score, 'to equal', 3);
    });

    it('should score 4 for fully exact pattern', () => {
      const score = calculateSpecificity({
        filePattern: 'test.bench.js',
        suitePattern: 'User Routes',
        taskPattern: 'getUser',
      });
      expect(score, 'to equal', 4);
    });
  });

  describe('parseTaskId', () => {
    it('should parse simple TaskId', () => {
      const taskId = createTaskId('test.bench.js/default/myTask');
      const { file, suite, task } = parseTaskId(taskId);
      expect(file, 'to equal', 'test.bench.js');
      expect(suite, 'to equal', 'default');
      expect(task, 'to equal', 'myTask');
    });

    it('should parse TaskId with nested file path', () => {
      const taskId = createTaskId('api/users.bench.js/User Routes/getUser');
      const { file, suite, task } = parseTaskId(taskId);
      expect(file, 'to equal', 'api/users.bench.js');
      expect(suite, 'to equal', 'User Routes');
      expect(task, 'to equal', 'getUser');
    });

    it('should parse TaskId with deeply nested file path', () => {
      const taskId = createTaskId(
        'benchmarks/api/v2/users.bench.js/HTTP Routes/createUser',
      );
      const { file, suite, task } = parseTaskId(taskId);
      expect(file, 'to equal', 'benchmarks/api/v2/users.bench.js');
      expect(suite, 'to equal', 'HTTP Routes');
      expect(task, 'to equal', 'createUser');
    });
  });

  describe('mergeBudgets', () => {
    it('should merge absolute budgets', () => {
      const base: Budget = {
        absolute: { maxTime: 100 },
      };
      const override: Budget = {
        absolute: { minOpsPerSec: 1000 },
      };

      const merged = mergeBudgets(base, override);

      expect(merged.absolute?.maxTime, 'to equal', 100);
      expect(merged.absolute?.minOpsPerSec, 'to equal', 1000);
    });

    it('should override conflicting absolute values', () => {
      const base: Budget = {
        absolute: { maxTime: 100 },
      };
      const override: Budget = {
        absolute: { maxTime: 50 },
      };

      const merged = mergeBudgets(base, override);

      expect(merged.absolute?.maxTime, 'to equal', 50);
    });

    it('should merge relative budgets', () => {
      const base: Budget = {
        relative: { maxRegression: 0.1 },
      };
      const override: Budget = {
        relative: { baseline: 'main' },
      };

      const merged = mergeBudgets(base, override);

      expect(merged.relative?.maxRegression, 'to equal', 0.1);
      expect(merged.relative?.baseline, 'to equal', 'main');
    });

    it('should merge both absolute and relative', () => {
      const base: Budget = {
        absolute: { maxTime: 100 },
      };
      const override: Budget = {
        relative: { maxRegression: 0.1 },
      };

      const merged = mergeBudgets(base, override);

      expect(merged.absolute?.maxTime, 'to equal', 100);
      expect(merged.relative?.maxRegression, 'to equal', 0.1);
    });
  });

  describe('createBudgetPattern', () => {
    it('should create pattern with calculated specificity', () => {
      const pattern = createBudgetPattern('**/*.bench.js', '*', '*', {
        absolute: { maxTime: 100 },
      });

      expect(pattern.filePattern, 'to equal', '**/*.bench.js');
      expect(pattern.suitePattern, 'to equal', '*');
      expect(pattern.taskPattern, 'to equal', '*');
      expect(pattern.specificity, 'to equal', 1);
    });
  });

  describe('resolveBudget', () => {
    it('should return undefined when no budgets match', () => {
      const budgets: ResolvedBudgets = {
        exact: {},
        patterns: [],
      };

      const taskId = createTaskId('test.bench.js/default/myTask');
      const result = resolveBudget(taskId, budgets);

      expect(result, 'to be undefined');
    });

    it('should return exact match when available', () => {
      const budgets: ResolvedBudgets = {
        exact: {
          'test.bench.js/default/myTask': {
            absolute: { maxTime: 100 },
          },
        },
        patterns: [],
      };

      const taskId = createTaskId('test.bench.js/default/myTask');
      const result = resolveBudget(taskId, budgets);

      expect(result?.absolute?.maxTime, 'to equal', 100);
    });

    it('should match pattern when no exact match', () => {
      const budgets: ResolvedBudgets = {
        exact: {},
        patterns: [
          createBudgetPattern('**/*', '*', '*', {
            absolute: { maxTime: 1000 },
          }),
        ],
      };

      const taskId = createTaskId('test.bench.js/default/myTask');
      const result = resolveBudget(taskId, budgets);

      expect(result?.absolute?.maxTime, 'to equal', 1000);
    });

    it('should prefer more specific patterns', () => {
      const budgets: ResolvedBudgets = {
        exact: {},
        patterns: [
          createBudgetPattern('**/*', '*', '*', {
            absolute: { maxTime: 1000 },
          }),
          createBudgetPattern('**/*.bench.js', '*', '*', {
            absolute: { maxTime: 500 },
          }),
          createBudgetPattern('test.bench.js', '*', '*', {
            absolute: { maxTime: 100 },
          }),
        ],
      };

      const taskId = createTaskId('test.bench.js/default/myTask');
      const result = resolveBudget(taskId, budgets);

      // Most specific pattern (exact file) should win
      expect(result?.absolute?.maxTime, 'to equal', 100);
    });

    it('should merge budgets from multiple matching patterns', () => {
      const budgets: ResolvedBudgets = {
        exact: {},
        patterns: [
          createBudgetPattern('**/*', '*', '*', {
            relative: { maxRegression: 0.15 },
          }),
          createBudgetPattern('test.bench.js', '*', '*', {
            absolute: { maxTime: 100 },
          }),
        ],
      };

      const taskId = createTaskId('test.bench.js/default/myTask');
      const result = resolveBudget(taskId, budgets);

      // Should have both from merge
      expect(result?.absolute?.maxTime, 'to equal', 100);
      expect(result?.relative?.maxRegression, 'to equal', 0.15);
    });

    it('should merge exact match with patterns', () => {
      const budgets: ResolvedBudgets = {
        exact: {
          'test.bench.js/default/myTask': {
            absolute: { maxTime: 50 },
          },
        },
        patterns: [
          createBudgetPattern('**/*', '*', '*', {
            relative: { maxRegression: 0.1 },
          }),
        ],
      };

      const taskId = createTaskId('test.bench.js/default/myTask');
      const result = resolveBudget(taskId, budgets);

      // Should have exact match's maxTime and pattern's maxRegression
      expect(result?.absolute?.maxTime, 'to equal', 50);
      expect(result?.relative?.maxRegression, 'to equal', 0.1);
    });

    it('should let exact match override pattern values', () => {
      const budgets: ResolvedBudgets = {
        exact: {
          'test.bench.js/default/myTask': {
            absolute: { maxTime: 50 },
          },
        },
        patterns: [
          createBudgetPattern('**/*', '*', '*', {
            absolute: { maxTime: 1000 },
          }),
        ],
      };

      const taskId = createTaskId('test.bench.js/default/myTask');
      const result = resolveBudget(taskId, budgets);

      // Exact match should win
      expect(result?.absolute?.maxTime, 'to equal', 50);
    });

    it('should match suite-specific patterns', () => {
      const budgets: ResolvedBudgets = {
        exact: {},
        patterns: [
          createBudgetPattern('**/*', 'User Routes', '*', {
            absolute: { maxTime: 100 },
          }),
        ],
      };

      const taskId = createTaskId('test.bench.js/User Routes/getUser');
      const result = resolveBudget(taskId, budgets);

      expect(result?.absolute?.maxTime, 'to equal', 100);

      // Different suite should not match
      const otherTaskId = createTaskId('test.bench.js/API Routes/getUser');
      const otherResult = resolveBudget(otherTaskId, budgets);
      expect(otherResult, 'to be undefined');
    });

    it('should match task-specific patterns', () => {
      const budgets: ResolvedBudgets = {
        exact: {},
        patterns: [
          createBudgetPattern('**/*', '*', 'getUser', {
            absolute: { maxTime: 50 },
          }),
        ],
      };

      const taskId = createTaskId('test.bench.js/User Routes/getUser');
      const result = resolveBudget(taskId, budgets);

      expect(result?.absolute?.maxTime, 'to equal', 50);

      // Different task should not match
      const otherTaskId = createTaskId('test.bench.js/User Routes/createUser');
      const otherResult = resolveBudget(otherTaskId, budgets);
      expect(otherResult, 'to be undefined');
    });
  });
});
