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
  output?: string | undefined;
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

    if (options.format === 'json') {
      const comparison = {
        run1: { id: run1.id, summary: run1.summary },
        run2: { id: run2.id, summary: run2.summary },
        // TODO: Add detailed comparison logic
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

      // TODO: Add detailed performance comparison
      console.log();
      console.log('Note: Detailed performance comparison not yet implemented.');
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

    if (options.output) {
      // Write to file
      const fs = await import('node:fs/promises');
      await fs.writeFile(options.output, exportData, 'utf8');
      if (!options.quiet) {
        console.log(`Exported history to ${options.output}`);
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
 * Parse date string (ISO 8601 or relative)
 */
const parseDate = (dateStr: string): Date => {
  // Try parsing as ISO 8601 first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // TODO: Parse relative dates like "1 week ago", "3 days ago", etc.
  // For now, throw error for invalid dates
  throw new Error(`Invalid date format: "${dateStr}"`);
};
