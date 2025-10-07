/**
 * ModestBench Run Command
 *
 * Execute benchmark files with configuration and reporting.
 * Main entry point for running benchmarks with real-time progress.
 */

import { resolve } from 'node:path';
import type { CliContext, ExitCodes } from '../index.js';

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
  concurrent?: boolean;
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
      .option('concurrent', {
        type: 'boolean',
        description: 'Run suites in parallel',
        default: false,
      })
      .option('bail', {
        type: 'boolean',
        description: 'Stop on first benchmark failure',
        default: false,
      })
      .option('exclude', {
        type: 'array',
        description: 'Exclude patterns (comma-separated)',
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
        ['$0 run --concurrent --bail', 'Run parallel with fail-fast'],
      ]);
  },

  handler: async (context: CliContext, argv: RunArguments): Promise<number> => {
    try {
      // Step 1: Load and merge configuration
      console.log('Loading configuration...');
      const config = await loadConfiguration(context, argv);

      // Step 2: Configure reporters
      console.log('Setting up reporters...');
      const reporters = await setupReporters(context, argv);

      // Step 3: Discovery phase
      console.log('Discovering benchmark files...');
      const discoveredFiles = await context.engine.discover(
        config.pattern,
        config.exclude
      );

      if (discoveredFiles.length === 0) {
        console.error(
          'No benchmark files found matching pattern:',
          config.pattern
        );
        return 3; // Discovery error
      }

      console.log(`Found ${discoveredFiles.length} benchmark file(s)`);

      // Step 4: Validation phase
      console.log('Validating benchmark files...');
      const validationResult = await context.engine.validate(discoveredFiles);

      if (!validationResult.valid) {
        console.error('Validation failed:');
        for (const error of validationResult.errors) {
          console.error(`  ${error.code}: ${error.message}`);
          if (error.file) {
            console.error(`    File: ${error.file}`);
          }
        }
        return 4; // Validation error
      }

      if (validationResult.warnings.length > 0 && !argv.quiet) {
        console.warn('Validation warnings:');
        for (const warning of validationResult.warnings) {
          console.warn(`  ${warning.code}: ${warning.message}`);
        }
        console.log();
      }

      // Step 5: Execution phase
      console.log('Starting benchmark execution...');
      const runConfig = {
        ...config,
        files: discoveredFiles,
        cwd: argv.cwd,
      };

      const executionResult = await context.engine.execute(runConfig);

      // Step 6: Handle results and determine exit code
      return handleResults(executionResult, argv);
    } catch (error) {
      console.error(
        'Run command failed:',
        error instanceof Error ? error.message : String(error)
      );

      if (argv.verbose && error instanceof Error && error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
      }

      return 5; // Runtime error
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
    if (argv.concurrent !== undefined) cliArgs.concurrent = argv.concurrent;
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
 * Setup and configure reporters based on arguments
 */
async function setupReporters(context: CliContext, argv: RunArguments) {
  try {
    const reporters = [];
    const requestedReporters = argv.reporters || ['human'];

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
    if (argv.output) {
      const outputDir = resolve(argv.cwd, argv.output);

      // TODO: Configure output paths for reporters that support it
      // This would require extending the reporter interface or using options
      // For now, we'll use the configured output directory in the config
      console.log(`Output directory configured: ${outputDir}`);
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
function handleResults(executionResult: any, argv: RunArguments): number {
  // TODO: Once we have proper execution result types, implement this properly
  console.log('Execution completed');
  console.log('Result:', typeof executionResult);

  // For now, return success
  // In the real implementation, we would:
  // - Check if any benchmarks failed
  // - Return 1 if there were failures
  // - Return 0 if all passed
  // - Display summary information unless quiet mode

  if (!argv.quiet) {
    console.log('Run completed successfully!');
  }

  return 0; // Success
}
