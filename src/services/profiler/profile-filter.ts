/**
 * Profile Filter Service
 *
 * Filters and sorts profiled functions based on configuration. Implements smart
 * detection to focus on user code by excluding node_modules and Node.js
 * internals.
 *
 * @packageDocumentation
 */

import { minimatch } from 'minimatch';

import type {
  FilteredProfileData,
  ProfileConfig,
  ProfiledFunction,
  RawProfileData,
} from '../../types/profiler.js';

/**
 * Filter profile data based on configuration
 *
 * @param data - Raw profile data
 * @param config - Filter configuration
 * @param packageRoot - Package root directory for smart detection
 * @returns Filtered profile data
 */
export const filterProfile = (
  data: RawProfileData,
  config: ProfileConfig,
  packageRoot: string,
): FilteredProfileData => {
  let filtered = data.functions.filter((fn) => {
    // Only JavaScript functions
    if (fn.category !== 'JavaScript') {
      return false;
    }

    // Apply smart detection if enabled
    if (config.smartDetection && !config.focus?.length) {
      if (!isUserCode(fn.file, packageRoot)) {
        return false;
      }
    }

    // Apply focus patterns (if provided, overrides smart detection)
    if (config.focus?.length) {
      if (!matchesAnyPattern(fn.file, config.focus)) {
        return false;
      }
    }

    // Apply exclude patterns (always applied if provided)
    if (config.exclude?.length) {
      if (matchesAnyPattern(fn.file, config.exclude)) {
        return false;
      }
    }

    return true;
  });

  // Apply percentage threshold
  const minPercent = config.minExecutionPercent ?? 0.5;
  filtered = filtered.filter((fn) => fn.percentage >= minPercent);

  // Sort by percentage (highest first)
  filtered.sort((a, b) => b.percentage - a.percentage);

  // Limit to topN
  const topN = config.topN ?? 25;
  filtered = filtered.slice(0, topN);

  // Group by file if requested
  let groupedByFile: Map<string, ProfiledFunction[]> | undefined;
  if (config.groupByFile) {
    groupedByFile = groupByFile(filtered);
  }

  return {
    functions: filtered,
    groupedByFile,
    summary: data.summary,
    totalFiltered: data.functions.length,
    totalShown: filtered.length,
    totalTicks: data.totalTicks,
  };
};

/**
 * Check if a file path is user code (not node_modules or internals)
 */
const isUserCode = (filePath: string, packageRoot: string): boolean => {
  // Exclude node_modules
  if (
    filePath.includes('/node_modules/') ||
    filePath.includes('\\node_modules\\')
  ) {
    return false;
  }

  // Exclude Node.js internals
  if (filePath.startsWith('node:') || filePath.startsWith('internal/')) {
    return false;
  }

  // Allow <unknown> files (could be eval'd code or other user code without file paths)
  if (filePath === '<unknown>' || filePath === '[eval]') {
    return true;
  }

  // Must be within package root
  return filePath.startsWith(packageRoot);
};

/**
 * Check if a file path matches any of the given glob patterns
 */
const matchesAnyPattern = (filePath: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => minimatch(filePath, pattern));
};

/**
 * Group functions by file path
 */
const groupByFile = (
  functions: ProfiledFunction[],
): Map<string, ProfiledFunction[]> => {
  const grouped = new Map<string, ProfiledFunction[]>();

  for (const fn of functions) {
    const existing = grouped.get(fn.file) || [];
    existing.push(fn);
    grouped.set(fn.file, existing);
  }

  // Sort functions within each file by percentage
  for (const [, fns] of grouped.entries()) {
    fns.sort((a, b) => b.percentage - a.percentage);
  }

  return grouped;
};
