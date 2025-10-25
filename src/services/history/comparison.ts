/**
 * Benchmark Comparison Service
 *
 * Handles comparison logic between two benchmark runs, calculating performance
 * differences and categorizing tasks.
 */

import type { BenchmarkRun } from '../../types/index.js';
import type { CompareResult, TaskComparison } from './models.js';

/**
 * Service for comparing benchmark runs
 */
export class ComparisonService {
  /**
   * Compare two benchmark runs and produce detailed comparison result
   */
  compareRuns(run1: BenchmarkRun, run2: BenchmarkRun): CompareResult {
    // Build task maps for comparison
    const tasksMap1 = new Map<string, TaskComparison>();
    const tasksMap2 = new Map<string, TaskComparison>();

    // Extract tasks from run1
    for (const file of run1.files) {
      for (const suite of file.suites) {
        for (const task of suite.tasks) {
          if (!task.error) {
            const key = `${file.filePath}::${suite.name}::${task.name}`;
            tasksMap1.set(key, {
              file: file.filePath,
              inBoth: false,
              percentChange: 0,
              run1: {
                cv: task.cv,
                iterations: task.iterations,
                max: task.max,
                mean: task.mean,
                min: task.min,
              },
              suite: suite.name,
              task: task.name,
            });
          }
        }
      }
    }

    // Extract tasks from run2 and merge
    for (const file of run2.files) {
      for (const suite of file.suites) {
        for (const task of suite.tasks) {
          if (!task.error) {
            const key = `${file.filePath}::${suite.name}::${task.name}`;
            const existing = tasksMap1.get(key);

            if (existing && existing.run1) {
              // Task exists in both runs - calculate comparison
              const percentChange =
                ((task.mean - existing.run1.mean) / existing.run1.mean) * 100;

              tasksMap1.set(key, {
                ...existing,
                inBoth: true,
                percentChange,
                run2: {
                  cv: task.cv,
                  iterations: task.iterations,
                  max: task.max,
                  mean: task.mean,
                  min: task.min,
                },
              });
            } else {
              // Task only in run2
              tasksMap2.set(key, {
                file: file.filePath,
                inBoth: false,
                percentChange: 0,
                run2: {
                  cv: task.cv,
                  iterations: task.iterations,
                  max: task.max,
                  mean: task.mean,
                  min: task.min,
                },
                suite: suite.name,
                task: task.name,
              });
            }
          }
        }
      }
    }

    // Separate tasks into categories
    const tasksInBoth: TaskComparison[] = [];
    const tasksOnlyIn1: TaskComparison[] = [];
    const tasksOnlyIn2: TaskComparison[] = [];

    for (const task of tasksMap1.values()) {
      if (task.inBoth) {
        tasksInBoth.push(task);
      } else {
        tasksOnlyIn1.push(task);
      }
    }

    for (const task of tasksMap2.values()) {
      tasksOnlyIn2.push(task);
    }

    return {
      run1: {
        endTime: run1.endTime,
        id: run1.id,
        startTime: run1.startTime,
        summary: run1.summary,
      },
      run2: {
        endTime: run2.endTime,
        id: run2.id,
        startTime: run2.startTime,
        summary: run2.summary,
      },
      tasksInBoth,
      tasksOnlyInRun1: tasksOnlyIn1,
      tasksOnlyInRun2: tasksOnlyIn2,
    };
  }
}
