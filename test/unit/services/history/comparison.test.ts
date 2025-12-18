import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { BenchmarkRun } from '../../../../src/types/index.js';

import { ComparisonService } from '../../../../src/services/history/comparison.js';
import { createRunId } from '../../../../src/utils/identifiers.js';

/**
 * Unit tests for ComparisonService
 *
 * Tests comparison logic between two benchmark runs, including percent change
 * calculation, task categorization, and edge cases.
 */

// Helper to create a minimal benchmark run for testing
const createMockRun = (
  id: string,
  files: Array<{
    filePath: string;
    suites: Array<{
      name: string;
      tasks: Array<{
        cv: number;
        error?: string;
        iterations: number;
        max: number;
        mean: number;
        min: number;
        name: string;
      }>;
    }>;
  }>,
): BenchmarkRun => ({
  config: {} as any,
  duration: 1000,
  endTime: new Date('2024-01-01T12:01:00Z'),
  environment: {
    arch: 'x64',
    availableMemory: 1_000_000,
    cpu: { cores: 4, model: 'Test CPU', speed: 2000 },
    env: {},
    hostname: 'test',
    memory: { free: 500_000, total: 1_000_000, used: 500_000 },
    nodeVersion: 'v20.0.0',
    platform: 'linux',
  },
  files: files as any,
  id: createRunId(id),
  startTime: new Date('2024-01-01T12:00:00Z'),
  summary: {
    failedTasks: 0,
    fastest: null,
    overallMean: 0,
    passedTasks: files.reduce(
      (acc, f) =>
        acc +
        f.suites.reduce(
          (suiteAcc, s) => suiteAcc + s.tasks.filter((t) => !t.error).length,
          0,
        ),
      0,
    ),
    slowest: null,
    totalFiles: files.length,
    totalOperations: 0,
    totalSuites: files.reduce((acc, f) => acc + f.suites.length, 0),
    totalTasks: files.reduce(
      (acc, f) =>
        acc + f.suites.reduce((suiteAcc, s) => suiteAcc + s.tasks.length, 0),
      0,
    ),
  },
});

describe('ComparisonService', () => {
  describe('compareRuns()', () => {
    it('should compare two runs with matching tasks', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 115,
                  mean: 110,
                  min: 105,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);

      expect(result.tasksInBoth.length, 'to equal', 1);
      expect(result.tasksOnlyInRun1.length, 'to equal', 0);
      expect(result.tasksOnlyInRun2.length, 'to equal', 0);

      const comparison = result.tasksInBoth[0];
      expect(comparison?.task, 'to equal', 'task-1');
      expect(comparison?.suite, 'to equal', 'Suite A');
      expect(comparison?.file, 'to equal', '/test/bench.js');
      expect(comparison?.inBoth, 'to equal', true);
      expect(comparison?.run1?.mean, 'to equal', 100);
      expect(comparison?.run2?.mean, 'to equal', 110);
    });

    it('should calculate percent change correctly', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 155,
                  mean: 150,
                  min: 145,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);
      const comparison = result.tasksInBoth[0];

      // Change from 100 to 150 = ((150 - 100) / 100) * 100 = 50%
      expect(comparison?.percentChange, 'to equal', 50);
    });

    it('should categorize tasks only in run1', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-1',
                },
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-2',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 115,
                  mean: 110,
                  min: 105,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);

      expect(result.tasksInBoth.length, 'to equal', 1);
      expect(result.tasksOnlyInRun1.length, 'to equal', 1);
      expect(result.tasksOnlyInRun2.length, 'to equal', 0);

      const onlyInRun1 = result.tasksOnlyInRun1[0];
      expect(onlyInRun1?.task, 'to equal', 'task-2');
      expect(onlyInRun1?.inBoth, 'to equal', false);
      expect(onlyInRun1?.run1, 'not to be undefined');
      expect(onlyInRun1?.run2, 'to be undefined');
    });

    it('should categorize tasks only in run2', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 115,
                  mean: 110,
                  min: 105,
                  name: 'task-1',
                },
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 115,
                  mean: 110,
                  min: 105,
                  name: 'task-2',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);

      expect(result.tasksInBoth.length, 'to equal', 1);
      expect(result.tasksOnlyInRun1.length, 'to equal', 0);
      expect(result.tasksOnlyInRun2.length, 'to equal', 1);

      const onlyInRun2 = result.tasksOnlyInRun2[0];
      expect(onlyInRun2?.task, 'to equal', 'task-2');
      expect(onlyInRun2?.inBoth, 'to equal', false);
      expect(onlyInRun2?.run1, 'to be undefined');
      expect(onlyInRun2?.run2, 'not to be undefined');
    });

    it('should handle tasks with errors (should be excluded)', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  error: 'Task failed',
                  iterations: 0,
                  max: 0,
                  mean: 0,
                  min: 0,
                  name: 'task-error',
                },
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-ok',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  error: 'Task failed',
                  iterations: 0,
                  max: 0,
                  mean: 0,
                  min: 0,
                  name: 'task-error',
                },
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 115,
                  mean: 110,
                  min: 105,
                  name: 'task-ok',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);

      // Only the non-error task should be compared
      expect(result.tasksInBoth.length, 'to equal', 1);
      expect(result.tasksInBoth[0]?.task, 'to equal', 'task-ok');
    });

    it('should handle empty runs', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', []);
      const run2 = createMockRun('run-2', []);

      const result = service.compareRuns(run1, run2);

      expect(result.tasksInBoth.length, 'to equal', 0);
      expect(result.tasksOnlyInRun1.length, 'to equal', 0);
      expect(result.tasksOnlyInRun2.length, 'to equal', 0);
    });

    it('should handle multiple files and suites', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench1.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
        {
          filePath: '/test/bench2.js',
          suites: [
            {
              name: 'Suite B',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 205,
                  mean: 200,
                  min: 195,
                  name: 'task-2',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench1.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 115,
                  mean: 110,
                  min: 105,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
        {
          filePath: '/test/bench2.js',
          suites: [
            {
              name: 'Suite B',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 220,
                  mean: 210,
                  min: 200,
                  name: 'task-2',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);

      expect(result.tasksInBoth.length, 'to equal', 2);

      // Check task key generation works correctly for different files/suites
      const task1 = result.tasksInBoth.find((t) => t.task === 'task-1');
      const task2 = result.tasksInBoth.find((t) => t.task === 'task-2');

      expect(task1?.file, 'to equal', '/test/bench1.js');
      expect(task1?.suite, 'to equal', 'Suite A');
      expect(task2?.file, 'to equal', '/test/bench2.js');
      expect(task2?.suite, 'to equal', 'Suite B');
    });

    it('should include run metadata in result', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', []);
      const run2 = createMockRun('run-2', []);

      const result = service.compareRuns(run1, run2);

      expect(result.run1.id, 'to equal', 'run-1');
      expect(result.run2.id, 'to equal', 'run-2');
      expect(result.run1.startTime, 'to be a', Date);
      expect(result.run1.endTime, 'to be a', Date);
      expect(result.run1.summary, 'to be an object');
    });

    it('should calculate negative percent change correctly', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 205,
                  mean: 200,
                  min: 195,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);
      const comparison = result.tasksInBoth[0];

      // Change from 200 to 100 = ((100 - 200) / 200) * 100 = -50%
      expect(comparison?.percentChange, 'to equal', -50);
    });

    it('should store all task metrics in comparison result', () => {
      const service = new ComparisonService();

      const run1 = createMockRun('run-1', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.05,
                  iterations: 100,
                  max: 105,
                  mean: 100,
                  min: 95,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const run2 = createMockRun('run-2', [
        {
          filePath: '/test/bench.js',
          suites: [
            {
              name: 'Suite A',
              tasks: [
                {
                  cv: 0.06,
                  iterations: 120,
                  max: 115,
                  mean: 110,
                  min: 105,
                  name: 'task-1',
                },
              ],
            },
          ],
        },
      ]);

      const result = service.compareRuns(run1, run2);
      const comparison = result.tasksInBoth[0];

      // Check all metrics are stored
      expect(comparison?.run1?.mean, 'to equal', 100);
      expect(comparison?.run1?.min, 'to equal', 95);
      expect(comparison?.run1?.max, 'to equal', 105);
      expect(comparison?.run1?.cv, 'to equal', 0.05);
      expect(comparison?.run1?.iterations, 'to equal', 100);

      expect(comparison?.run2?.mean, 'to equal', 110);
      expect(comparison?.run2?.min, 'to equal', 105);
      expect(comparison?.run2?.max, 'to equal', 115);
      expect(comparison?.run2?.cv, 'to equal', 0.06);
      expect(comparison?.run2?.iterations, 'to equal', 120);
    });
  });
});
