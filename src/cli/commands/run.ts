/**
 * ModestBench Run Command
 *
 * Execute benchmark files with configuration and reporting. Main entry point
 * for running benchmarks with real-time progress.
 */

import { resolve } from 'node:path';

import type {
  BenchmarkRun,
  ModestBenchConfig,
  Reporter,
} from '../../types/index.js';
import type { CliContext } from '../index.js';

import { ErrorCodes, ExitCodes } from '../../constants.js';
import { resolveOutputPath } from '../../core/output-path-resolver.js';
import {
  type BudgetExceededError,
  InvalidArgumentError,
  ReporterLoadError,
  ReporterValidationError,
  UnknownReporterError,
} from '../../errors/index.js';
import { CsvReporter } from '../../reporters/csv.js';
import { HumanReporter } from '../../reporters/human.js';
import { JsonReporter } from '../../reporters/json.js';
import { NyanReporter } from '../../reporters/nyan.js';
import { SimpleReporter } from '../../reporters/simple.js';
import {
  isBuiltInReporter,
  isFilePath,
  loadReporter,
} from '../../services/reporter-loader.js';
import { hasErrorCode, isError } from '../../utils/type-guards.js';

/**
 * Default values for the run command
 *
 * These are the command-level defaults used when neither config file nor CLI
 * arguments provide values. They represent sensible defaults for running
 * benchmarks.
 */
export const RUN_COMMAND_DEFAULTS = {
  bail: false,
  quiet: false,
  reporters: ['human'],
  verbose: false,
} as const satisfies Partial<ModestBenchConfig>;

/**
 * Run command options interface
 */
interface RunOptions {
  bail?: boolean | undefined;
  config?: string | undefined;
  cwd?: string;
  engine?: 'accurate' | 'tinybench' | undefined;
  exclude?: string[] | undefined;
  excludeTags?: string[] | undefined;
  iterations?: number | undefined;
  json?: boolean | undefined;
  noColor?: boolean | undefined;
  outputDir?: string | undefined;
  outputFile?: string | undefined;
  pattern?: string[] | undefined;
  progress?: boolean | undefined;
  quiet?: boolean | undefined;
  reporters?: string[] | undefined;
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
  const verbose = options.verbose ?? false;
  let shouldBeQuiet = options.quiet ?? false; // Will be updated after config loads

  try {
    // Validate --output-file usage
    if (
      options.outputFile &&
      options.reporters &&
      options.reporters.length > 1
    ) {
      throw new InvalidArgumentError(
        '--output-file can only be used with a single reporter. ' +
          'Use --output <dir> for multiple reporters.',
      );
    }

    // Step 1: Load and merge configuration
    if (verbose && !options.quiet) {
      console.error('Loading configuration...');
    }
    const config = await loadConfiguration(context, options);

    // Check if JSON reporter is being used (need quiet output for clean JSON)
    // Only force quiet mode if json is used AND no output directory is specified
    // (i.e., outputting to stdout where we need clean JSON)
    const isUsingJsonReporter = config.reporters?.includes('json') ?? false;
    const hasOutputDir = !!(options.outputDir || config.outputDir);
    shouldBeQuiet = options.quiet || (isUsingJsonReporter && !hasOutputDir);
    // CLI messages on stderr should only be suppressed by explicit --quiet, not JSON-forced quiet
    const showCliMessages = verbose && !options.quiet;

    // Step 2: Configure reporters
    if (showCliMessages) {
      console.error('Setting up reporters...');
    }
    const reporters = await setupReporters(
      context,
      config,
      verbose,
      showCliMessages,
      shouldBeQuiet,
      options.outputDir,
      options.outputFile,
      options.progress,
    );

    // Step 3: Discovery phase
    if (showCliMessages) {
      console.error('Discovering benchmark files...');
    }
    const discoveredFiles = await context.engine.discover(
      config.pattern,
      config.exclude,
    );

    if (showCliMessages) {
      console.error(`Found ${discoveredFiles.length} benchmark file(s)`);
    }

    // Check if no files found and throw to trigger help display
    if (discoveredFiles.length === 0) {
      let msg = `No benchmark files found matching pattern "${config.pattern}"`;
      if (config.exclude?.length) {
        msg += ` (excluding: ${config.exclude.join(', ')})`;
      }
      // Throw error to trigger yargs fail handler which shows help
      const error = new Error(msg);
      error.name = 'FileDiscoveryError';
      throw error;
    }

    // Step 4: Validation phase
    if (showCliMessages) {
      console.error('Validating benchmark files...');
    }
    const validationResult = await context.engine.validate(discoveredFiles);

    if (validationResult.warnings.length > 0) {
      if (showCliMessages) {
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
      return ExitCodes.VALIDATION_ERROR;
    }

    // Step 5: Execution phase
    if (showCliMessages) {
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

    return handleResults(executionResult, options, shouldBeQuiet);
  } catch (error) {
    // Check if error has a code property before accessing it
    const errorCode = hasErrorCode(error) ? error.code : undefined;

    // Handle budget exceeded error
    if (errorCode === ErrorCodes.BUDGET_EXCEEDED) {
      if (!shouldBeQuiet) {
        const budgetError = error as BudgetExceededError;
        console.error(`\n❌ ${budgetError.message}`);
        if (
          budgetError.budgetSummary &&
          budgetError.budgetSummary.results.length > 0
        ) {
          console.error('\nFailed budgets:');
          for (const result of budgetError.budgetSummary.results) {
            if (!result.passed) {
              console.error(`  • ${result.taskId}`);
              for (const violation of result.violations) {
                console.error(`    ${violation.message}`);
              }
            }
          }
        }
      }
      return ExitCodes.BENCHMARK_FAILURES;
    }

    // Re-throw CLI errors so yargs fail handler can show help
    if (errorCode === ErrorCodes.FILE_DISCOVERY_FAILED) {
      throw error;
    }
    if (errorCode === ErrorCodes.CLI_INVALID_ARGUMENT) {
      throw error;
    }

    if (!shouldBeQuiet) {
      console.error(`Error: ${isError(error) ? error.message : String(error)}`);
    }

    // Return appropriate exit code based on error code
    if (
      errorCode === ErrorCodes.CONFIG_LOAD_FAILED ||
      errorCode === ErrorCodes.CONFIG_NOT_FOUND ||
      errorCode === ErrorCodes.CONFIG_VALIDATION_FAILED ||
      errorCode === ErrorCodes.CONFIG_UNSUPPORTED_FORMAT
    ) {
      return ExitCodes.CONFIG_ERROR;
    }

    if (errorCode === ErrorCodes.FILE_DISCOVERY_FAILED) {
      return ExitCodes.DISCOVERY_ERROR;
    }

    // Fallback: check error message for cases where proper error types aren't thrown yet
    if (isError(error)) {
      if (error.message.includes('No benchmark files found')) {
        return ExitCodes.DISCOVERY_ERROR;
      }
    }

    return ExitCodes.BENCHMARK_FAILURES;
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

  // Check if any suites failed (e.g., setup errors)
  const hasSuiteErrors = executionResult.files.some((file) =>
    file.suites.some((suite) => suite.error),
  );

  // Determine exit code based on results
  if (executionResult && executionResult.summary) {
    // Return error if there are failed tasks, file errors, OR suite errors
    return executionResult.summary.failedTasks > 0 ||
      hasFileErrors ||
      hasSuiteErrors
      ? ExitCodes.BENCHMARK_FAILURES
      : ExitCodes.SUCCESS;
  }

  return ExitCodes.SUCCESS;
};

/**
 * Load and merge configuration from various sources
 */
const loadConfiguration = async (context: CliContext, options: RunOptions) => {
  try {
    // Create CLI arguments object for configuration merger
    const cliArgs: Record<string, unknown> = {};

    // Map CLI arguments to config properties
    // Only pass pattern if explicitly provided (non-empty)
    // Empty array means no CLI pattern, so config file or defaults should be used
    if (options.pattern !== undefined && options.pattern.length > 0) {
      cliArgs.pattern =
        options.pattern.length === 1 ? options.pattern[0] : options.pattern;
    }
    if (options.reporters && options.reporters.length > 0) {
      cliArgs.reporters = options.reporters;
    }
    if (options.outputDir) {
      cliArgs.outputDir = resolve(
        options.cwd ?? process.cwd(),
        options.outputDir,
      );
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
    if (options.exclude && options.exclude.length > 0) {
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
    if (options.tags && options.tags.length > 0) {
      cliArgs.tags = options.tags;
    }
    if (options.excludeTags && options.excludeTags.length > 0) {
      cliArgs.excludeTags = options.excludeTags;
    }

    // Load configuration with CLI argument precedence
    // Pass command defaults as the base layer
    const config = await context.configManager.load(
      options.config,
      cliArgs,
      RUN_COMMAND_DEFAULTS,
    );

    return config;
  } catch (error) {
    // Re-throw our custom errors
    const errorCode = hasErrorCode(error) ? error.code : undefined;
    if (errorCode === ErrorCodes.CONFIG_LOAD_FAILED) {
      throw error;
    }
    throw new InvalidArgumentError(
      `Configuration error: ${isError(error) ? error.message : String(error)}`,
      { cause: error },
    );
  }
};

/**
 * Setup and configure reporters based on configuration
 *
 * Supports built-in reporters, registry-based custom reporters, and external
 * reporters loaded from file paths or npm packages.
 */
const setupReporters = async (
  context: CliContext,
  config: {
    outputDir?: string;
    reporterConfig?: Record<string, unknown>;
    reporters?: string[];
  },
  isVerbose: boolean,
  showCliMessages: boolean,
  explicitQuiet: boolean,
  explicitOutputDir?: string,
  explicitOutputFile?: string,
  progressOption?: boolean,
): Promise<Reporter[]> => {
  try {
    const reporters: Reporter[] = [];
    // Dedupe requested reporters
    const requestedReporters = [...new Set(config.reporters || ['human'])];

    // Use output directory from CLI flag, config file, or undefined
    // CLI flag takes precedence over config file
    const outputDir = explicitOutputDir
      ? resolve(explicitOutputDir)
      : config.outputDir
        ? resolve(config.outputDir)
        : undefined;

    // Built-in reporter names for error messages
    const builtInReporters = ['human', 'json', 'csv', 'nyan', 'simple'];

    for (const reporterName of requestedReporters) {
      let reporter: Reporter;

      // Check if this is a built-in reporter
      if (isBuiltInReporter(reporterName)) {
        // Create reporter instances with output path configuration
        switch (reporterName) {
          case 'csv': {
            const outputPath = resolveOutputPath(
              outputDir,
              explicitOutputFile,
              'results.csv',
            );
            reporter = new CsvReporter({
              includeHeaders: true,
              includeMetadata: true,
              ...(outputPath ? { outputPath } : {}),
              quiet: explicitQuiet,
              verbose: isVerbose,
            });
            break;
          }

          case 'human':
            reporter = new HumanReporter({
              color: true,
              progress: progressOption ?? true,
              quiet: explicitQuiet,
              verbose: isVerbose,
            });
            break;

          case 'json': {
            const outputPath = resolveOutputPath(
              outputDir,
              explicitOutputFile,
              'results.json',
            );
            reporter = new JsonReporter({
              ...(outputPath ? { outputPath } : {}),
              prettyPrint: true,
            });
            break;
          }

          case 'nyan':
            reporter = new NyanReporter({
              color: true,
              quiet: explicitQuiet,
            });
            break;

          case 'simple':
            reporter = new SimpleReporter({
              quiet: explicitQuiet,
              verbose: isVerbose,
            });
            break;

          default:
            // TypeScript exhaustiveness check - should never reach here
            throw new Error(`Unhandled built-in reporter: ${reporterName}`);
        }
      } else if (isFilePath(reporterName)) {
        // External reporter from file path
        const reporterOptions =
          (config.reporterConfig?.[reporterName] as Record<string, unknown>) ??
          {};
        if (showCliMessages) {
          console.error(`Loading external reporter: ${reporterName}`);
        }
        reporter = await loadReporter(reporterName, reporterOptions);
      } else {
        // Try registry first, then npm package
        const registryReporter = context.reporterRegistry.get(reporterName);
        if (registryReporter) {
          reporter = registryReporter;
        } else {
          // Try loading as npm package
          const reporterOptions =
            (config.reporterConfig?.[reporterName] as Record<
              string,
              unknown
            >) ?? {};
          if (showCliMessages) {
            console.error(`Loading reporter package: ${reporterName}`);
          }
          try {
            reporter = await loadReporter(reporterName, reporterOptions);
          } catch (error) {
            // If loading fails and it's not a file path, provide helpful error
            if (
              error instanceof ReporterLoadError ||
              error instanceof ReporterValidationError
            ) {
              throw error;
            }
            // Combine built-in reporters with registered custom reporters for error message
            const registeredReporters = Object.keys(
              context.reporterRegistry.getAll(),
            );
            const availableReporters = [
              ...builtInReporters,
              ...registeredReporters,
            ];
            throw new UnknownReporterError(
              `Unknown reporter: ${reporterName}. Available built-in reporters: ${availableReporters.join(', ')}. ` +
                `For external reporters, use a file path (./my-reporter.js) or npm package name.`,
            );
          }
        }
      }

      reporters.push(reporter);
    }

    if (outputDir && showCliMessages) {
      console.error(`Output directory configured: ${outputDir}`);
    }

    return reporters;
  } catch (error) {
    // Re-throw our custom errors
    const errorCode = hasErrorCode(error) ? error.code : undefined;
    if (
      errorCode === ErrorCodes.REPORTER_UNKNOWN ||
      errorCode === ErrorCodes.REPORTER_LOAD_FAILED ||
      errorCode === ErrorCodes.REPORTER_INVALID
    ) {
      throw error;
    }
    throw new InvalidArgumentError(
      `Reporter setup error: ${isError(error) ? error.message : String(error)}`,
      { cause: error },
    );
  }
};
