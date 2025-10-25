/**
 * Data Models for History Services
 *
 * Type definitions for history command data structures, shared between
 * services, formatters, and CLI handlers.
 */

import type { BenchmarkRun } from '../../types/index.js';

/**
 * Result from comparing two benchmark runs
 */
export interface CompareResult {
  run1: {
    endTime: Date;
    id: string;
    startTime: Date;
    summary: {
      failedTasks: number;
      passedTasks: number;
      totalFiles: number;
      totalTasks: number;
    };
  };
  run2: {
    endTime: Date;
    id: string;
    startTime: Date;
    summary: {
      failedTasks: number;
      passedTasks: number;
      totalFiles: number;
      totalTasks: number;
    };
  };
  tasksInBoth: TaskComparison[];
  tasksOnlyInRun1: TaskComparison[];
  tasksOnlyInRun2: TaskComparison[];
}

/**
 * Distribution bucket for histogram visualization
 */
export interface DistributionBucket {
  count: number;
  label: string;
  max: number;
  min: number;
}

/**
 * Result from listing historical runs
 */
export interface HistoryListResult {
  runs: Array<{
    duration: number;
    id: string;
    startTime: Date;
    summary: {
      failedTasks: number;
      passedTasks: number;
      totalFiles: number;
      totalTasks: number;
    };
  }>;
  totalCount: number;
}

/**
 * Show command result (just wraps BenchmarkRun for consistency)
 */
export type ShowResult = BenchmarkRun;

/**
 * Task comparison result between two runs
 */
export interface TaskComparison {
  file: string;
  inBoth: boolean;
  percentChange: number;
  run1?: {
    cv: number;
    iterations: number;
    max: number;
    mean: number;
    min: number;
  };
  run2?: {
    cv: number;
    iterations: number;
    max: number;
    mean: number;
    min: number;
  };
  suite: string;
  task: string;
}

/**
 * Complete trend analysis for a single task
 */
export interface TrendData {
  confidence: number;
  dataPoints: TrendDataPoint[];
  percentChange: number;
  runs: number;
  statistics: TrendStatistics;
  task: string;
  trend: 'degrading' | 'improving' | 'stable';
}

/**
 * Single data point in a trend series
 */
export interface TrendDataPoint {
  date: Date;
  mean: number;
}

/**
 * Result from analyzing performance trends
 */
export interface TrendsResult {
  lowConfidenceRegressions: TrendData[];
  regressions: TrendData[];
  runs: number;
  summary: {
    degradingTasks: number;
    improvingTasks: number;
    stableTasks: number;
    totalTasks: number;
  };
  timespan: {
    end: Date;
    start: Date;
  };
  trends: TrendData[];
}

/**
 * Statistical metrics for trend analysis
 */
export interface TrendStatistics {
  mean: number;
  median: number;
  stdDeviation: number;
  variance: number;
}
