/**
 * ModestBench Run Command
 *
 * Execute benchmark files with configuration and reporting. Main entry point
 * for running benchmarks with real-time progress.
 */

import { resolve } from 'node:path';
import { type Argv } from 'yargs';

import type { CliContext } from '../index.js';

import { ExitCodes } from '../../types/cli.js';

/**
 * Run command arguments interface
 */
interface RunArguments {
  bail?: boolean;
  config?: string;
  cwd: string;
  exclude?: string[];
  iterations?: number;
  json?: boolean;
  noColor?: boolean;
  output?: string;
  pattern: string[];
  quiet?: boolean;
  reporters: string[];
  time?: number;
  timeout?: number;
  verbose?: boolean;
  warmup?: number;
}

export const runCommand = {
  builder: (yargs: Argv) => {
    return yargs
      .positional('pattern', {
        array: true,
        default: ['**/*.bench.{js,ts}'],
        describe: 'Glob patterns for benchmark files',
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
            return value.flatMap((v) => v.split(',').map((s) => s.trim()));
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
            return value.flatMap((v) => v.split(',').map((s) => s.trim()));
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
        config.exclude,
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
        cwd: argv.cwd,
        files: discoveredFiles,
      };

      const executionResult = await context.engine.execute(
        runConfig,
        reporters,
      );

      // Step 6: Results handling
      const exitCode = handleResults(executionResult, argv, shouldBeQuiet);

      if (!shouldBeQuiet) {
        console.error('Run completed successfully!');
        console.error(
          `Total tasks: ${executionResult.summary?.totalTasks ?? 0}, Failed: ${executionResult.summary?.failedTasks ?? 0}`,
        );
      }

      return exitCode;
    } catch (error) {
      if (!shouldBeQuiet) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
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
 * Handle execution results and determine appropriate exit code
 */
const handleResults = (
  executionResult: any,
  argv: RunArguments,
  shouldBeQuiet: boolean,
): number => {
  // The reporters should handle displaying results
  // This function only determines the exit code

  // Determine exit code based on results
  if (executionResult && executionResult.summary) {
    return executionResult.summary.failedTasks > 0
      ? ExitCodes.GeneralError
      : ExitCodes.Success;
  }

  return ExitCodes.Success;
};

/**
 * Load and merge configuration from various sources
 */
const loadConfiguration = async (context: CliContext, argv: RunArguments) => {
  try {
    // Create CLI arguments object for configuration merger
    const cliArgs: Record<string, unknown> = {};

    // Map CLI arguments to config properties
    if (argv.pattern && argv.pattern.length > 0) {
      cliArgs.pattern =
        argv.pattern.length === 1 ? argv.pattern[0] : argv.pattern;
    }
    if (argv.reporters) {
      cliArgs.reporters = argv.reporters;
    }
    if (argv.output) {
      cliArgs.outputDir = resolve(argv.cwd, argv.output);
    }
    if (argv.iterations) {
      cliArgs.iterations = argv.iterations;
    }
    if (argv.time) {
      cliArgs.time = argv.time;
    }
    if (argv.warmup !== undefined) {
      cliArgs.warmup = argv.warmup;
    }
    if (argv.bail !== undefined) {
      cliArgs.bail = argv.bail;
    }
    if (argv.exclude) {
      cliArgs.exclude = argv.exclude;
    }
    if (argv.timeout) {
      cliArgs.timeout = argv.timeout;
    }
    if (argv.quiet !== undefined) {
      cliArgs.quiet = argv.quiet;
    }
    if (argv.verbose !== undefined) {
      cliArgs.verbose = argv.verbose;
    }

    // Load configuration with CLI argument precedence
    const config = await context.configManager.load(argv.config, cliArgs);

    return config;
  } catch (error) {
    throw new Error(
      `Configuration error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Setup and configure reporters based on configuration
 */
const setupReporters = async (
  context: CliContext,
  config: { outputDir?: string; reporters?: string[] },
  shouldBeQuiet: boolean,
) => {
  try {
    const reporters = [];
    const requestedReporters = config.reporters || ['human'];

    for (const reporterName of requestedReporters) {
      const reporter = context.reporterRegistry.get(reporterName);
      if (!reporter) {
        const availableReporters = Object.keys(
          context.reporterRegistry.getAll(),
        );
        throw new Error(
          `Unknown reporter: ${reporterName}. Available: ${availableReporters.join(', ')}`,
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
      `Reporter setup error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
