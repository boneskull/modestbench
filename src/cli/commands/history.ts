/**
 * ModestBench History Command
 *
 * View and manage benchmark run history with subcommands for listing, showing,
 * comparing, and cleaning historical data.
 */

import type { HistoryQuery, RetentionPolicy } from '../../types/index.js';
import type { CliContext } from '../index.js';


/**
 * History command options interface
 */
interface HistoryOptions {
  args?: string[] | undefined; // Additional arguments after subcommand
  confirm?: boolean | undefined;
  cwd: string;
  format?: 'csv' | 'human' | 'json' | undefined;
  limit?: number | undefined;
  maxAge?: number | undefined;
  maxRuns?: number | undefined;
  maxSize?: number | undefined;
  outputDir?: string | undefined;
  pattern?: string | undefined;
  quiet?: boolean | undefined;
  since?: string | undefined;
  subcommand: 'clean' | 'compare' | 'export' | 'list' | 'show' | 'trends';
  tags?: string[] | undefined;
  until?: string | undefined;
  verbose?: boolean | undefined;
}

/**
 * Handle history command
 */
export const handleHistoryCommand = async (
  context: CliContext,
  options: HistoryOptions,
): Promise<number> => {
  try {
    // Get the subcommand
    const subcommand = options.subcommand;

    switch (subcommand) {
      case 'clean':
        return await handleCleanCommand(context, options);
      case 'compare':
        return await handleCompareCommand(context, options);
      case 'export':
        return await handleExportCommand(context, options);
      case 'list':
        return await handleListCommand(context, options);
      case 'show':
        return await handleShowCommand(context, options);
      case 'trends':
        return await handleTrendsCommand(context, options);
      default:
        console.error(`Unknown history subcommand: ${subcommand || '(none)'}`);
        console.error(
          'Available subcommands: list, show, compare, trends, clean, export',
        );
        return 2; // Config error
    }
  } catch (error) {
    console.error(
      'History command failed:',
      error instanceof Error ? error.message : String(error),
    );
    return 2; // Configuration/runtime errors
  }
};

/**
 * Format bytes in human-readable format
 */
const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Handle the clean subcommand
 */
const handleCleanCommand = async (
  context: CliContext,
  options: HistoryOptions,
): Promise<number> => {
  try {
    // Build retention policy from arguments
    const policy = {
      ...(options.maxAge && { maxAge: options.maxAge }),
      ...(options.maxRuns && { maxRuns: options.maxRuns }),
      ...(options.maxSize && { maxSize: options.maxSize }),
    } as Partial<RetentionPolicy>;

    if (Object.keys(policy).length === 0) {
      console.error(
        'At least one cleanup criterion must be specified (--max-age, --max-runs, or --max-size)',
      );
      return 2;
    }

    // Show what would be cleaned unless confirmed
    if (!options.confirm) {
      console.log(
        'This will clean up historical data based on the following policy:',
      );
      if (policy.maxAge) {
        console.log(`  - Remove runs older than ${policy.maxAge}ms`);
      }
      if (policy.maxRuns) {
        console.log(`  - Keep only the latest ${policy.maxRuns} runs`);
      }
      if (policy.maxSize) {
        console.log(
          `  - Remove runs until storage is under ${policy.maxSize} bytes`,
        );
      }
      console.log();
      console.log('Use --confirm to proceed with cleanup.');
      return 0;
    }

    // Perform cleanup
    const result = await context.historyStorage.cleanup(policy);

    if (!options.quiet) {
      console.log(`Cleanup completed:`);
      console.log(`  Removed ${result.removedRuns} run(s)`);
      console.log(`  Freed ${formatBytes(result.freedBytes)} of storage`);

      if (options.verbose && result.removedFiles.length > 0) {
        console.log(`  Removed files:`);
        for (const file of result.removedFiles) {
          console.log(`    ${file}`);
        }
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to clean history:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};

/**
 * Task comparison result
 */
interface TaskComparison {
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
 * Handle the compare subcommand
 */
const handleCompareCommand = async (
  context: CliContext,
  options: HistoryOptions,
): Promise<number> => {
  try {
    // For compare command, IDs come from args after the subcommand
    const id1 = options.args?.[0];
    const id2 = options.args?.[1];

    if (!id1 || !id2) {
      console.error('Two run IDs are required for compare command');
      console.error('Usage: modestbench history compare <run-id1> <run-id2>');
      return 2;
    }

    const [run1, run2] = await Promise.all([
      context.historyStorage.loadRun(id1),
      context.historyStorage.loadRun(id2),
    ]);

    if (!run1) {
      console.error(`Run not found: ${id1}`);
      return 1;
    }

    if (!run2) {
      console.error(`Run not found: ${id2}`);
      return 1;
    }

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

    if (options.format === 'json') {
      const comparison = {
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
        taskComparisons: tasksInBoth,
        tasksOnlyInRun1: tasksOnlyIn1,
        tasksOnlyInRun2: tasksOnlyIn2,
      };
      console.log(JSON.stringify(comparison, null, 2));
    } else {
      // Human format comparison
      console.log(`Comparing runs:`);
      console.log(`  Run 1: ${run1.id} (${run1.startTime.toLocaleString()})`);
      console.log(`  Run 2: ${run2.id} (${run2.startTime.toLocaleString()})`);
      console.log();

      console.log('Summary comparison:');
      console.log(
        `  Files: ${run1.summary.totalFiles} vs ${run2.summary.totalFiles}`,
      );
      console.log(
        `  Tasks: ${run1.summary.totalTasks} vs ${run2.summary.totalTasks}`,
      );
      console.log(
        `  Passed: ${run1.summary.passedTasks} vs ${run2.summary.passedTasks}`,
      );
      console.log(
        `  Failed: ${run1.summary.failedTasks} vs ${run2.summary.failedTasks}`,
      );
      console.log();

      // Detailed task comparison
      if (tasksInBoth.length > 0) {
        console.log('Task-by-task comparison:');
        console.log();

        for (const comparison of tasksInBoth) {
          const mean1 = comparison.run1!.mean / 1000000; // Convert to ms
          const mean2 = comparison.run2!.mean / 1000000;
          const changeSign = comparison.percentChange >= 0 ? '+' : '';
          const changeStr = `${changeSign}${comparison.percentChange.toFixed(1)}%`;

          console.log(`  ${comparison.suite} › ${comparison.task}`);
          console.log(
            `    Mean: ${mean1.toFixed(3)}ms → ${mean2.toFixed(3)}ms (${changeStr})`,
          );
          console.log(
            `    Min: ${(comparison.run1!.min / 1000000).toFixed(3)}ms → ${(comparison.run2!.min / 1000000).toFixed(3)}ms`,
          );
          console.log(
            `    Max: ${(comparison.run1!.max / 1000000).toFixed(3)}ms → ${(comparison.run2!.max / 1000000).toFixed(3)}ms`,
          );
          console.log(
            `    Iterations: ${comparison.run1!.iterations} vs ${comparison.run2!.iterations}`,
          );
          console.log();
        }
      }

      if (tasksOnlyIn1.length > 0) {
        console.log(`Tasks only in run 1 (${tasksOnlyIn1.length}):`);
        for (const task of tasksOnlyIn1) {
          console.log(`  - ${task.suite} › ${task.task}`);
        }
        console.log();
      }

      if (tasksOnlyIn2.length > 0) {
        console.log(`Tasks only in run 2 (${tasksOnlyIn2.length}):`);
        for (const task of tasksOnlyIn2) {
          console.log(`  - ${task.suite} › ${task.task}`);
        }
        console.log();
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to compare runs:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};

/**
 * Handle the export subcommand
 */
const handleExportCommand = async (
  context: CliContext,
  options: HistoryOptions,
): Promise<number> => {
  try {
    const format = options.format || 'json';

    // Build query for export
    const query = {
      ...(options.since && { since: parseDate(options.since) }),
      ...(options.until && { until: parseDate(options.until) }),
    } as Partial<HistoryQuery>;

    const exportData = await context.historyStorage.export(
      format as 'csv' | 'json',
      query,
    );

    if (options.outputDir) {
      // Write to file
      const fs = await import('node:fs/promises');
      await fs.writeFile(options.outputDir, exportData, 'utf8');
      if (!options.quiet) {
        console.log(`Exported history to ${options.outputDir}`);
      }
    } else {
      // Write to stdout
      console.log(exportData);
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to export history:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};

/**
 * Handle the list subcommand
 */
const handleListCommand = async (
  context: CliContext,
  options: HistoryOptions,
): Promise<number> => {
  try {
    // Build query from command line arguments
    let parsedSince: Date | undefined;
    let parsedUntil: Date | undefined;

    if (options.since) {
      try {
        parsedSince = parseDate(options.since);
      } catch (error) {
        console.error(
          'Invalid since date:',
          error instanceof Error ? error.message : String(error),
        );
        return 2; // Invalid date format
      }
    }

    if (options.until) {
      try {
        parsedUntil = parseDate(options.until);
      } catch (error) {
        console.error(
          'Invalid until date:',
          error instanceof Error ? error.message : String(error),
        );
        return 2; // Invalid date format
      }
    }

    const query = {
      ...(parsedSince && { since: parsedSince }),
      ...(parsedUntil && { until: parsedUntil }),
      ...(options.pattern && { pattern: options.pattern }),
      ...(options.tags && options.tags.length > 0 && { tags: options.tags }),
      ...(options.limit && { limit: options.limit }),
    } as Partial<HistoryQuery>;

    // Query historical runs
    const runs = await context.historyStorage.queryRuns(query);

    // Display results based on format
    if (options.format === 'json') {
      if (runs.length === 0) {
        console.log('[]'); // Empty JSON array for no data
      } else {
        console.log(
          JSON.stringify(
            runs.map((run) => ({
              duration: run.duration,
              failed: run.summary.failedTasks,
              files: run.summary.totalFiles,
              id: run.id,
              passed: run.summary.passedTasks,
              startTime: run.startTime,
              tasks: run.summary.totalTasks,
            })),
            null,
            2,
          ),
        );
      }
    } else if (options.format === 'csv') {
      console.log('id,startTime,duration,files,tasks,passed,failed');
      if (runs.length > 0) {
        for (const run of runs) {
          console.log(
            `${run.id},${run.startTime.toISOString()},${run.duration},${run.summary.totalFiles},${run.summary.totalTasks},${run.summary.passedTasks},${run.summary.failedTasks}`,
          );
        }
      }
      // For CSV, no additional message needed - header is sufficient
    } else {
      // Human format
      if (runs.length === 0) {
        if (!options.quiet) {
          console.log('No historical data found matching criteria.');
        }
      } else {
        console.log('Recent benchmark runs:');
        console.log();

        for (const run of runs) {
          const dateStr = run.startTime.toLocaleString();
          const durationStr = `${(run.duration / 1000).toFixed(1)}s`;
          const statusStr =
            run.summary.failedTasks > 0
              ? `${run.summary.passedTasks} passed, ${run.summary.failedTasks} failed`
              : `${run.summary.passedTasks} passed`;

          console.log(
            `  ${run.id.substring(0, 8)} - ${dateStr} (${durationStr})`,
          );
          console.log(
            `    ${run.summary.totalFiles} files, ${run.summary.totalTasks} tasks: ${statusStr}`,
          );
          console.log();
        }
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to list history:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};

/**
 * Handle the show subcommand
 */
const handleShowCommand = async (
  context: CliContext,
  options: HistoryOptions,
): Promise<number> => {
  try {
    // For show command, ID comes from the args after the subcommand
    const runId = options.args?.[0];

    if (!runId) {
      console.error('Run ID is required for show command');
      console.error('Usage: modestbench history show <run-id>');
      return 2;
    }

    const run = await context.historyStorage.loadRun(runId);

    if (!run) {
      console.error(`Run not found: ${runId}`);
      return 1;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(run, null, 2));
    } else {
      // Human format
      console.log(`Benchmark Run: ${run.id}`);
      console.log(`Date: ${run.startTime.toLocaleString()}`);
      console.log(`Duration: ${(run.duration / 1000).toFixed(1)}s`);
      console.log(
        `Environment: Node.js ${run.environment.nodeVersion} on ${run.environment.platform}`,
      );

      if (run.git) {
        console.log(`Git: ${run.git.branch}@${run.git.commit.substring(0, 8)}`);
      }

      console.log();
      console.log('Summary:');
      console.log(`  Files: ${run.summary.totalFiles}`);
      console.log(`  Suites: ${run.summary.totalSuites}`);
      console.log(`  Tasks: ${run.summary.totalTasks}`);
      console.log(`  Passed: ${run.summary.passedTasks}`);
      console.log(`  Failed: ${run.summary.failedTasks}`);

      // TODO: Show detailed file/suite/task results
      console.log();
      console.log('Detailed results:');
      for (const file of run.files) {
        console.log(`  📁 ${file.filePath}`);
        for (const suite of file.suites) {
          console.log(`    📊 ${suite.name}`);
          for (const task of suite.tasks) {
            const status = task.error ? '❌' : '✅';
            const timing = task.error
              ? 'failed'
              : `${(task.mean / 1000000).toFixed(2)}ms`;
            console.log(`      ${status} ${task.name} - ${timing}`);
          }
        }
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to show run:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};

/**
 * Handle the trends subcommand
 */
const handleTrendsCommand = async (
  context: CliContext,
  options: HistoryOptions,
): Promise<number> => {
  try {
    // Build query from command line arguments (same as list command)
    let parsedSince: Date | undefined;
    let parsedUntil: Date | undefined;

    if (options.since) {
      try {
        parsedSince = parseDate(options.since);
      } catch (error) {
        console.error(
          'Invalid since date:',
          error instanceof Error ? error.message : String(error),
        );
        return 2; // Invalid date format
      }
    }

    if (options.until) {
      try {
        parsedUntil = parseDate(options.until);
      } catch (error) {
        console.error(
          'Invalid until date:',
          error instanceof Error ? error.message : String(error),
        );
        return 2; // Invalid date format
      }
    }

    // Get pattern from args or explicit pattern option
    const pattern = options.args?.[0] || options.pattern;

    const query = {
      ...(parsedSince && { since: parsedSince }),
      ...(parsedUntil && { until: parsedUntil }),
      ...(pattern && { pattern }),
      ...(options.tags && options.tags.length > 0 && { tags: options.tags }),
      ...(options.limit && { limit: options.limit }),
    } as Partial<HistoryQuery>;

    // Query historical runs
    const runs = await context.historyStorage.queryRuns(query);

    if (runs.length === 0) {
      if (!options.quiet) {
        console.log('No historical data found matching criteria');
      }
      return 0; // Success - no data is not an error
    }

    if (options.format === 'json') {
      // TODO: Generate trends data in JSON format
      const trendsData = {
        runs: runs.length,
        timespan: {
          end: runs[0]?.startTime,
          start: runs[runs.length - 1]?.startTime,
        },
        // TODO: Add actual trend calculations
      };
      console.log(JSON.stringify(trendsData, null, 2));
    } else {
      // Human format trends
      if (!options.quiet) {
        console.log(`Performance trends for ${runs.length} runs:`);
        console.log(
          `Time range: ${runs[runs.length - 1]?.startTime} to ${runs[0]?.startTime}`,
        );
        // TODO: Add trend analysis and visualization
        console.log('(Trend analysis not yet implemented)');
      }
    }

    return 0; // Success
  } catch (error) {
    console.error('Error showing trends:', error);
    return 3; // Runtime error
  }
};

/**
 * Complete trend analysis result
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
 * Trend data point representing a single benchmark measurement
 */
export interface TrendDataPoint {
  date: Date;
  mean: number;
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
 * Detect if a trend represents a performance regression
 */
export const detectRegression = (
  trendData: TrendData,
  threshold: number,
): boolean => {
  // Regression is a degrading trend with percent change exceeding threshold
  return (
    trendData.trend === 'degrading' && trendData.percentChange >= threshold
  );
};

/**
 * ANSI color codes for synthwave theme
 */
const colors = {
  bold: '\x1b[1m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
  brightMagenta: '\x1b[95m',
  brightRed: '\x1b[91m',
  brightWhite: '\x1b[97m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  white: '\x1b[37m',
} as const;

/**
 * Apply synthwave color to text
 */
export const colorize = (color: keyof typeof colors, text: string): string => {
  return `${colors[color]}${text}${colors.reset}`;
};

/**
 * Generate ASCII sparkline from values
 */
export const generateSparkline = (values: number[], width?: number): string => {
  if (values.length === 0) {
    return '';
  }

  // Sparkline characters from lowest to highest
  const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  // Downsample if width is specified and values exceed it
  let processedValues = values;
  if (width && values.length > width) {
    const step = values.length / width;
    processedValues = [];
    for (let i = 0; i < width; i++) {
      const idx = Math.floor(i * step);
      processedValues.push(values[idx] ?? 0);
    }
  }

  // Find min and max for scaling
  const min = Math.min(...processedValues);
  const max = Math.max(...processedValues);
  const range = max - min;

  // Handle case where all values are the same
  if (range === 0) {
    return (sparkChars[4] ?? '▄').repeat(processedValues.length); // Use middle character
  }

  // Map each value to a sparkline character
  return processedValues
    .map((value) => {
      const normalized = (value - min) / range;
      const index = Math.min(
        Math.floor(normalized * sparkChars.length),
        sparkChars.length - 1,
      );
      return sparkChars[index] ?? '▄';
    })
    .join('');
};

/**
 * Distribution bucket for bar chart
 */
export interface DistributionBucket {
  count: number;
  label: string;
  max: number;
  min: number;
}

/**
 * Generate bar chart histogram from distribution
 */
export const generateBarChart = (
  distribution: DistributionBucket[],
  maxWidth = 20,
): string[] => {
  if (distribution.length === 0) {
    return [];
  }

  // Find maximum count for scaling
  const maxCount = Math.max(...distribution.map((b) => b.count));

  if (maxCount === 0) {
    return distribution.map((bucket) => `  ${bucket.label} (0 runs)`);
  }

  // Block characters for bar visualization
  const fullBlock = '█';
  const lightBlock = '░';

  return distribution.map((bucket) => {
    const ratio = bucket.count / maxCount;
    const barLength = Math.round(ratio * maxWidth);
    const fullBlocks = fullBlock.repeat(barLength);
    const emptyBlocks = lightBlock.repeat(maxWidth - barLength);

    return `  ${fullBlocks}${emptyBlocks} ${bucket.label} (${bucket.count} run${bucket.count !== 1 ? 's' : ''})`;
  });
};

/**
 * Parse date string (ISO 8601 or relative)
 *
 * Supports:
 *
 * - ISO 8601: "2025-10-24T12:00:00Z", "2025-10-24"
 * - Relative: "1 day ago", "3 weeks ago", "2 hours ago"
 * - Shorthand: "1d", "2w", "3m", "6h"
 *
 * @param dateStr - Date string to parse
 * @returns Parsed Date object
 * @throws Error if date format is invalid
 */
export const parseDate = (dateStr: string): Date => {
  if (!dateStr || dateStr.trim() === '') {
    throw new Error(`Invalid date format: "${dateStr}"`);
  }

  // Try parsing as ISO 8601 first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Parse relative dates like "1 week ago", "3 days ago"
  const relativePattern = /^(\d+)\s+(hour|day|week|month)s?\s+ago$/i;
  const relativeMatch = dateStr.trim().match(relativePattern);

  if (relativeMatch && relativeMatch[1] && relativeMatch[2]) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();

    if (amount <= 0) {
      throw new Error(`Invalid date format: "${dateStr}"`);
    }

    const now = new Date();
    const msPerUnit: Record<string, number> = {
      day: 24 * 60 * 60 * 1000,
      hour: 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000, // Approximate
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const offset = amount * (msPerUnit[unit] || 0);
    return new Date(now.getTime() - offset);
  }

  // Parse shorthand formats like "1d", "2w", "3m", "6h"
  // cspell:ignore hdwm
  const shorthandPattern = /^(\d+)([hdwm])$/i;
  const shorthandMatch = dateStr.trim().match(shorthandPattern);

  if (shorthandMatch && shorthandMatch[1] && shorthandMatch[2]) {
    const amount = parseInt(shorthandMatch[1], 10);
    const unit = shorthandMatch[2].toLowerCase();

    if (amount <= 0) {
      throw new Error(`Invalid date format: "${dateStr}"`);
    }

    const now = new Date();
    const msPerUnit: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000, // Approximate month
      w: 7 * 24 * 60 * 60 * 1000,
    };

    const offset = amount * (msPerUnit[unit] || 0);
    return new Date(now.getTime() - offset);
  }

  throw new Error(`Invalid date format: "${dateStr}"`);
};
