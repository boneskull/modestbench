/**
 * Trend Analysis Service
 *
 * Statistical analysis of benchmark performance trends over time, including
 * regression detection and trend classification.
 */

import type { BenchmarkRun } from '../../types/index.js';
import type {
  TrendData,
  TrendDataPoint,
  TrendsResult,
  TrendStatistics,
} from './models.js';

/**
 * Service for analyzing performance trends
 */
export class TrendAnalysisService {
  /**
   * Analyze trends across multiple benchmark runs
   */
  analyzeTrends(runs: BenchmarkRun[]): TrendsResult {
    // Build trend data for each task across runs
    const taskTrendsMap = new Map<string, TrendDataPoint[]>();

    for (const run of runs) {
      for (const file of run.files) {
        for (const suite of file.suites) {
          for (const task of suite.tasks) {
            if (!task.error) {
              const key = `${file.filePath}::${suite.name}::${task.name}`;
              const dataPoints = taskTrendsMap.get(key) || [];
              dataPoints.push({
                date: new Date(run.startTime),
                mean: task.mean,
              });
              taskTrendsMap.set(key, dataPoints);
            }
          }
        }
      }
    }

    // Calculate trends for each task
    const trendsData: TrendData[] = [];

    for (const [key, dataPoints] of taskTrendsMap.entries()) {
      // Sort by date (oldest first)
      dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

      const [_filePath, suiteName, taskName] = key.split('::');

      const statistics = calculateStatistics(dataPoints);
      const trend = calculateTrend(dataPoints);
      const percentChange = calculatePercentChange(dataPoints);

      trendsData.push({
        confidence: 95, // Fixed confidence level for now
        dataPoints,
        percentChange,
        runs: dataPoints.length,
        statistics,
        task: `${suiteName} › ${taskName}`,
        trend,
      });
    }

    // Sort by absolute percent change (most significant first)
    trendsData.sort(
      (a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange),
    );

    // Calculate summary statistics
    const summary = {
      degradingTasks: trendsData.filter((t) => t.trend === 'degrading').length,
      improvingTasks: trendsData.filter((t) => t.trend === 'improving').length,
      stableTasks: trendsData.filter((t) => t.trend === 'stable').length,
      totalTasks: trendsData.length,
    };

    // Get timespan
    const firstRun = runs[runs.length - 1];
    const lastRun = runs[0];
    const timespan = {
      end: lastRun ? new Date(lastRun.startTime) : new Date(),
      start: firstRun ? new Date(firstRun.startTime) : new Date(),
    };

    // Detect regressions (require minimum 5 runs for confidence)
    const minRunsForRegression = 5;
    const regressions = trendsData.filter((t) =>
      detectRegression(t, 5, minRunsForRegression),
    );

    // Also track low-confidence potential regressions (2-4 runs showing degradation)
    const lowConfidenceRegressions = trendsData.filter(
      (t) =>
        t.trend === 'degrading' &&
        t.percentChange >= 5 &&
        t.runs < minRunsForRegression &&
        t.runs >= 2,
    );

    return {
      lowConfidenceRegressions,
      regressions,
      runs: runs.length,
      summary,
      timespan,
      trends: trendsData,
    };
  }
}

/**
 * Calculate percent change from first to last data point
 */
export const calculatePercentChange = (
  dataPoints: TrendDataPoint[],
): number => {
  if (dataPoints.length === 0 || dataPoints.length === 1) {
    return 0;
  }

  const firstPoint = dataPoints[0];
  const lastPoint = dataPoints[dataPoints.length - 1];

  if (!firstPoint || !lastPoint) {
    return 0;
  }

  const first = firstPoint.mean;
  const last = lastPoint.mean;

  if (first === 0) {
    return 0; // Avoid division by zero
  }

  return ((last - first) / first) * 100;
};

/**
 * Calculate statistical metrics from data points
 */
export const calculateStatistics = (
  dataPoints: TrendDataPoint[],
): TrendStatistics => {
  if (dataPoints.length === 0) {
    throw new Error('Cannot calculate statistics for empty data points array');
  }

  const values = dataPoints.map((dp) => dp.mean);
  const n = values.length;

  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / n;

  // Calculate median
  const sorted = [...values].sort((a, b) => a - b);
  const median =
    n % 2 === 0
      ? ((sorted[n / 2 - 1] ?? 0) + (sorted[n / 2] ?? 0)) / 2
      : (sorted[Math.floor(n / 2)] ?? 0);

  // Calculate variance and standard deviation
  const variance =
    n === 1
      ? 0
      : values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDeviation = Math.sqrt(variance);

  return {
    mean,
    median,
    stdDeviation,
    variance,
  };
};

/**
 * Calculate trend direction from data points using linear regression
 */
export const calculateTrend = (
  dataPoints: TrendDataPoint[],
): 'degrading' | 'improving' | 'stable' => {
  if (dataPoints.length === 0) {
    return 'stable';
  }

  if (dataPoints.length === 1) {
    return 'stable';
  }

  // Simple linear regression to determine slope
  const n = dataPoints.length;
  const x = Array.from({ length: n }, (_, i) => i); // Time indices
  const y = dataPoints.map((dp) => dp.mean);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] ?? 0), 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  // Calculate slope: (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Determine significance threshold (5% of mean)
  const meanValue = sumY / n;
  const significanceThreshold = Math.abs(meanValue * 0.05);

  // Classify trend based on slope
  if (Math.abs(slope) < significanceThreshold / n) {
    return 'stable';
  } else if (slope < 0) {
    // Negative slope = values decreasing = performance improving
    return 'improving';
  } else {
    // Positive slope = values increasing = performance degrading
    return 'degrading';
  }
};

/**
 * Detect if a trend represents a performance regression
 */
export const detectRegression = (
  trendData: TrendData,
  threshold: number,
  minRuns: number,
): boolean => {
  // Regression is a degrading trend with percent change exceeding threshold
  return (
    trendData.trend === 'degrading' &&
    trendData.percentChange >= threshold &&
    trendData.runs >= minRuns
  );
};
