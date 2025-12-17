/**
 * Budget resolution service for matching budgets to tasks
 *
 * This module provides pattern-based budget resolution using:
 *
 * - Minimatch glob patterns for file matching
 * - Simple `*` wildcards for suite/task matching
 *
 * @packageDocumentation
 */

import { minimatch } from 'minimatch';

import type {
  Budget,
  BudgetPattern,
  ResolvedBudgets,
  TaskId,
} from '../types/core.js';

/**
 * Check if a glob pattern contains wildcards
 *
 * @param pattern - The pattern to check
 * @returns True if the pattern contains glob metacharacters
 */
export const isGlobPattern = (pattern: string): boolean => {
  return /[*?[\]]/.test(pattern);
};

/**
 * Check if a file path matches a glob pattern
 *
 * @param pattern - Minimatch glob pattern
 * @param filePath - File path to match against
 * @returns True if the pattern matches the file path
 */
export const matchesFile = (pattern: string, filePath: string): boolean => {
  // Exact match fast path
  if (pattern === filePath) {
    return true;
  }

  return minimatch(filePath, pattern, { matchBase: true });
};

/**
 * Check if a suite or task name matches a pattern
 *
 * @param pattern - Either an exact name or `*` for wildcard
 * @param value - The value to match against
 * @returns True if the pattern matches the value
 */
export const matchesSuiteOrTask = (pattern: string, value: string): boolean => {
  return pattern === '*' || pattern === value;
};

/**
 * Calculate specificity score for a budget pattern
 *
 * Higher scores indicate more specific patterns. Scoring:
 *
 * - File: +2 for exact match, +1 for glob with specific parts, +0 for `**\/*`
 * - Suite: +1 for exact match, +0 for `*`
 * - Task: +1 for exact match, +0 for `*`
 *
 * @param pattern - The budget pattern to score
 * @returns Specificity score (0-4)
 */
export const calculateSpecificity = (
  pattern: Pick<BudgetPattern, 'filePattern' | 'suitePattern' | 'taskPattern'>,
): number => {
  let score = 0;

  // File specificity
  if (!isGlobPattern(pattern.filePattern)) {
    // Exact file match
    score += 2;
  } else if (pattern.filePattern !== '**/*' && pattern.filePattern !== '*') {
    // Glob with some specificity (e.g., "**/api/**/*.bench.js")
    score += 1;
  }
  // else: fully generic glob like "**/*" gets +0

  // Suite specificity
  if (pattern.suitePattern !== '*') {
    score += 1;
  }

  // Task specificity
  if (pattern.taskPattern !== '*') {
    score += 1;
  }

  return score;
};

/**
 * Parse a TaskId into its components
 *
 * TaskIds have the format: `{filePath}/{suiteName}/{taskName}` The file path
 * can contain slashes, so we parse from the end.
 *
 * @param taskId - The TaskId to parse
 * @returns Object with file, suite, and task components
 */
export const parseTaskId = (
  taskId: TaskId,
): { file: string; suite: string; task: string } => {
  const str = taskId as string;
  const lastSlash = str.lastIndexOf('/');
  const secondLastSlash = str.lastIndexOf('/', lastSlash - 1);

  return {
    file: str.substring(0, secondLastSlash),
    suite: str.substring(secondLastSlash + 1, lastSlash),
    task: str.substring(lastSlash + 1),
  };
};

/**
 * Deep merge two budget objects
 *
 * More specific (second) budget values override less specific (first) values.
 * Merges at the absolute/relative level.
 *
 * @param base - Base budget (less specific)
 * @param override - Override budget (more specific)
 * @returns Merged budget
 */
export const mergeBudgets = (base: Budget, override: Budget): Budget => {
  return {
    ...(base.absolute || override.absolute
      ? {
          absolute: {
            ...base.absolute,
            ...override.absolute,
          },
        }
      : {}),
    ...(base.relative || override.relative
      ? {
          relative: {
            ...base.relative,
            ...override.relative,
          },
        }
      : {}),
  };
};

/**
 * Resolve the appropriate budget for a task
 *
 * Resolution order:
 *
 * 1. Check exact match in `exact` map (highest priority)
 * 2. Find all matching patterns
 * 3. Sort by specificity (ascending)
 * 4. Merge matched budgets (more specific overrides less specific)
 *
 * @param taskId - The task identifier to resolve a budget for
 * @param budgets - The resolved budgets structure
 * @returns The resolved budget, or undefined if no budget matches
 */
export const resolveBudget = (
  taskId: TaskId,
  budgets: ResolvedBudgets,
): Budget | undefined => {
  // Fast path: exact match
  const exactMatch = budgets.exact[taskId as string];
  if (exactMatch) {
    // Still need to check patterns and merge if there are less-specific matches
    const parsed = parseTaskId(taskId);
    const matchingPatterns = budgets.patterns.filter(
      (p) =>
        matchesFile(p.filePattern, parsed.file) &&
        matchesSuiteOrTask(p.suitePattern, parsed.suite) &&
        matchesSuiteOrTask(p.taskPattern, parsed.task),
    );

    if (matchingPatterns.length === 0) {
      return exactMatch;
    }

    // Sort by specificity ascending (least specific first, so more specific can override)
    const sorted = [...matchingPatterns].sort(
      (a, b) => a.specificity - b.specificity,
    );

    // Merge all patterns, then apply exact match last
    let merged = sorted[0]!.budget;
    for (let i = 1; i < sorted.length; i++) {
      merged = mergeBudgets(merged, sorted[i]!.budget);
    }

    // Exact match has highest priority
    return mergeBudgets(merged, exactMatch);
  }

  // Find all matching patterns
  const parsed = parseTaskId(taskId);
  const matchingPatterns = budgets.patterns.filter(
    (p) =>
      matchesFile(p.filePattern, parsed.file) &&
      matchesSuiteOrTask(p.suitePattern, parsed.suite) &&
      matchesSuiteOrTask(p.taskPattern, parsed.task),
  );

  if (matchingPatterns.length === 0) {
    return undefined;
  }

  // Sort by specificity ascending (least specific first)
  const sorted = [...matchingPatterns].sort(
    (a, b) => a.specificity - b.specificity,
  );

  // Merge all matches (more specific overrides less specific)
  let merged = sorted[0]!.budget;
  for (let i = 1; i < sorted.length; i++) {
    merged = mergeBudgets(merged, sorted[i]!.budget);
  }

  return merged;
};

/**
 * Create a BudgetPattern from its components
 *
 * @param filePattern - Glob pattern for file matching
 * @param suitePattern - Suite name or `*` for wildcard
 * @param taskPattern - Task name or `*` for wildcard
 * @param budget - The budget to apply
 * @returns A BudgetPattern with computed specificity
 */
export const createBudgetPattern = (
  filePattern: string,
  suitePattern: string,
  taskPattern: string,
  budget: Budget,
): BudgetPattern => {
  return {
    budget,
    filePattern,
    specificity: calculateSpecificity({
      filePattern,
      suitePattern,
      taskPattern,
    }),
    suitePattern,
    taskPattern,
  };
};
