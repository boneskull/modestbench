/**
 * ModestBench History Command
 *
 * View and manage benchmark run history with subcommands for listing, showing,
 * comparing, and cleaning historical data.
 */

import type {
  HistoryQuery,
  HistoryStorage,
  RetentionPolicy,
} from '../../types/index.js';
import type { CliContext } from '../index.js';

import { HistoryCompareFormatter } from '../../formatters/history/compare.js';
import { HistoryListFormatter } from '../../formatters/history/list.js';
import { HistoryShowFormatter } from '../../formatters/history/show.js';
import { HistoryTrendsFormatter } from '../../formatters/history/trends.js';
import { ComparisonService } from '../../services/history/comparison.js';
import {
  HistoryQueryService,
  parseDate,
} from '../../services/history/query.js';
import { TrendAnalysisService } from '../../services/history/trend-analysis.js';
import { formatBytes } from '../../utils/reporter-utils.js';

/**
 * Base options shared by all history subcommands
 */
interface BaseHistoryOptions {
  cwd?: string;
  quiet?: boolean | undefined;
  verbose?: boolean | undefined;
}

/**
 * Options for history clean command
 */
interface HistoryCleanOptions extends BaseHistoryOptions {
  confirm?: boolean | undefined;
  maxAge?: number | undefined;
  maxRuns?: number | undefined;
  maxSize?: number | undefined;
}

/**
 * Options for history compare command
 */
interface HistoryCompareOptions extends BaseHistoryOptions {
  format?: 'human' | 'json' | undefined;
  runId1: string;
  runId2: string;
}

/**
 * Options for history export command
 */
interface HistoryExportOptions extends BaseHistoryOptions {
  format?: 'csv' | 'json' | undefined;
  outputPath: string;
  since?: string | undefined;
  until?: string | undefined;
}

/**
 * Options for history list command
 */
interface HistoryListOptions extends BaseHistoryOptions {
  format?: 'csv' | 'human' | 'json' | undefined;
  limit?: number | undefined;
  pattern?: string | undefined;
  since?: string | undefined;
  tags?: string[] | undefined;
  until?: string | undefined;
}

/**
 * Options for history show command
 */
interface HistoryShowOptions extends BaseHistoryOptions {
  format?: 'csv' | 'human' | 'json' | undefined;
  runId: string;
}

/**
 * Options for history trends command
 */
interface HistoryTrendsOptions extends BaseHistoryOptions {
  all?: boolean | undefined;
  format?: 'human' | 'json' | undefined;
  limit?: number | undefined;
  pattern?: string | undefined;
  since?: string | undefined;
  tags?: string[] | undefined;
  until?: string | undefined;
}

/**
 * Resolve a partial run ID to a full ID by checking prefix match
 *
 * Supports Git-style partial ID matching (e.g., "k3m" matches "k3m9x2p")
 */
const resolveRunId = async (
  storage: HistoryStorage,
  partialId: string,
): Promise<null | string> => {
  // First try exact match
  const exactRun = await storage.loadRun(partialId);
  if (exactRun) {
    return partialId;
  }

  // Query all runs to find a prefix match
  const allRuns = await storage.queryRuns({});

  const prefixMatch = allRuns.find((run) => run.id.startsWith(partialId));
  if (prefixMatch) {
    return prefixMatch.id;
  }

  return null;
};

/**
 * Handle the clean subcommand
 */
export const handleCleanCommand = async (
  context: CliContext,
  options: HistoryCleanOptions,
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
export const handleCompareCommand = async (
  context: CliContext,
  options: HistoryCompareOptions,
): Promise<number> => {
  try {
    const [run1, run2] = await Promise.all([
      context.historyStorage.loadRun(options.runId1),
      context.historyStorage.loadRun(options.runId2),
    ]);

    if (!run1) {
      console.error(`Run not found: ${options.runId1}`);
      return 1;
    }

    if (!run2) {
      console.error(`Run not found: ${options.runId2}`);
      return 1;
    }

    // Compare using service
    const comparisonService = new ComparisonService();
    const result = comparisonService.compareRuns(run1, run2);

    // Format output
    const formatter = new HistoryCompareFormatter();
    const output =
      options.format === 'json'
        ? formatter.formatJson(result)
        : formatter.formatHuman(result);

    console.log(output);
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
export const handleExportCommand = async (
  context: CliContext,
  options: HistoryExportOptions,
): Promise<number> => {
  try {
    const format = options.format || 'json';

    // Build query for export
    const query = {
      ...(options.since && { since: parseDate(options.since) }),
      ...(options.until && { until: parseDate(options.until) }),
    } as Partial<HistoryQuery>;

    const exportData = await context.historyStorage.export(format, query);

    // Write to file
    const fs = await import('node:fs/promises');
    await fs.writeFile(options.outputPath, exportData, 'utf8');
    if (!options.quiet) {
      console.log(`Exported history to ${options.outputPath}`);
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
export const handleListCommand = async (
  context: CliContext,
  options: HistoryListOptions,
): Promise<number> => {
  try {
    // Query runs using service
    const queryService = new HistoryQueryService(context.historyStorage);
    const runs = await queryService.queryWithDateParsing(options);

    // Transform to result format
    const result = {
      runs: runs.map((run) => ({
        duration: run.duration,
        id: run.id,
        startTime: run.startTime,
        summary: run.summary,
      })),
      totalCount: runs.length,
    };

    // Format output
    const formatter = new HistoryListFormatter();
    let output: string;

    if (options.format === 'json') {
      output = formatter.formatJson(result);
    } else if (options.format === 'csv') {
      output = formatter.formatCsv(result);
    } else {
      output = formatter.formatHuman(result);
    }

    console.log(output);
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
export const handleShowCommand = async (
  context: CliContext,
  options: HistoryShowOptions,
): Promise<number> => {
  try {
    // Resolve partial ID to full ID
    const fullRunId = await resolveRunId(context.historyStorage, options.runId);

    if (!fullRunId) {
      console.error(`Run not found: ${options.runId}`);
      return 1;
    }

    const run = await context.historyStorage.loadRun(fullRunId);

    if (!run) {
      console.error(`Run not found: ${options.runId}`);
      return 1;
    }

    // Format output
    const formatter = new HistoryShowFormatter();
    const output =
      options.format === 'json'
        ? formatter.formatJson(run)
        : formatter.formatHuman(run);

    console.log(output);
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
export const handleTrendsCommand = async (
  context: CliContext,
  options: HistoryTrendsOptions,
): Promise<number> => {
  try {
    // Query runs using service
    const queryService = new HistoryQueryService(context.historyStorage);
    const runs = await queryService.queryWithDateParsing({
      limit: options.all ? undefined : options.limit,
      pattern: options.pattern,
      since: options.since,
      tags: options.tags,
      until: options.until,
    });

    if (runs.length === 0) {
      if (!options.quiet) {
        console.log('No historical data found matching criteria');
      }
      return 0;
    }

    // Analyze trends using service
    const analysisService = new TrendAnalysisService();
    const result = analysisService.analyzeTrends(runs);

    // Format output
    const formatter = new HistoryTrendsFormatter();
    const output =
      options.format === 'json'
        ? formatter.formatJson(result)
        : formatter.formatHuman(result);

    if (!options.quiet || options.format !== 'human') {
      console.log(output);
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to show trends:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};
