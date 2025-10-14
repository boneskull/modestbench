/**
 * ModestBench Run Command
 *
 * Execute benchmark files with configuration and reporting.
 * Main entry point for running benchmarks with real-time progress.
 */

import { resolve } from 'node:path';
import type { CliContext } from '../index.js';
import { ExitCodes } from '../../types/cli.js';

/**
 * Run command arguments interface
 */
interface RunArguments {
  pattern: string[];
  config?: string;
  reporters: string[];
  output?: string;
  iterations?: number;
  time?: number;
  warmup?: number;
  bail?: boolean;
  exclude?: string[];
  timeout?: number;
  quiet?: boolean;
  verbose?: boolean;
  cwd: string;
  noColor?: boolean;
  json?: boolean;
}

export const runCommand = {
  builder: (yargs: any) => {
    return yargs
      .positional('pattern', {
        describe: 'Glob patterns for benchmark files',
        type: 'string',
        array: true,
        default: ['**/*.bench.{js,ts}'],
      })
      .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Path to configuration file',
      })
      .option('reporters', {
        alias: 'r',
        type: 'array',
        description: 'Output reporters to use (human,json,csv)',
        default: ['human'],
        coerce: (value: string | string[]) => {
          // Handle comma-separated values
          if (Array.isArray(value)) {
            return value.flatMap(v => v.split(',').map(s => s.trim()));
          }
          return value.split(',').map(s => s.trim());
        },
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output directory for reports',
      })
      .option('iterations', {
        alias: 'i',
        type: 'number',
        description: 'Number of iterations per benchmark',
      })
      .option('time', {
        alias: 't',
        type: 'number',
        description: 'Time budget per benchmark in milliseconds',
      })
      .option('warmup', {
        alias: 'w',
        type: 'number',
        description: 'Number of warmup iterations',
      })
      .option('bail', {
        alias: 'b',
        description: 'Stop on first failure',
        type: 'boolean',
        default: false,
      })
      .option('exclude', {
        type: 'array',
        description: 'Exclude patterns (comma-separated)',
        coerce: (value: string | string[]) => {
          // Handle comma-separated values
          if (Array.isArray(value)) {
            return value.flatMap(v => v.split(',').map(s => s.trim()));
          }
          return value.split(',').map(s => s.trim());
        },
      })
      .option('timeout', {
        type: 'number',
        description: 'Timeout per benchmark in milliseconds',
      })
      .option('quiet', {
        alias: 'q',
        type: 'boolean',
        description: 'Minimal output',
        default: false,
      })
      .example([
        ['$0 run', 'Run all benchmark files'],
        ['$0 run "src/**/*.bench.js"', 'Run specific pattern'],
        ['$0 run --reporters json,csv', 'Use multiple reporters'],
        ['$0 run --iterations 1000', 'Set iteration count'],
        ['$0 run --bail', 'Stop on first failure'],
      ]);
  },

  handler: async (context: CliContext, argv: RunArguments): Promise<number> => {
    // Check if JSON reporter is being used (need quiet output for clean JSON)
    const isUsingJsonReporter = argv.reporters?.includes('json') ?? false;
    const shouldBeQuiet = argv.quiet || isUsingJsonReporter;

    try {
      // Step 1: Load and merge configuration
      if (!shouldBeQuiet) {
        console.error('Loading configuration...');
      }
      const config = await loadConfiguration(context, argv);

      // Step 2: Configure reporters
      if (!shouldBeQuiet) {
        console.error('Setting up reporters...');
      }
      const reporters = await setupReporters(context, config, shouldBeQuiet);

      // Step 3: Discovery phase
      if (!shouldBeQuiet) {
        console.error('Discovering benchmark files...');
      }
      const discoveredFiles = await context.engine.discover(
        config.pattern,
        config.exclude
      );

      if (!shouldBeQuiet) {
        console.error(`Found ${discoveredFiles.length} benchmark file(s)`);
      }

      // Step 4: Validation phase
      if (!shouldBeQuiet) {
        console.error('Validating benchmark files...');
      }
      const validationResult = await context.engine.validate(discoveredFiles);

      if (validationResult.warnings.length > 0) {
        if (!shouldBeQuiet) {
          console.error('Validation warnings:');
          for (const warning of validationResult.warnings) {
            console.error(`  ${warning.code}: ${warning.message}`);
          }
        }
      }

      if (!validationResult.valid) {
        if (!shouldBeQuiet) {
          console.error('Validation errors:');
          for (const error of validationResult.errors) {
            console.error(`  ${error.code}: ${error.message}`);
          }
        }
        return ExitCodes.ValidationError;
      }

      // Step 5: Execution phase
      if (!shouldBeQuiet) {
        console.error('Starting benchmark execution...');
      }

      const runConfig = {
        ...config,
        files: discoveredFiles,
        cwd: argv.cwd,
      };

      const executionResult = await context.engine.execute(
        runConfig,
        reporters
      );

      // Step 6: Results handling
      const exitCode = handleResults(executionResult, argv, shouldBeQuiet);

      if (!shouldBeQuiet) {
        console.error('Run completed successfully!');
        console.error(
          `Total tasks: ${executionResult.summary?.totalTasks ?? 0}, Failed: ${executionResult.summary?.failedTasks ?? 0}`
        );
      }

      return exitCode;
    } catch (error) {
      if (!shouldBeQuiet) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Return appropriate exit code based on error type
      if (error instanceof Error) {
        if (
          error.message.includes('Configuration error') ||
          error.message.includes('Config file not found') ||
          error.message.includes('Failed to load config')
        ) {
          return ExitCodes.ConfigurationError;
        }
        if (
          error.message.includes('No files found') ||
          error.message.includes('No benchmark files found') ||
          error.message.includes('File discovery')
        ) {
          return ExitCodes.FileDiscoveryError;
        }
      }

      return ExitCodes.GeneralError;
    }
  },
};

/**
 * Load and merge configuration from various sources
 */
async function loadConfiguration(context: CliContext, argv: RunArguments) {
  try {
    // Create CLI arguments object for configuration merger
    const cliArgs: Record<string, unknown> = {};

    // Map CLI arguments to config properties
    if (argv.pattern && argv.pattern.length > 0) {
      cliArgs.pattern =
        argv.pattern.length === 1 ? argv.pattern[0] : argv.pattern;
    }
    if (argv.reporters) cliArgs.reporters = argv.reporters;
    if (argv.output) cliArgs.outputDir = resolve(argv.cwd, argv.output);
    if (argv.iterations) cliArgs.iterations = argv.iterations;
    if (argv.time) cliArgs.time = argv.time;
    if (argv.warmup !== undefined) cliArgs.warmup = argv.warmup;
    if (argv.bail !== undefined) cliArgs.bail = argv.bail;
    if (argv.exclude) cliArgs.exclude = argv.exclude;
    if (argv.timeout) cliArgs.timeout = argv.timeout;
    if (argv.quiet !== undefined) cliArgs.quiet = argv.quiet;
    if (argv.verbose !== undefined) cliArgs.verbose = argv.verbose;

    // Load configuration with CLI argument precedence
    const config = await context.configManager.load(argv.config, cliArgs);

    return config;
  } catch (error) {
    throw new Error(
      `Configuration error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Setup and configure reporters based on configuration
 */
async function setupReporters(
  context: CliContext,
  config: { reporters?: string[]; outputDir?: string },
  shouldBeQuiet: boolean
) {
  try {
    const reporters = [];
    const requestedReporters = config.reporters || ['human'];

    for (const reporterName of requestedReporters) {
      const reporter = context.reporterRegistry.get(reporterName);
      if (!reporter) {
        const availableReporters = Object.keys(
          context.reporterRegistry.getAll()
        );
        throw new Error(
          `Unknown reporter: ${reporterName}. Available: ${availableReporters.join(', ')}`
        );
      }
      reporters.push(reporter);
    }

    // Configure output paths for file-based reporters
    if (config.outputDir) {
      // TODO: Configure output paths for reporters that support it
      // This would require extending the reporter interface or using options
      // For now, we'll use the configured output directory in the config
      if (!shouldBeQuiet) {
        console.error(`Output directory configured: ${config.outputDir}`);
      }
    }

    return reporters;
  } catch (error) {
    throw new Error(
      `Reporter setup error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Handle execution results and determine appropriate exit code
 */
function handleResults(
  executionResult: any,
  argv: RunArguments,
  shouldBeQuiet: boolean
): number {
  // The reporters should handle displaying results
  // This function only determines the exit code

  // Determine exit code based on results
  if (executionResult && executionResult.summary) {
    return executionResult.summary.failedTasks > 0
      ? ExitCodes.GeneralError
      : ExitCodes.Success;
  }

  return ExitCodes.Success;
}
