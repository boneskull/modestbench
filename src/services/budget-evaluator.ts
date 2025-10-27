import type {
  BaselineSummaryData,
  Budget,
  BudgetResult,
  BudgetSummary,
  BudgetViolation,
  TaskId,
  TaskResult,
} from '../types/core.js';

/**
 * Service for evaluating performance budgets
 *
 * @packageDocumentation
 */
export class BudgetEvaluator {
  /**
   * Format number with thousands separators
   */
  private static formatNumber(this: void, value: number): string {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
  }

  /**
   * Format decimal as percentage
   */
  private static formatPercentage(this: void, value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  /**
   * Format time in nanoseconds to human-readable string
   */
  private static formatTime(this: void, nanoseconds: number): string {
    if (nanoseconds < 1_000) {
      return `${nanoseconds.toFixed(0)}ns`;
    } else if (nanoseconds < 1_000_000) {
      return `${(nanoseconds / 1_000).toFixed(2)}μs`;
    } else if (nanoseconds < 1_000_000_000) {
      return `${(nanoseconds / 1_000_000).toFixed(2)}ms`;
    } else {
      return `${(nanoseconds / 1_000_000_000).toFixed(2)}s`;
    }
  }

  /**
   * Evaluate budgets for an entire benchmark run
   */
  evaluateRun(
    budgets: Record<string, Budget>,
    taskResults: Map<TaskId, TaskResult>,
    baselineData?: Map<TaskId, BaselineSummaryData>,
  ): BudgetSummary {
    const results: BudgetResult[] = [];

    for (const [taskId, budget] of Object.entries(budgets)) {
      const taskResult = taskResults.get(taskId as TaskId);

      // Skip if no result for this task
      if (!taskResult) {
        continue;
      }

      // Skip relative budgets if no baseline data
      if (budget.relative && !baselineData) {
        continue;
      }

      const budgetResult = this.evaluateTask(
        taskId as TaskId,
        budget,
        taskResult,
        baselineData?.get(taskId as TaskId),
      );

      results.push(budgetResult);
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    return {
      failed,
      passed,
      results,
      total: results.length,
    };
  }

  /**
   * Evaluate budgets for a single task
   */
  private evaluateTask(
    taskId: TaskId,
    budget: Budget,
    actual: TaskResult,
    baseline?: BaselineSummaryData,
  ): BudgetResult {
    const violations: BudgetViolation[] = [];

    // Evaluate absolute budgets
    if (budget.absolute) {
      if (budget.absolute.maxTime !== undefined) {
        if (actual.mean > budget.absolute.maxTime) {
          violations.push({
            actual: actual.mean,
            delta:
              (actual.mean - budget.absolute.maxTime) / budget.absolute.maxTime,
            message: `Mean execution time ${BudgetEvaluator.formatTime(actual.mean)} exceeded budget of ${BudgetEvaluator.formatTime(budget.absolute.maxTime)} by ${BudgetEvaluator.formatPercentage((actual.mean - budget.absolute.maxTime) / budget.absolute.maxTime)}`,
            threshold: budget.absolute.maxTime,
            type: 'maxTime',
          });
        }
      }

      if (budget.absolute.minOpsPerSec !== undefined) {
        if (actual.opsPerSecond < budget.absolute.minOpsPerSec) {
          violations.push({
            actual: actual.opsPerSecond,
            delta:
              (budget.absolute.minOpsPerSec - actual.opsPerSecond) /
              budget.absolute.minOpsPerSec,
            message: `Operations per second ${BudgetEvaluator.formatNumber(actual.opsPerSecond)} is below minimum of ${BudgetEvaluator.formatNumber(budget.absolute.minOpsPerSec)} by ${BudgetEvaluator.formatPercentage((budget.absolute.minOpsPerSec - actual.opsPerSecond) / budget.absolute.minOpsPerSec)}`,
            threshold: budget.absolute.minOpsPerSec,
            type: 'minOpsPerSec',
          });
        }
      }

      if (budget.absolute.maxP99 !== undefined && actual.p99 !== undefined) {
        if (actual.p99 > budget.absolute.maxP99) {
          violations.push({
            actual: actual.p99,
            delta:
              (actual.p99 - budget.absolute.maxP99) / budget.absolute.maxP99,
            message: `P99 latency ${BudgetEvaluator.formatTime(actual.p99)} exceeded budget of ${BudgetEvaluator.formatTime(budget.absolute.maxP99)} by ${BudgetEvaluator.formatPercentage((actual.p99 - budget.absolute.maxP99) / budget.absolute.maxP99)}`,
            threshold: budget.absolute.maxP99,
            type: 'maxP99',
          });
        }
      }
    }

    // Evaluate relative budgets
    if (budget.relative && baseline) {
      if (budget.relative.maxRegression !== undefined) {
        const regression = (actual.mean - baseline.mean) / baseline.mean;

        if (regression > budget.relative.maxRegression) {
          violations.push({
            actual: regression,
            delta: regression - budget.relative.maxRegression,
            message: `Performance regressed by ${BudgetEvaluator.formatPercentage(regression)} exceeding maximum allowed regression of ${BudgetEvaluator.formatPercentage(budget.relative.maxRegression)}`,
            threshold: budget.relative.maxRegression,
            type: 'maxRegression',
          });
        }
      }
    }

    return {
      actual: {
        mean: actual.mean,
        opsPerSecond: actual.opsPerSecond,
        p99: actual.p99,
      },
      baseline: baseline
        ? {
            mean: baseline.mean,
            opsPerSecond: baseline.opsPerSecond,
            p99: baseline.p99,
          }
        : undefined,
      budget,
      passed: violations.length === 0,
      taskId,
      violations,
    };
  }
}
