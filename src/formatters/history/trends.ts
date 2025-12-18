/**
 * Trends Formatter
 *
 * Formats performance trend analysis with visualizations in human and JSON
 * formats.
 */

import { stripVTControlCharacters } from 'node:util';

import type {
  DistributionBucket,
  TrendsResult,
} from '../../services/history/models.js';
import type { HistoryFormatter } from './base.js';

import { colorize } from '../../utils/ansi.js';
import { generateBarChart, generateSparkline } from './visualization.js';

/**
 * Nanoseconds per millisecond conversion constant
 */
const NS_PER_MS = 1_000_000;

/**
 * Nanoseconds per microsecond conversion constant
 */
const NS_PER_US = 1000;

/**
 * Intelligently format a time range with appropriate precision Displays
 * microseconds for small values (< 1ms) for better clarity
 */
const formatTimeRange = (minNs: number, maxNs: number): string => {
  // If both values are below 1ms, show in microseconds for better precision
  if (maxNs < NS_PER_MS) {
    const minUs = minNs / NS_PER_US;
    const maxUs = maxNs / NS_PER_US;
    return `${minUs.toFixed(2)}-${maxUs.toFixed(2)}µs`;
  }

  // Otherwise show in milliseconds
  const minMs = minNs / NS_PER_MS;
  const maxMs = maxNs / NS_PER_MS;
  return `${minMs.toFixed(3)}-${maxMs.toFixed(3)}ms`;
};

/**
 * Calculate visible string length, stripping ANSI escape codes
 */
const getVisualLength = (str: string): number =>
  stripVTControlCharacters(str).length;

/**
 * Formatter for history trends command
 */
export class HistoryTrendsFormatter implements HistoryFormatter<TrendsResult> {
  /**
   * Format as human-readable trends with visualizations
   */
  formatHuman(data: TrendsResult): string {
    const lines: string[] = [];

    lines.push(
      colorize(
        'brightMagenta',
        colorize('bold', `\nPerformance Trends (${data.runs} runs)`),
      ),
    );

    if (data.timespan.start && data.timespan.end) {
      lines.push(
        colorize(
          'dim',
          `Time range: ${data.timespan.start.toLocaleDateString()} to ${data.timespan.end.toLocaleDateString()}`,
        ),
      );
    }
    lines.push('');

    // Summary statistics
    lines.push(colorize('brightBlue', 'Summary:'));
    lines.push(
      `  ${colorize('brightCyan', '▲')} ${data.summary.improvingTasks} improving  ${colorize('brightRed', '▼')} ${data.summary.degradingTasks} degrading  ${colorize('dim', '→')} ${data.summary.stableTasks} stable`,
    );
    lines.push('');

    // Task Performance Summary Table
    lines.push(colorize('brightMagenta', 'Task Performance Summary:'));
    lines.push('');

    for (const trendData of data.trends) {
      // Show top 20
      const trendIcon =
        trendData.trend === 'improving'
          ? colorize('brightCyan', '▲')
          : trendData.trend === 'degrading'
            ? colorize('brightRed', '▼')
            : colorize('dim', '→');

      const changeColor =
        trendData.percentChange < -5
          ? 'brightCyan'
          : trendData.percentChange > 5
            ? 'brightRed'
            : 'dim';

      const changeSign = trendData.percentChange >= 0 ? '+' : '';
      const changeStr = `${changeSign}${trendData.percentChange.toFixed(1)}%`;

      // Generate sparkline - scale with number of data points (min 12, max 20)
      const values = trendData.dataPoints.map((dp) => dp.mean);
      const sparklineWidth = Math.min(20, Math.max(12, trendData.runs));
      const sparkline = generateSparkline(values, sparklineWidth);
      const sparklineColor =
        trendData.trend === 'improving'
          ? 'brightCyan'
          : trendData.trend === 'degrading'
            ? 'brightRed'
            : 'cyan';

      const taskName = colorize('white', trendData.task);
      const percentDisplay = colorize(changeColor, changeStr.padStart(8));
      const sparklineDisplay = colorize(sparklineColor, sparkline);

      // Layout: icon (2) + task name + padding + percent (8) + spaces (2) + sparkline
      // Position percent+graph at visual column 60 for consistent alignment
      const prefix = `  ${trendIcon} ${taskName}`;
      const prefixVisualLength = getVisualLength(prefix);
      const targetColumn = 60;

      if (prefixVisualLength > targetColumn) {
        // Task name is too long, wrap to next line
        lines.push(prefix);
        lines.push(
          `${' '.repeat(targetColumn)}${percentDisplay}  ${sparklineDisplay}`,
        );
      } else {
        // Fit on one line with padding
        const padding = Math.max(1, targetColumn - prefixVisualLength);
        const paddingStr = ' '.repeat(padding);
        lines.push(
          `${prefix}${paddingStr}${percentDisplay}  ${sparklineDisplay}`,
        );
      }
    }

    // Show all trends (no limit)

    lines.push('');

    // Show regressions if any
    if (data.regressions.length > 0) {
      lines.push(
        colorize('brightRed', colorize('bold', 'Regressions Detected:')),
      );
      lines.push('');

      for (const regression of data.regressions) {
        lines.push(
          `  ${colorize('brightRed', '▼')} ${colorize('white', regression.task)}: ${colorize('brightRed', `${regression.percentChange.toFixed(1)}% slower`)} (${regression.runs} runs)`,
        );
      }

      lines.push('');
    }

    // Show low-confidence regressions (insufficient data)
    if (data.lowConfidenceRegressions.length > 0) {
      lines.push(
        colorize(
          'brightYellow',
          colorize('bold', '! Potential Regressions (insufficient data):'),
        ),
      );
      lines.push('');

      for (const regression of data.lowConfidenceRegressions) {
        lines.push(
          `  ${colorize('brightYellow', '!')} ${colorize('white', regression.task)}: ${colorize('brightYellow', `${regression.percentChange.toFixed(1)}% slower`)} (${regression.runs} run${regression.runs !== 1 ? 's' : ''})`,
        );
      }

      lines.push('');
    }

    // Show performance distribution for most important task (highest RME) if we have enough data
    // Find task with highest relative margin of error - the most variable/unreliable one
    const mostImportantTrend = data.trends
      .filter((t) => t.runs >= 5)
      .sort((a, b) => {
        const rmeA = (a.statistics.stdDeviation / a.statistics.mean) * 100;
        const rmeB = (b.statistics.stdDeviation / b.statistics.mean) * 100;
        return rmeB - rmeA; // Descending order (highest RME first)
      })[0];

    if (mostImportantTrend) {
      lines.push(
        colorize(
          'brightMagenta',
          'Performance Distribution (most variable task):',
        ),
      );
      lines.push(colorize('white', mostImportantTrend.task));
      const cv = (
        (mostImportantTrend.statistics.stdDeviation /
          mostImportantTrend.statistics.mean) *
        100
      ).toFixed(1);
      lines.push(colorize('dim', `  Variability: ${cv}%`));
      lines.push('');

      // Create distribution buckets
      const values = mostImportantTrend.dataPoints.map((dp) => dp.mean);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const numBuckets = Math.min(5, mostImportantTrend.runs);
      const bucketSize = range / numBuckets;

      const buckets: DistributionBucket[] = [];
      for (let i = 0; i < numBuckets; i++) {
        const bucketMin = min + i * bucketSize;
        const bucketMax = min + (i + 1) * bucketSize;
        const count = values.filter(
          (v) =>
            v >= bucketMin &&
            (i === numBuckets - 1 ? v <= bucketMax : v < bucketMax),
        ).length;

        const label = formatTimeRange(bucketMin, bucketMax);

        buckets.push({
          count,
          label,
          max: bucketMax,
          min: bucketMin,
        });
      }

      // Filter out empty buckets for cleaner display
      const nonEmptyBuckets = buckets.filter((b) => b.count > 0);
      const chart = generateBarChart(nonEmptyBuckets, 25);
      for (const line of chart) {
        lines.push(colorize('brightCyan', line));
      }

      lines.push('');
      lines.push(
        colorize(
          'dim',
          `  Mean: ${(mostImportantTrend.statistics.mean / NS_PER_MS).toFixed(3)}ms  Median: ${(mostImportantTrend.statistics.median / NS_PER_MS).toFixed(3)}ms  StdDev: ${(mostImportantTrend.statistics.stdDeviation / NS_PER_MS).toFixed(3)}ms`,
        ),
      );
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format as JSON
   */
  formatJson(data: TrendsResult): string {
    return JSON.stringify(
      {
        regressions: data.regressions,
        summary: {
          degradingTasks: data.summary.degradingTasks,
          improvingTasks: data.summary.improvingTasks,
          runs: data.runs,
          stableTasks: data.summary.stableTasks,
          timespan: data.timespan,
          totalTasks: data.summary.totalTasks,
        },
        trends: data.trends,
      },
      null,
      2,
    );
  }
}
