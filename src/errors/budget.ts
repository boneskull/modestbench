/**
 * Budget-related errors
 *
 * Errors that occur during budget evaluation and enforcement.
 */

import type { BudgetSummary } from '../types/core.js';

import { ModestBenchError } from './base.js';

/**
 * Error thrown when performance budgets are exceeded
 *
 * Thrown when budget evaluation fails and budgetMode is set to 'fail'. Contains
 * the full budget summary for detailed reporting.
 */
export class BudgetExceededError extends ModestBenchError {
  /**
   * Budget summary containing details of all violations
   */
  public readonly budgetSummary: BudgetSummary;

  /**
   * Error code for budget exceeded errors
   */
  readonly code = 'ERR_MB_BUDGET_EXCEEDED';

  /**
   * Create a new budget exceeded error
   *
   * @param message - Human-readable error message
   * @param budgetSummary - Budget evaluation results
   */
  constructor(message: string, budgetSummary: BudgetSummary) {
    super(message);
    this.budgetSummary = budgetSummary;
  }
}
