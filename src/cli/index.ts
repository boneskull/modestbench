#!/usr/bin/env node
/**
 * ModestBench CLI Entry Point
 *
 * Command-line interface using yargs for command parsing and routing.
 * Provides global options, help generation, and dependency injection setup.
 */

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

import { ModestBenchConfigurationManager } from '../config/manager.js';
import { ModestBenchEngine } from '../core/engine.js';
import { ModestBenchErrorManager } from '../core/error-manager.js';
import { BenchmarkFileLoader } from '../core/loader.js';
import { ModestBenchProgressManager } from '../progress/manager.js';
import {
  CsvReporter,
  HumanReporter,
  JsonReporter,
  ModestBenchReporterRegistry,
} from '../reporters/index.js';
import { FileHistoryStorage } from '../storage/history.js';
import { historyCommand } from './commands/history.js';
import { initCommand } from './commands/init.js';
// Import commands
import { runCommand } from './commands/run.js';
import { validateCommand } from './commands/validate.js';

/**
 * CLI context with initialized services
 */
export interface CliContext {
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
  config?: string;
  /** Working directory */
  cwd: string;
  /** JSON output for machine parsing */
  json: boolean;
  /** Disable colored output */
  noColor: boolean;
  /** Verbosity level (0=quiet, 1=normal, 2=verbose, 3=debug) */
  verbose: number;
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
export function cli(argv?: string[]): void {
  setupSignalHandlers();
  main(argv).catch(error => {
    console.error('CLI error:', error);
    process.exit(ExitCodes.UNKNOWN_ERROR);
  });
}

/**
 * Main CLI entry point
 */
export async function main(argv?: string[]): Promise<void> {
  try {
    const args = argv || hideBin(process.argv);

    const cli = yargs(args);

    // Configure global options and commands
    await configureGlobalOptions(cli)
      .command(
        'run [pattern..]',
        'Run benchmark files',
        (yargs: any) => runCommand.builder(yargs),
        async (argv: any) => {
          const context = await createCliContext(argv);
          const exitCode = await runCommand.handler(context, argv);
          process.exit(exitCode);
        }
      )
      .command(
        'history <subcommand> [args..]',
        'View and manage benchmark history',
        (yargs: any) => historyCommand.builder(yargs),
        async (argv: any) => {
          const context = await createCliContext(argv);
          const exitCode = await historyCommand.handler(context, argv);
          process.exit(exitCode);
        }
      )
      .command(
        'init [type]',
        'Initialize a new benchmark project',
        (yargs: any) => initCommand.builder(yargs),
        async (argv: any) => {
          const context = await createCliContext(argv);
          const exitCode = await initCommand.handler(context, argv);
          process.exit(exitCode);
        }
      )
      .command(
        'validate [pattern..]',
        'Validate benchmark files without running',
        (yargs: any) => validateCommand.builder(yargs),
        async (argv: any) => {
          const context = await createCliContext(argv);
          const exitCode = await validateCommand.handler(context, argv);
          process.exit(exitCode);
        }
      )
      .fail((msg: string, err: Error, yargs: any) => {
        if (err) {
          console.error('Error:', err.message);
          if (process.env.DEBUG) {
            console.error(err.stack);
          }
          process.exit(ExitCodes.RUNTIME_ERROR);
        } else {
          console.error(msg);
          console.error();
          yargs.showHelp();
          process.exit(ExitCodes.CONFIG_ERROR);
        }
      })
      .parse();
  } catch (error) {
    console.error(
      'Unexpected error:',
      error instanceof Error ? error.message : String(error)
    );
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(ExitCodes.UNKNOWN_ERROR);
  }
}

/**
 * Configure global CLI options
 */
function configureGlobalOptions(yargs: any): any {
  return yargs
    .option('config', {
      alias: 'c',
      description: 'Path to configuration file',
      type: 'string',
    })
    .option('verbose', {
      alias: 'v',
      default: 1,
      description: 'Increase verbosity (use multiple times for more verbose)',
      type: 'count',
    })
    .option('no-color', {
      default: false,
      description: 'Disable colored output',
      type: 'boolean',
    })
    .option('json', {
      default: false,
      description: 'Output results in JSON format',
      type: 'boolean',
    })
    .option('cwd', {
      default: process.cwd(),
      description: 'Working directory',
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
    .wrap(Math.min(120, yargs.terminalWidth()));
}

/**
 * Create CLI context with dependency injection
 */
async function createCliContext(options: GlobalOptions): Promise<CliContext> {
  try {
    // Initialize configuration manager
    const configManager = new ModestBenchConfigurationManager();

    // Initialize other services
    const fileLoader = new BenchmarkFileLoader();
    const historyStorage = new FileHistoryStorage(); // Use default options
    const progressManager = new ModestBenchProgressManager();

    // Initialize and configure reporter registry
    const reporterRegistry = new ModestBenchReporterRegistry();

    // Register built-in reporters
    reporterRegistry.register(
      'human',
      new HumanReporter({
        color: !options.noColor,
        verbose: options.verbose >= 2,
      })
    );

    reporterRegistry.register(
      'json',
      new JsonReporter({
        prettyPrint: true,
      })
    );

    reporterRegistry.register(
      'csv',
      new CsvReporter({
        includeHeaders: true,
        includeMetadata: true,
      })
    );

    // Initialize error manager
    const errorManager = new ModestBenchErrorManager();

    // Initialize the main engine
    const engine = new ModestBenchEngine({
      configManager,
      errorManager,
      fileLoader,
      historyStorage,
      progressManager,
      reporterRegistry,
    });

    return {
      configManager,
      engine,
      errorManager,
      historyStorage,
      options,
      progressManager,
      reporterRegistry,
    };
  } catch (error) {
    console.error(
      'Failed to initialize ModestBench:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(ExitCodes.CONFIG_ERROR);
  }
}

/**
 * Handle process signals gracefully
 */
function setupSignalHandlers(): void {
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    process.exit(ExitCodes.SUCCESS);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    process.exit(ExitCodes.SUCCESS);
  });

  process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(ExitCodes.RUNTIME_ERROR);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(ExitCodes.RUNTIME_ERROR);
  });
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli();
}
