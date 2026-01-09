/**
 * ModestBench Baseline Command
 *
 * Manage performance baselines for regression testing and budget comparison.
 */

import { relative } from 'node:path';

import type { BenchmarkRun } from '../../types/index.js';
import type { CliContext } from '../index.js';

import { BaselineStorageService } from '../../services/baseline-storage.js';
import { createTaskId } from '../../types/index.js';
import {
  formatDuration,
  formatOpsPerSecond,
} from '../../utils/reporter-utils.js';

/**
 * Options for baseline analyze command
 */
interface BaselineAnalyzeOptions extends BaselineBaseOptions {
  confidence?: number | undefined;
  runs?: number | undefined;
}

/**
 * Base options shared by all baseline subcommands
 */
interface BaselineBaseOptions {
  cwd?: string;
  quiet?: boolean | undefined;
  verbose?: boolean | undefined;
}

/**
 * Options for baseline delete command
 */
interface BaselineDeleteOptions extends BaselineBaseOptions {
  name: string;
}

/**
 * Options for baseline list command
 */
interface BaselineListOptions extends BaselineBaseOptions {
  format?: 'human' | 'json' | undefined;
}

/**
 * Options for baseline set command
 */
interface BaselineSetOptions extends BaselineBaseOptions {
  branch?: string | undefined;
  commit?: string | undefined;
  default?: boolean | undefined;
  name: string;
  runId?: string | undefined;
}

/**
 * Options for baseline show command
 */
interface BaselineShowOptions extends BaselineBaseOptions {
  format?: 'human' | 'json' | undefined;
  name: string;
}

/**
 * Format date in readable format
 */
const formatDate = (date: Date): string => {
  return date.toISOString().replace('T', ' ').substring(0, 19);
};

/**
 * Calculate mean of an array of numbers
 */
const calculateMean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/**
 * Calculate standard deviation
 */
const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
};

/**
 * Get z-score for confidence level
 */
const getZScore = (confidence: number): number => {
  // Common confidence levels
  if (confidence >= 0.99) {
    return 2.576;
  } // 99%
  if (confidence >= 0.98) {
    return 2.326;
  } // 98%
  if (confidence >= 0.95) {
    return 1.96;
  } // 95%
  if (confidence >= 0.9) {
    return 1.645;
  } // 90%
  if (confidence >= 0.85) {
    return 1.44;
  } // 85%
  if (confidence >= 0.8) {
    return 1.282;
  } // 80%
  return 1.96; // Default to 95%
};

/**
 * Handle the set subcommand
 */
export const handleSetCommand = async (
  context: CliContext,
  options: BaselineSetOptions,
): Promise<number> => {
  try {
    const storage = new BaselineStorageService(options.cwd);

    // Get the benchmark run
    let run: BenchmarkRun | null = null;

    if (options.runId) {
      // Load specific run by ID
      run = await context.historyStorage.loadRun(options.runId);
      if (!run) {
        console.error(`Error: Run with ID "${options.runId}" not found`);
        return 1;
      }
    } else {
      // Get most recent run
      const runs = await context.historyStorage.queryRuns({ limit: 1 });
      if (runs.length === 0) {
        console.error(
          'Error: No benchmark runs found. Run benchmarks first with "modestbench run"',
        );
        return 1;
      }
      run = runs[0]!;
    }

    // Save baseline
    await storage.saveBaseline(options.name, run, {
      branch: options.branch,
      commit: options.commit,
    });

    // Set as default if requested
    if (options.default) {
      await storage.setDefault(options.name);
    }

    if (!options.quiet) {
      console.log(`✓ Baseline "${options.name}" saved successfully`);
      console.log(`  Run ID: ${run.id}`);
      if (options.commit) {
        console.log(`  Commit: ${options.commit}`);
      }
      if (options.branch) {
        console.log(`  Branch: ${options.branch}`);
      }
      if (options.default) {
        console.log(`  Set as default baseline`);
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to save baseline:',
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
  options: BaselineListOptions,
): Promise<number> => {
  try {
    const storage = new BaselineStorageService(options.cwd);
    const baselines = await storage.listBaselines();
    const defaultBaseline = await storage.getDefault();

    if (baselines.length === 0) {
      if (!options.quiet) {
        console.log('No baselines found');
      }
      return 0;
    }

    if (options.format === 'json') {
      console.log(
        JSON.stringify(
          {
            baselines: baselines.map((b) => ({
              ...b,
              date: b.date.toISOString(),
              isDefault: b.name === defaultBaseline,
            })),
            default: defaultBaseline,
          },
          null,
          2,
        ),
      );
    } else {
      // Human-readable format
      if (!options.quiet) {
        console.log(`\nBaselines (${baselines.length}):\n`);
      }

      for (const baseline of baselines) {
        const isDefault = baseline.name === defaultBaseline;
        const defaultMarker = isDefault ? ' (default)' : '';
        console.log(`  ${baseline.name}${defaultMarker}`);
        console.log(`    Date:    ${formatDate(baseline.date)}`);
        console.log(`    Run ID:  ${baseline.runId}`);
        if (baseline.commit) {
          console.log(`    Commit:  ${baseline.commit.substring(0, 8)}`);
        }
        if (baseline.branch) {
          console.log(`    Branch:  ${baseline.branch}`);
        }
        console.log(`    Tasks:   ${Object.keys(baseline.summary).length}`);
        console.log();
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to list baselines:',
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
  options: BaselineShowOptions,
): Promise<number> => {
  try {
    const storage = new BaselineStorageService(options.cwd);
    const baseline = await storage.getBaseline(options.name);

    if (!baseline) {
      console.error(`Error: Baseline "${options.name}" not found`);
      return 1;
    }

    const defaultBaseline = await storage.getDefault();
    const isDefault = baseline.name === defaultBaseline;

    if (options.format === 'json') {
      console.log(
        JSON.stringify(
          {
            ...baseline,
            date: baseline.date.toISOString(),
            isDefault,
          },
          null,
          2,
        ),
      );
    } else {
      // Human-readable format
      console.log(
        `\nBaseline: ${baseline.name}${isDefault ? ' (default)' : ''}\n`,
      );
      console.log(`  Date:    ${formatDate(baseline.date)}`);
      console.log(`  Run ID:  ${baseline.runId}`);
      if (baseline.commit) {
        console.log(`  Commit:  ${baseline.commit}`);
      }
      if (baseline.branch) {
        console.log(`  Branch:  ${baseline.branch}`);
      }
      console.log();

      // Show task summary
      const tasks = Object.entries(baseline.summary);
      if (tasks.length > 0) {
        console.log(`  Tasks (${tasks.length}):\n`);
        for (const [taskId, data] of tasks) {
          console.log(`    ${taskId}`);
          console.log(`      Mean:    ${formatDuration(data.mean)}`);
          console.log(
            `      Ops/sec: ${formatOpsPerSecond(data.opsPerSecond)}`,
          );
          if (data.p99) {
            console.log(`      P99:     ${formatDuration(data.p99)}`);
          }
          console.log();
        }
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to show baseline:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};

/**
 * Handle the delete subcommand
 */
export const handleDeleteCommand = async (
  context: CliContext,
  options: BaselineDeleteOptions,
): Promise<number> => {
  try {
    const storage = new BaselineStorageService(options.cwd);

    // Check if baseline exists
    const baseline = await storage.getBaseline(options.name);
    if (!baseline) {
      console.error(`Error: Baseline "${options.name}" not found`);
      return 1;
    }

    // Delete it
    await storage.deleteBaseline(options.name);

    if (!options.quiet) {
      console.log(`✓ Baseline "${options.name}" deleted successfully`);
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to delete baseline:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};

/**
 * Handle the analyze subcommand
 */
export const handleAnalyzeCommand = async (
  context: CliContext,
  options: BaselineAnalyzeOptions,
): Promise<number> => {
  try {
    const runLimit = options.runs || 10;
    const confidence = options.confidence || 0.95;

    // Validate confidence
    if (confidence < 0.5 || confidence > 0.999) {
      console.error('Error: Confidence must be between 0.5 and 0.999');
      return 1;
    }

    // Query recent runs
    const runs = await context.historyStorage.queryRuns({ limit: runLimit });

    if (runs.length < 2) {
      console.error(
        `Error: Insufficient history. Found ${runs.length} run(s), need at least 2 to analyze trends.`,
      );
      return 1;
    }

    // Collect metrics per task
    const taskMetrics = new Map<
      string,
      { means: number[]; opsPerSec: number[]; p99s: number[] }
    >();

    for (const run of runs) {
      for (const file of run.files) {
        for (const suite of file.suites) {
          for (const task of suite.tasks) {
            // Normalize file path to be relative to cwd for consistency with budgets
            const relativePath = relative(
              options.cwd || process.cwd(),
              file.filePath,
            );
            const taskId = createTaskId(relativePath, suite.name, task.name);

            if (!taskMetrics.has(taskId)) {
              taskMetrics.set(taskId, { means: [], opsPerSec: [], p99s: [] });
            }

            const metrics = taskMetrics.get(taskId)!;
            metrics.means.push(task.mean);
            metrics.opsPerSec.push(task.opsPerSecond);
            if (task.p99) {
              metrics.p99s.push(task.p99);
            }
          }
        }
      }
    }

    // Calculate suggested budgets (flat format first)
    const zScore = getZScore(confidence);
    const flatBudgets: Record<string, { absolute: Record<string, unknown> }> =
      {};

    for (const [taskId, metrics] of taskMetrics.entries()) {
      const avgMean = calculateMean(metrics.means);
      const stdDevMean = calculateStdDev(metrics.means);
      const suggestedMaxTime = Math.ceil(avgMean + zScore * stdDevMean);

      const avgOps = calculateMean(metrics.opsPerSec);
      const stdDevOps = calculateStdDev(metrics.opsPerSec);
      const suggestedMinOps = Math.floor(
        Math.max(0, avgOps - zScore * stdDevOps),
      );

      flatBudgets[taskId] = {
        absolute: {
          maxTime: suggestedMaxTime,
          ...(suggestedMinOps > 0 && { minOpsPerSec: suggestedMinOps }),
        },
      };

      // Add p99 if available
      if (metrics.p99s.length > 0) {
        const avgP99 = calculateMean(metrics.p99s);
        const stdDevP99 = calculateStdDev(metrics.p99s);
        const suggestedMaxP99 = Math.ceil(avgP99 + zScore * stdDevP99);
        flatBudgets[taskId].absolute.maxP99 = suggestedMaxP99;
      }
    }

    // Convert flat budgets to nested format for user config
    const nestedBudgets: Record<
      string,
      Record<string, Record<string, unknown>>
    > = {};

    for (const [taskId, budget] of Object.entries(flatBudgets)) {
      // Parse taskId format: "file/suite/task"
      const lastSlash = taskId.lastIndexOf('/');
      const secondLastSlash = taskId.lastIndexOf('/', lastSlash - 1);

      const file = taskId.substring(0, secondLastSlash);
      const suite = taskId.substring(secondLastSlash + 1, lastSlash);
      const task = taskId.substring(lastSlash + 1);

      if (!nestedBudgets[file]) {
        nestedBudgets[file] = {};
      }
      if (!nestedBudgets[file][suite]) {
        nestedBudgets[file][suite] = {};
      }
      nestedBudgets[file][suite][task] = budget;
    }

    // Output results
    if (!options.quiet) {
      console.log(
        `\nAnalyzed ${runs.length} run(s) with ${confidence * 100}% confidence\n`,
      );
      console.log('Suggested budget configuration:\n');
    }

    const config = {
      budgetMode: 'fail',
      budgets: nestedBudgets,
    };

    console.log(JSON.stringify(config, null, 2));

    if (!options.quiet) {
      const confidencePercent = confidence * 100;
      console.log('\n' + '='.repeat(70));
      console.log('How these budget values were calculated:');
      console.log('='.repeat(70));
      console.log();
      console.log(
        `Using ${confidencePercent}% confidence level with ${runs.length} historical runs:`,
      );
      console.log();
      console.log(
        `  • maxTime      = mean + (${confidencePercent}% z-score × std deviation)`,
      );
      console.log(
        `  • minOpsPerSec = mean - (${confidencePercent}% z-score × std deviation)`,
      );
      console.log(
        `  • maxP99       = mean + (${confidencePercent}% z-score × std deviation)`,
      );
      console.log();
      console.log(
        `This means each budget is statistically expected to pass ${confidencePercent}% of`,
      );
      console.log(
        'the time based on your historical benchmark data. The higher the',
      );
      console.log(
        'confidence level, the more lenient the budgets (less likely to fail).',
      );
      console.log();
      console.log('To adjust strictness:');
      console.log(
        '  • Lower confidence (e.g., 0.90) = stricter budgets, catch smaller regressions',
      );
      console.log(
        '  • Higher confidence (e.g., 0.99) = looser budgets, reduce false positives',
      );
      console.log();
      console.log(
        'Copy the above configuration into your modestbench.config.json file.',
      );
      console.log(
        'You may adjust the values based on your performance requirements.',
      );
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to analyze history:',
      error instanceof Error ? error.message : String(error),
    );
    return 5;
  }
};
