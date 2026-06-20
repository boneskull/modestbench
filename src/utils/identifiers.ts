/**
 * Utility functions for creating branded identifier types
 *
 * @module utils/identifiers
 */

import type { RunId, TaskId } from '../types/budgets.js';

/**
 * Create a RunId from a string (validation should happen elsewhere)
 *
 * @param id - The run identifier string (typically 7 alphanumeric characters)
 * @returns A branded RunId
 */
export const createRunId = (id: string): RunId => id as RunId;

/**
 * Create a TaskId from file, suite, and task names
 *
 * @param filePath - Path to the benchmark file
 * @param suiteName - Name of the test suite
 * @param taskName - Name of the benchmark task
 * @returns A branded TaskId in the format `{filePath}/{suiteName}/{taskName}`
 */
export function createTaskId(
  filePath: string,
  suiteName: string,
  taskName: string,
): TaskId;
/**
 * Create a TaskId from a single string
 *
 * @param filePath - Path to the benchmark file
 * @param suiteName - Name of the test suite
 * @param taskName - Name of the benchmark task
 * @returns A branded TaskId in the format `{filePath}/{suiteName}/{taskName}`
 */
export function createTaskId(taskId: string): TaskId;
/**
 * Create a TaskId from file, suite, and task names
 *
 * @param filePath - Path to the benchmark file
 * @param suiteName - Name of the test suite
 * @param taskName - Name of the benchmark task
 * @returns A branded TaskId in the format `{filePath}/{suiteName}/{taskName}`
 */
export function createTaskId(
  filePath: string,
  suiteName?: string,
  taskName?: string,
): TaskId {
  if (suiteName !== undefined && taskName !== undefined) {
    return `${filePath}/${suiteName}/${taskName}` as TaskId;
  }
  return filePath as TaskId;
}
