/**
 * ModestBench Run Command
 *
 * Execute benchmark files with configuration and reporting. Main entry point
 * for running benchmarks with real-time progress.
 */

import { resolve } from 'node:path';

import type { BenchmarkRun } from '../../types/index.js';
import type { CliContext } from '../index.js';

import { ExitCodes } from '../../types/cli.js';

/**
 * Run command options interface
 */
interface RunOptions {
  bail?: boolean | undefined;
  config?: string | undefined;
  cwd: string;
  exclude?: string[] | undefined;
  excludeTags?: string[] | undefined;
  iterations?: number | undefined;
  json?: boolean | undefined;
  noColor?: boolean | undefined;
  outputDir?: string | undefined;
  pattern: string[];
  quiet?: boolean | undefined;
  reporters: string[];
  tags?: string[] | undefined;
  time?: number | undefined;
  timeout?: number | undefined;
  verbose?: boolean | undefined;
  warmup?: number | undefined;
}

/**
 * Handle run command
 */
export const handleRunCommand = async (
  context: CliContext,
  options: RunOptions,
): Promise<number> => {
  // Check if JSON reporter is being used (need quiet output for clean JSON)
  // Only force quiet mode if json is used AND no output directory is specified
  // (i.e., outputting to stdout where we need clean JSON)
  const isUsingJsonReporter = options.reporters?.includes('json') ?? false;
  const shouldBeQuiet =
    options.quiet || (isUsingJsonReporter && !options.outputDir);

  try {
    // Step 1: Load and merge configuration
    if (!shouldBeQuiet) {
      console.error('Loading configuration...');
    }
    const config = await loadConfiguration(context, options);

    // Step 2: Configure reporters
    if (!shouldBeQuiet) {
      console.error('Setting up reporters...');
    }
    const reporters = await setupReporters(
      context,
      config,
      shouldBeQuiet,
      options.outputDir,
    );

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
      cwd: options.cwd,
      files: discoveredFiles,
    };

    const executionResult = await context.engine.execute(
      runConfig,
      reporters,
      context.abortController.signal,
    );

    // Step 6: Results handling
    // Check if aborted by signal
    if (context.abortController.signal.aborted) {
      if (!shouldBeQuiet) {
        console.error('\n✋ Benchmark run aborted by user');
      }
      // Exit with SIGINT code (128 + 2 = 130)
      process.exit(130);
    }

    const exitCode = handleResults(executionResult, options, shouldBeQuiet);

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
};

/**
 * Handle execution results and determine appropriate exit code
 */
const handleResults = (
  executionResult: BenchmarkRun,
  _options: RunOptions,
  _shouldBeQuiet: boolean,
): number => {
  // The reporters should handle displaying results
  // This function only determines the exit code

  // Check if any files failed to load/execute
  const hasFileErrors = executionResult.files.some((file) => file.error);

  // Determine exit code based on results
  if (executionResult && executionResult.summary) {
    // Return error if there are failed tasks OR file-level errors
    return executionResult.summary.failedTasks > 0 || hasFileErrors
      ? ExitCodes.GeneralError
      : ExitCodes.Success;
  }

  return ExitCodes.Success;
};

/**
 * Load and merge configuration from various sources
 */
const loadConfiguration = async (context: CliContext, options: RunOptions) => {
  try {
    // Create CLI arguments object for configuration merger
    const cliArgs: Record<string, unknown> = {};

    // Map CLI arguments to config properties
    // Pass pattern as-is, even if empty (loader will provide defaults)
    if (options.pattern !== undefined) {
      // If pattern is provided, use it; if empty array, pass it (for defaults)
      cliArgs.pattern =
        options.pattern.length === 1 ? options.pattern[0] : options.pattern;
    }
    if (options.reporters) {
      cliArgs.reporters = options.reporters;
    }
    if (options.outputDir) {
      cliArgs.outputDir = resolve(options.cwd, options.outputDir);
    }
    if (options.iterations) {
      cliArgs.iterations = options.iterations;
    }
    if (options.time) {
      cliArgs.time = options.time;
    }
    if (options.warmup !== undefined) {
      cliArgs.warmup = options.warmup;
    }
    if (options.bail !== undefined) {
      cliArgs.bail = options.bail;
    }
    if (options.exclude) {
      cliArgs.exclude = options.exclude;
    }
    if (options.timeout) {
      cliArgs.timeout = options.timeout;
    }
    if (options.quiet !== undefined) {
      cliArgs.quiet = options.quiet;
    }
    if (options.verbose !== undefined) {
      cliArgs.verbose = options.verbose;
    }
    if (options.tags) {
      cliArgs.tags = options.tags;
    }
    if (options.excludeTags) {
      cliArgs.excludeTags = options.excludeTags;
    }

    // Load configuration with CLI argument precedence
    const config = await context.configManager.load(options.config, cliArgs);

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
  explicitOutputDir?: string,
) => {
  try {
    const reporters = [];
    const requestedReporters = config.reporters || ['human'];

    // Dynamically import reporters for proper configuration
    const { HumanReporter } = await import('../../reporters/human.js');
    const { JsonReporter } = await import('../../reporters/json.js');
    const { CsvReporter } = await import('../../reporters/csv.js');

    // Only use file output if --output was explicitly provided
    // Use the explicit output dir if provided, otherwise check config
    const outputDir = explicitOutputDir
      ? resolve(explicitOutputDir)
      : undefined;

    for (const reporterName of requestedReporters) {
      let reporter;

      // Create reporter instances with output path configuration
      if (reporterName === 'human') {
        reporter = new HumanReporter({
          color: true,
          progress: true,
          quiet: shouldBeQuiet,
          verbose: false,
        });
      } else if (reporterName === 'json') {
        reporter = new JsonReporter({
          ...(outputDir ? { outputPath: `${outputDir}/results.json` } : {}),
          prettyPrint: true,
          quiet: shouldBeQuiet,
        });
      } else if (reporterName === 'csv') {
        reporter = new CsvReporter({
          includeHeaders: true,
          includeMetadata: true,
          ...(outputDir ? { outputPath: `${outputDir}/results.csv` } : {}),
          quiet: shouldBeQuiet,
        });
      } else {
        // Fall back to registry for custom reporters
        reporter = context.reporterRegistry.get(reporterName);
        if (!reporter) {
          const availableReporters = ['human', 'json', 'csv'];
          throw new Error(
            `Unknown reporter: ${reporterName}. Available: ${availableReporters.join(', ')}`,
          );
        }
      }

      reporters.push(reporter);
    }

    if (outputDir && !shouldBeQuiet) {
      console.error(`Output directory configured: ${outputDir}`);
    }

    return reporters;
  } catch (error) {
    throw new Error(
      `Reporter setup error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
