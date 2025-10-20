#!/usr/bin/env node
/**
 * ModestBench CLI Entry Point
 *
 * Command-line interface using yargs for command parsing and routing. Provides
 * global options, help generation, and dependency injection setup.
 */

import type { Argv } from 'yargs';

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import type {
  BenchmarkEngine,
  ConfigurationManager,
  ErrorManager,
  HistoryStorage,
  ProgressManager,
  ReporterRegistry,
} from '../types/index.js';

import { bootstrap } from '../bootstrap.js';
import {
  CsvReporter,
  HumanReporter,
  JsonReporter,
} from '../reporters/index.js';
// Import commands
import { handleHistoryCommand as historyCommand } from './commands/history.js';
import { handleInitCommand as initCommand } from './commands/init.js';
import { handleRunCommand as runCommand } from './commands/run.js';

/**
 * CLI context with initialized services
 */
export interface CliContext {
  readonly abortController: AbortController;
  readonly configManager: ConfigurationManager;
  readonly engine: BenchmarkEngine;
  readonly errorManager: ErrorManager;
  readonly historyStorage: HistoryStorage;
  readonly options: GlobalOptions;
  readonly progressManager: ProgressManager;
  readonly reporterRegistry: ReporterRegistry;
}

/**
 * Global CLI options shared across all commands
 */
interface GlobalOptions {
  /** Configuration file path */
  config?: string | undefined;
  /** Working directory */
  cwd: string;
  /** JSON output for machine parsing */
  json: boolean;
  /** Disable colored output */
  noColor: boolean;
  /** Enable verbose output */
  verbose: boolean;
}

/**
 * Exit codes for the CLI
 */
export const ExitCodes = {
  BENCHMARK_FAILURES: 1,
  CONFIG_ERROR: 2,
  DISCOVERY_ERROR: 3,
  RUNTIME_ERROR: 5,
  SUCCESS: 0,
  UNKNOWN_ERROR: 99,
  VALIDATION_ERROR: 4,
} as const;

/**
 * Initialize and run the CLI
 */
export const cli = (argv?: string[]): void => {
  const abortController = new AbortController();
  setupSignalHandlers(abortController);
  main(argv, abortController).catch((error) => {
    console.error('CLI error:', error);
    process.exit(ExitCodes.UNKNOWN_ERROR);
  });
};

/**
 * Main CLI entry point
 */
export const main = async (
  argv?: string[],
  abortController?: AbortController,
): Promise<void> => {
  try {
    const args = argv || hideBin(process.argv);

    const cli = yargs(args);

    // Configure global options and commands
    await cli
      .option('config', {
        alias: 'c',
        description: 'Path to configuration file',
        global: true,
        type: 'string',
      })
      .option('verbose', {
        alias: 'v',
        default: false,
        description: 'Enable verbose output',
        global: true,
        type: 'boolean',
      })
      .option('no-color', {
        default: false,
        description: 'Disable colored output',
        global: true,
        type: 'boolean',
      })
      .option('progress', {
        default: true,
        description: 'Show animated progress bar',
        global: true,
        type: 'boolean',
      })
      .option('json', {
        default: false,
        description: 'Output results in JSON format',
        global: true,
        type: 'boolean',
      })
      .option('cwd', {
        default: process.cwd(),
        description: 'Working directory',
        global: true,
        type: 'string',
      })
      .help()
      .alias('help', 'h')
      .version()
      .alias('version', 'V')
      .strict()
      .demandCommand(1, 'You must specify a command')
      .recommendCommands()
      .completion()
      .wrap(Math.min(120, cli.terminalWidth()))
      .command(
        'run [pattern..]',
        'Run benchmark files',
        (yargs) => {
          return yargs
            .positional('pattern', {
              array: true,
              default: [],
              describe:
                'File paths, directory paths, or glob patterns for benchmark files',
              type: 'string',
            })
            .option('config', {
              alias: 'c',
              description: 'Path to configuration file',
              type: 'string',
            })
            .option('reporters', {
              alias: 'r',
              coerce: (value: string | string[]) => {
                // Handle comma-separated values
                if (Array.isArray(value)) {
                  return value.flatMap((v) =>
                    v.split(',').map((s) => s.trim()),
                  );
                }
                return value.split(',').map((s) => s.trim());
              },
              default: ['human'],
              description: 'Output reporters to use (human,json,csv)',
              type: 'array',
            })
            .option('output', {
              alias: 'o',
              description: 'Output directory for reports',
              type: 'string',
            })
            .option('iterations', {
              alias: 'i',
              description: 'Number of iterations per benchmark',
              type: 'number',
            })
            .option('time', {
              alias: 't',
              description: 'Time budget per benchmark in milliseconds',
              type: 'number',
            })
            .option('warmup', {
              alias: 'w',
              description: 'Number of warmup iterations',
              type: 'number',
            })
            .option('limit-by', {
              choices: ['time', 'iterations', 'any', 'all'],
              description:
                'How to limit benchmarks: time (time budget), iterations (sample count), any (either threshold), all (both thresholds)',
              type: 'string',
            })
            .option('bail', {
              alias: 'b',
              default: false,
              description: 'Stop on first failure',
              type: 'boolean',
            })
            .option('exclude', {
              coerce: (value: string | string[]) => {
                // Handle comma-separated values
                if (Array.isArray(value)) {
                  return value.flatMap((v) =>
                    v.split(',').map((s) => s.trim()),
                  );
                }
                return value.split(',').map((s) => s.trim());
              },
              description: 'Exclude patterns (comma-separated)',
              type: 'array',
            })
            .option('timeout', {
              description: 'Timeout per benchmark in milliseconds',
              type: 'number',
            })
            .option('quiet', {
              alias: 'q',
              default: false,
              description: 'Minimal output',
              type: 'boolean',
            })
            .option('tags', {
              coerce: (value: string | string[]) => {
                // Handle comma-separated values
                if (Array.isArray(value)) {
                  return value.flatMap((v) =>
                    v.split(',').map((s) => s.trim()),
                  );
                }
                return value.split(',').map((s) => s.trim());
              },
              description: 'Include only benchmarks with any of these tags',
              type: 'array',
            })
            .option('exclude-tags', {
              coerce: (value: string | string[]) => {
                // Handle comma-separated values
                if (Array.isArray(value)) {
                  return value.flatMap((v) =>
                    v.split(',').map((s) => s.trim()),
                  );
                }
                return value.split(',').map((s) => s.trim());
              },
              description: 'Exclude benchmarks with any of these tags',
              type: 'array',
            })
            .example([
              ['$0 run', 'Run benchmarks in current directory and bench/'],
              ['$0 run benchmarks/', 'Run all benchmarks in a directory'],
              ['$0 run src/perf/', 'Run benchmarks in specific directory'],
              ['$0 run "src/**/*.bench.js"', 'Run specific glob pattern'],
              ['$0 run file1.bench.js file2.bench.js', 'Run specific files'],
              ['$0 run benchmarks/ tests/perf/', 'Run multiple directories'],
              ['$0 run --reporters json,csv', 'Use multiple reporters'],
              ['$0 run --iterations 1000', 'Set iteration count'],
              ['$0 run --bail', 'Stop on first failure'],
            ]);
        },
        async (argv) => {
          const context = await createCliContext(argv, abortController!);
          const exitCode = await runCommand(context, {
            bail: argv.bail,
            config: argv.config,
            cwd: argv.cwd,
            exclude: argv.exclude,
            excludeTags: argv['exclude-tags'],
            iterations: argv.iterations,
            json: argv.json,
            noColor: argv.noColor,
            outputDir: argv.output,
            pattern: argv.pattern,
            progress: argv.progress,
            quiet: argv.quiet,
            reporters: argv.reporters,
            tags: argv.tags,
            time: argv.time,
            timeout: argv.timeout,
            verbose: argv.verbose,
            warmup: argv.warmup,
          });
          process.exit(exitCode);
        },
      )
      .command(
        'history <subcommand> [args..]',
        'View and manage benchmark history',
        (yargs) => {
          return yargs
            .positional('subcommand', {
              choices: [
                'list',
                'show',
                'compare',
                'trends',
                'clean',
                'export',
              ] as const,
              demandOption: true,
              describe: 'History subcommand',
              type: 'string',
            })
            .positional('args', {
              array: true,
              describe: 'Additional arguments for the subcommand',
              type: 'string',
            })
            .option('since', {
              description:
                'Show runs since date (ISO 8601 or relative like "1 week ago")',
              type: 'string',
            })
            .option('until', {
              description:
                'Show runs until date (ISO 8601 or relative like "1 day ago")',
              type: 'string',
            })
            .option('pattern', {
              description: 'Filter by benchmark name pattern',
              type: 'string',
            })
            .option('tags', {
              description: 'Filter by tags',
              type: 'array',
            })
            .option('limit', {
              default: 10,
              description: 'Maximum number of results',
              type: 'number',
            })
            .option('format', {
              choices: ['human', 'json', 'csv'] as const,
              default: 'human' as const,
              description: 'Output format',
              type: 'string',
            })
            .option('maxAge', {
              description: 'Maximum age in days for cleanup',
              type: 'number',
            })
            .option('maxRuns', {
              description: 'Maximum number of runs to keep',
              type: 'number',
            })
            .option('maxSize', {
              description: 'Maximum storage size in bytes',
              type: 'number',
            })
            .option('confirm', {
              default: false,
              description: 'Confirm cleanup operations',
              type: 'boolean',
            })
            .option('output', {
              description: 'Output file path',
              type: 'string',
            })
            .example([
              ['$0 history list', 'List recent benchmark runs'],
              ['$0 history show <run-id>', 'Show detailed results for run'],
              ['$0 history compare <run-id1> <run-id2>', 'Compare two runs'],
              ['$0 history trends [pattern]', 'Show performance trends'],
              ['$0 history clean --max-runs 50', 'Keep only latest 50 runs'],
              ['$0 history export --format csv', 'Export to CSV'],
            ]);
        },
        async (argv) => {
          const context = await createCliContext(argv, abortController!);
          const exitCode = await historyCommand(context, {
            args: argv.args,
            confirm: argv.confirm,
            cwd: argv.cwd,
            format: argv.format,
            limit: argv.limit,
            maxAge: argv.maxAge,
            maxRuns: argv.maxRuns,
            maxSize: argv.maxSize,
            outputDir: argv.output,
            pattern: argv.pattern,
            quiet: Boolean(argv.quiet),
            since: argv.since,
            subcommand: argv.subcommand,
            tags: argv.tags as string[] | undefined,
            until: argv.until,
            verbose: argv.verbose,
          });
          process.exit(exitCode);
        },
      )
      .command(
        'init [type]',
        'Initialize a new benchmark project',
        (yargs) => {
          return yargs
            .positional('type', {
              choices: ['basic', 'advanced', 'library'] as const,
              default: 'basic' as const,
              describe: 'Type of project to initialize',
              type: 'string',
            })
            .option('examples', {
              default: true,
              description: 'Include example benchmark files',
              type: 'boolean',
            })
            .option('config-type', {
              choices: ['json', 'yaml', 'js', 'ts'] as const,
              default: 'json' as const,
              description: 'Configuration file format',
              type: 'string',
            })
            .option('force', {
              default: false,
              description: 'Overwrite existing files',
              type: 'boolean',
            })
            .option('yes', {
              alias: 'y',
              default: false,
              description: 'Accept all prompts automatically',
              type: 'boolean',
            })
            .option('quiet', {
              alias: 'q',
              default: false,
              description: 'Minimal output',
              type: 'boolean',
            })
            .example([
              ['$0 init', 'Initialize a basic project'],
              [
                '$0 init advanced --config-type ts',
                'Initialize advanced project with TypeScript config',
              ],
              [
                '$0 init library --no-examples',
                'Initialize library project without examples',
              ],
            ]);
        },
        async (argv) => {
          const context = await createCliContext(argv, abortController!);
          const exitCode = await initCommand(context, {
            configType: argv['config-type'],
            cwd: argv.cwd,
            examples: argv.examples,
            force: argv.force,
            quiet: Boolean(argv.quiet),
            type: argv.type,
            verbose: argv.verbose,
            yes: argv.yes,
          });
          process.exit(exitCode);
        },
      )
      .fail((msg: string, err: Error, yargsInstance: Argv) => {
        if (err) {
          console.error('Error:', err.message);
          if (process.env.DEBUG) {
            console.error(err.stack);
          }
          process.exit(ExitCodes.RUNTIME_ERROR);
        } else {
          console.error(msg);
          console.error();
          yargsInstance.showHelp();
          process.exit(ExitCodes.CONFIG_ERROR);
        }
      })
      .parse();
  } catch (error) {
    console.error(
      'Unexpected error:',
      error instanceof Error ? error.message : String(error),
    );
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(ExitCodes.UNKNOWN_ERROR);
  }
};

/**
 * Create CLI context with dependency injection
 */
const createCliContext = async (
  options: GlobalOptions,
  abortController: AbortController,
): Promise<CliContext> => {
  try {
    const engine = bootstrap();

    // Register built-in reporters
    engine.registerReporter(
      'human',
      new HumanReporter({
        color: !options.noColor,
        verbose: options.verbose,
      }),
    );

    engine.registerReporter(
      'json',
      new JsonReporter({
        prettyPrint: true,
      }),
    );

    engine.registerReporter(
      'csv',
      new CsvReporter({
        includeHeaders: true,
        includeMetadata: true,
      }),
    );

    return {
      abortController,
      configManager: engine.configManager,
      engine,
      errorManager: engine.errorManager,
      historyStorage: engine.historyStorage,
      options,
      progressManager: engine.progressManager,
      reporterRegistry: engine.reporterRegistry,
    };
  } catch (error) {
    console.error(
      'Failed to initialize ModestBench:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(ExitCodes.CONFIG_ERROR);
  }
};

/**
 * Handle process signals gracefully
 */
const setupSignalHandlers = (abortController: AbortController): void => {
  let abortRequested = false;

  const handleSignal = (signal: string) => {
    if (abortRequested) {
      // Second signal, force exit
      console.log(`\nReceived ${signal} again, forcing exit...`);
      process.exit(
        128 + (signal === 'SIGINT' ? 2 : signal === 'SIGQUIT' ? 3 : 15),
      );
    }

    console.log(`\nReceived ${signal}, aborting benchmarks...`);
    abortRequested = true;
    abortController.abort();

    // Give a short grace period for cleanup, then exit
    setTimeout(() => {
      console.log('\nBenchmark aborted.');
      process.exit(
        128 + (signal === 'SIGINT' ? 2 : signal === 'SIGQUIT' ? 3 : 15),
      );
    }, 100);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGQUIT', () => handleSignal('SIGQUIT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(ExitCodes.RUNTIME_ERROR);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(ExitCodes.RUNTIME_ERROR);
  });
};

// Run CLI if this file is executed directly
const scriptPath = fileURLToPath(import.meta.url);
const argPath = process.argv[1];

// Resolve both to real paths to handle symlinks (e.g. npm install ../package)
try {
  const scriptRealPath = realpathSync(scriptPath);
  const argRealPath = argPath ? realpathSync(argPath) : '';

  if (scriptRealPath === argRealPath) {
    cli();
  }
} catch {
  // If realpath fails (file doesn't exist), fall back to string comparison
  if (import.meta.url === `file://${argPath}`) {
    cli();
  }
}
