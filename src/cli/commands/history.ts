/**
 * ModestBench History Command
 *
 * View and manage benchmark run history with subcommands for
 * listing, showing, comparing, and cleaning historical data.
 */

import type { CliContext } from '../index.js';

/**
 * History command arguments interface
 */
interface HistoryArguments {
  _: string[]; // Subcommand and positional args
  id?: string;
  id1?: string;
  id2?: string;
  since?: string;
  until?: string;
  pattern?: string;
  tags?: string[];
  limit?: number;
  format?: 'human' | 'json' | 'csv';
  output?: string;
  maxAge?: number;
  maxRuns?: number;
  maxSize?: number;
  confirm?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export const historyCommand = {
  builder: (yargs: any) => {
    return yargs
      .command(
        'list',
        'List benchmark runs',
        (yargs: any) => {
          return yargs
            .option('since', {
              type: 'string',
              description:
                'Show runs since date (ISO 8601 or relative like "1 week ago")',
            })
            .option('until', {
              type: 'string',
              description:
                'Show runs until date (ISO 8601 or relative like "1 day ago")',
            })
            .option('pattern', {
              type: 'string',
              description: 'Filter by benchmark name pattern',
            })
            .option('tags', {
              type: 'array',
              description: 'Filter by tags',
            })
            .option('limit', {
              type: 'number',
              description: 'Maximum number of results',
              default: 20,
            })
            .option('format', {
              type: 'string',
              choices: ['human', 'json', 'csv'],
              description: 'Output format',
              default: 'human',
            });
        },
        () => {}
      )
      .command(
        'show <id>',
        'Show detailed run results',
        (yargs: any) => {
          return yargs
            .positional('id', {
              describe: 'Run ID to show',
              type: 'string',
              demandOption: true,
            })
            .option('format', {
              type: 'string',
              choices: ['human', 'json'],
              description: 'Output format',
              default: 'human',
            });
        },
        () => {}
      )
      .command(
        'compare <id1> <id2>',
        'Compare two benchmark runs',
        (yargs: any) => {
          return yargs
            .positional('id1', {
              describe: 'First run ID',
              type: 'string',
              demandOption: true,
            })
            .positional('id2', {
              describe: 'Second run ID',
              type: 'string',
              demandOption: true,
            })
            .option('format', {
              type: 'string',
              choices: ['human', 'json'],
              description: 'Output format',
              default: 'human',
            });
        },
        () => {}
      )
      .command(
        'clean',
        'Clean old history data',
        (yargs: any) => {
          return yargs
            .option('max-age', {
              type: 'number',
              description: 'Maximum age in milliseconds',
            })
            .option('max-runs', {
              type: 'number',
              description: 'Maximum number of runs to keep',
            })
            .option('max-size', {
              type: 'number',
              description: 'Maximum storage size in bytes',
            })
            .option('confirm', {
              type: 'boolean',
              description: 'Skip confirmation prompt',
              default: false,
            });
        },
        () => {}
      )
      .command(
        'export',
        'Export historical data',
        (yargs: any) => {
          return yargs
            .option('format', {
              type: 'string',
              choices: ['json', 'csv'],
              description: 'Export format',
              default: 'json',
            })
            .option('output', {
              alias: 'o',
              type: 'string',
              description: 'Output file path',
            })
            .option('since', {
              type: 'string',
              description: 'Export runs since date',
            })
            .option('until', {
              type: 'string',
              description: 'Export runs until date',
            });
        },
        () => {}
      )
      .demandCommand(1, 'You must specify a history subcommand')
      .example([
        ['$0 history list', 'List recent benchmark runs'],
        ['$0 history show abc123', 'Show detailed results for run abc123'],
        ['$0 history compare run1 run2', 'Compare two benchmark runs'],
        ['$0 history clean --max-runs 50', 'Keep only the latest 50 runs'],
        [
          '$0 history export --format csv -o results.csv',
          'Export history to CSV',
        ],
      ]);
  },

  handler: async (
    context: CliContext,
    argv: HistoryArguments
  ): Promise<number> => {
    try {
      const subcommand = argv._[0];

      switch (subcommand) {
        case 'list':
          return await handleListCommand(context, argv);
        case 'show':
          return await handleShowCommand(context, argv);
        case 'compare':
          return await handleCompareCommand(context, argv);
        case 'clean':
          return await handleCleanCommand(context, argv);
        case 'export':
          return await handleExportCommand(context, argv);
        default:
          console.error(`Unknown history subcommand: ${subcommand}`);
          return 2; // Config error
      }
    } catch (error) {
      console.error(
        'History command failed:',
        error instanceof Error ? error.message : String(error)
      );
      return 5; // Runtime error
    }
  },
};

/**
 * Handle the list subcommand
 */
async function handleListCommand(
  context: CliContext,
  argv: HistoryArguments
): Promise<number> {
  try {
    // Build query from command line arguments
    const query: any = {};

    if (argv.since) {
      query.since = parseDate(argv.since);
    }

    if (argv.until) {
      query.until = parseDate(argv.until);
    }

    if (argv.pattern) {
      query.pattern = argv.pattern;
    }

    if (argv.tags && argv.tags.length > 0) {
      query.tags = argv.tags;
    }

    if (argv.limit) {
      query.limit = argv.limit;
    }

    // Query historical runs
    const runs = await context.historyStorage.queryRuns(query);

    if (runs.length === 0) {
      if (!argv.quiet) {
        console.log('No benchmark runs found matching criteria.');
      }
      return 0;
    }

    // Display results based on format
    if (argv.format === 'json') {
      console.log(
        JSON.stringify(
          runs.map(run => ({
            id: run.id,
            startTime: run.startTime,
            duration: run.duration,
            files: run.summary.totalFiles,
            tasks: run.summary.totalTasks,
            passed: run.summary.passedTasks,
            failed: run.summary.failedTasks,
          })),
          null,
          2
        )
      );
    } else if (argv.format === 'csv') {
      console.log('id,startTime,duration,files,tasks,passed,failed');
      for (const run of runs) {
        console.log(
          `${run.id},${run.startTime.toISOString()},${run.duration},${run.summary.totalFiles},${run.summary.totalTasks},${run.summary.passedTasks},${run.summary.failedTasks}`
        );
      }
    } else {
      // Human format
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
          `  ${run.id.substring(0, 8)} - ${dateStr} (${durationStr})`
        );
        console.log(
          `    ${run.summary.totalFiles} files, ${run.summary.totalTasks} tasks: ${statusStr}`
        );
        console.log();
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to list history:',
      error instanceof Error ? error.message : String(error)
    );
    return 5;
  }
}

/**
 * Handle the show subcommand
 */
async function handleShowCommand(
  context: CliContext,
  argv: HistoryArguments
): Promise<number> {
  try {
    if (!argv.id) {
      console.error('Run ID is required for show command');
      return 2;
    }

    const run = await context.historyStorage.loadRun(argv.id);

    if (!run) {
      console.error(`Run not found: ${argv.id}`);
      return 1;
    }

    if (argv.format === 'json') {
      console.log(JSON.stringify(run, null, 2));
    } else {
      // Human format
      console.log(`Benchmark Run: ${run.id}`);
      console.log(`Date: ${run.startTime.toLocaleString()}`);
      console.log(`Duration: ${(run.duration / 1000).toFixed(1)}s`);
      console.log(
        `Environment: Node.js ${run.environment.nodeVersion} on ${run.environment.platform}`
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
      error instanceof Error ? error.message : String(error)
    );
    return 5;
  }
}

/**
 * Handle the compare subcommand
 */
async function handleCompareCommand(
  context: CliContext,
  argv: HistoryArguments
): Promise<number> {
  try {
    if (!argv.id1 || !argv.id2) {
      console.error('Two run IDs are required for compare command');
      return 2;
    }

    const [run1, run2] = await Promise.all([
      context.historyStorage.loadRun(argv.id1),
      context.historyStorage.loadRun(argv.id2),
    ]);

    if (!run1) {
      console.error(`Run not found: ${argv.id1}`);
      return 1;
    }

    if (!run2) {
      console.error(`Run not found: ${argv.id2}`);
      return 1;
    }

    if (argv.format === 'json') {
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
        `  Files: ${run1.summary.totalFiles} vs ${run2.summary.totalFiles}`
      );
      console.log(
        `  Tasks: ${run1.summary.totalTasks} vs ${run2.summary.totalTasks}`
      );
      console.log(
        `  Passed: ${run1.summary.passedTasks} vs ${run2.summary.passedTasks}`
      );
      console.log(
        `  Failed: ${run1.summary.failedTasks} vs ${run2.summary.failedTasks}`
      );

      // TODO: Add detailed performance comparison
      console.log();
      console.log('Note: Detailed performance comparison not yet implemented.');
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to compare runs:',
      error instanceof Error ? error.message : String(error)
    );
    return 5;
  }
}

/**
 * Handle the clean subcommand
 */
async function handleCleanCommand(
  context: CliContext,
  argv: HistoryArguments
): Promise<number> {
  try {
    // Build retention policy from arguments
    const policy: any = {};

    if (argv.maxAge) policy.maxAge = argv.maxAge;
    if (argv.maxRuns) policy.maxRuns = argv.maxRuns;
    if (argv.maxSize) policy.maxSize = argv.maxSize;

    if (Object.keys(policy).length === 0) {
      console.error(
        'At least one cleanup criterion must be specified (--max-age, --max-runs, or --max-size)'
      );
      return 2;
    }

    // Show what would be cleaned unless confirmed
    if (!argv.confirm) {
      console.log(
        'This will clean up historical data based on the following policy:'
      );
      if (policy.maxAge)
        console.log(`  - Remove runs older than ${policy.maxAge}ms`);
      if (policy.maxRuns)
        console.log(`  - Keep only the latest ${policy.maxRuns} runs`);
      if (policy.maxSize)
        console.log(
          `  - Remove runs until storage is under ${policy.maxSize} bytes`
        );
      console.log();
      console.log('Use --confirm to proceed with cleanup.');
      return 0;
    }

    // Perform cleanup
    const result = await context.historyStorage.cleanup(policy);

    if (!argv.quiet) {
      console.log(`Cleanup completed:`);
      console.log(`  Removed ${result.removedRuns} run(s)`);
      console.log(`  Freed ${formatBytes(result.freedBytes)} of storage`);

      if (argv.verbose && result.removedFiles.length > 0) {
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
      error instanceof Error ? error.message : String(error)
    );
    return 5;
  }
}

/**
 * Handle the export subcommand
 */
async function handleExportCommand(
  context: CliContext,
  argv: HistoryArguments
): Promise<number> {
  try {
    const format = argv.format || 'json';

    // Build query for export
    const query: any = {};
    if (argv.since) query.since = parseDate(argv.since);
    if (argv.until) query.until = parseDate(argv.until);

    const exportData = await context.historyStorage.export(
      format as 'json' | 'csv',
      query
    );

    if (argv.output) {
      // Write to file
      const fs = await import('node:fs/promises');
      await fs.writeFile(argv.output, exportData, 'utf8');
      if (!argv.quiet) {
        console.log(`Exported history to ${argv.output}`);
      }
    } else {
      // Write to stdout
      console.log(exportData);
    }

    return 0;
  } catch (error) {
    console.error(
      'Failed to export history:',
      error instanceof Error ? error.message : String(error)
    );
    return 5;
  }
}

/**
 * Parse date string (ISO 8601 or relative)
 */
function parseDate(dateStr: string): Date {
  // Try parsing as ISO 8601 first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // TODO: Parse relative dates like "1 week ago", "3 days ago", etc.
  // For now, just return current date
  console.warn(`Could not parse date "${dateStr}", using current date`);
  return new Date();
}

/**
 * Format bytes in human-readable format
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
