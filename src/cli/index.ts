#!/usr/bin/env node

/**
 * ModestBench CLI Entry Point
 *
 * Command-line interface using bargs for command parsing and routing. Provides
 * global options, help generation, and dependency injection setup.
 *
 * @packageDocumentation
 */

import {
  ansi,
  bargs,
  BargsError,
  HelpError,
  type InferParserValues,
  map,
  merge,
  opt,
  pos,
} from '@boneskull/bargs';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type {
  BenchmarkEngine,
  ConfigurationManager,
  Engine,
  HistoryStorage,
  ProgressManager,
  ReporterRegistry,
} from '../types/index.js';

import { bootstrap } from '../bootstrap.js';
import {
  ABORT_TIMEOUT,
  DEFAULT_ENGINE,
  DEFAULT_REPORTER,
  Engines,
  ErrorCodes,
  ExitCodes,
  Reporters,
} from '../constants.js';
import { AccurateEngine, TinybenchEngine } from '../core/engines/index.js';
import { isError } from '../errors/base.js';
import { isModestBenchError, UnknownError } from '../errors/index.js';
import {
  CsvReporter,
  HumanReporter,
  JsonReporter,
  NyanReporter,
  SimpleReporter,
} from '../reporters/index.js';
// Import commands
import {
  handleAnalyzeCommand as analyzeCommand,
  type AnalyzeOptions,
} from './commands/analyze.js';
import {
  handleAnalyzeCommand as handleBaselineAnalyzeCommand,
  handleDeleteCommand as handleBaselineDeleteCommand,
  handleListCommand as handleBaselineListCommand,
  handleSetCommand as handleBaselineSetCommand,
  handleShowCommand as handleBaselineShowCommand,
} from './commands/baseline.js';
import {
  handleCleanCommand,
  handleCompareCommand,
  handleExportCommand,
  handleListCommand,
  handleShowCommand,
  handleTrendsCommand,
} from './commands/history.js';
import { handleInitCommand as initCommand } from './commands/init.js';
import { handleRunCommand as runCommand } from './commands/run.js';
import {
  handleTestCommand as testCommand,
  type TestOptions,
} from './commands/test.js';

/**
 * CLI context with initialized services
 */
export interface CliContext {
  readonly abortController: AbortController;
  readonly configManager: ConfigurationManager;
  readonly engine: BenchmarkEngine;
  readonly historyStorage: HistoryStorage;
  readonly options: InferParserValues<typeof globalOptions>;
  readonly progressManager: ProgressManager;
  readonly reporterRegistry: ReporterRegistry;
}

// ============================================================================
// Global Options Parser
// ============================================================================

const globalOptions = opt.options({
  config: opt.string({
    aliases: ['c'],
    description: 'Path to configuration file',
  }),
  cwd: opt.string({
    description: 'Working directory',
  }),
  json: opt.boolean({
    description: 'Output results in JSON format',
  }),
  'no-color': opt.boolean({
    description: 'Disable colored output',
  }),
  progress: opt.boolean({
    description: 'Show animated progress bar',
  }),
  verbose: opt.boolean({
    aliases: ['v'],
    description: 'Enable verbose output',
  }),
});

// ============================================================================
// History Command Parsers
// ============================================================================

const historyListParser = opt.options({
  format: opt.enum(['human', 'json', 'csv'] as const, {
    description: 'Output format',
  }),
  limit: opt.number({
    description: 'Maximum number of results',
  }),
  pattern: opt.string({
    description: 'Filter by benchmark name pattern',
  }),
  since: opt.string({
    description:
      'Show runs since date (ISO 8601 or relative like "1 week ago")',
  }),
  tag: opt.array('string', {
    aliases: ['t'],
    description: 'Filter by tags',
  }),
  until: opt.string({
    description: 'Show runs until date (ISO 8601 or relative like "1 day ago")',
  }),
});

const historyShowParser = merge(
  opt.options({
    format: opt.enum(['human', 'json', 'csv'] as const, {
      description: 'Output format',
    }),
  }),
  pos.positionals(
    pos.string({
      description: 'ID of the benchmark run to show',
      name: 'run-id',
      required: true,
    }),
  ),
);

const historyCompareParser = merge(
  opt.options({
    format: opt.enum(['human', 'json'] as const, {
      description: 'Output format',
    }),
  }),
  pos.positionals(
    pos.string({
      description: 'ID of the first benchmark run',
      name: 'run-id1',
      required: true,
    }),
    pos.string({
      description: 'ID of the second benchmark run',
      name: 'run-id2',
      required: true,
    }),
  ),
);

const historyTrendsParser = merge(
  opt.options({
    all: opt.boolean({
      aliases: ['a'],
      description: 'Analyze all runs (ignore limit)',
    }),
    format: opt.enum(['human', 'json'] as const, {
      description: 'Output format',
    }),
    limit: opt.number({
      description: 'Maximum number of runs to analyze',
    }),
    since: opt.string({
      description:
        'Show trends since date (ISO 8601 or relative like "1 week ago")',
    }),
    tag: opt.array('string', {
      aliases: ['t'],
      description: 'Filter by tags',
    }),
    until: opt.string({
      description:
        'Show trends until date (ISO 8601 or relative like "1 day ago")',
    }),
  }),
  pos.positionals(
    pos.string({
      description: 'Filter by benchmark name pattern',
      name: 'pattern',
    }),
  ),
);

const historyCleanParser = map(
  opt.options({
    'max-age': opt.number({
      description: 'Remove runs older than this many days',
    }),
    'max-runs': opt.number({
      description: 'Keep only this many most recent runs',
    }),
    'max-size': opt.number({
      description: 'Keep history under this size in bytes',
    }),
    yes: opt.boolean({
      aliases: ['y'],
      description: 'Confirm cleanup without prompting',
    }),
  }),
  ({ positionals, values }) => {
    if (!values['max-age'] && !values['max-runs'] && !values['max-size']) {
      throw new Error(
        'At least one cleanup criterion must be specified (--max-age, --max-runs, or --max-size)',
      );
    }
    return { positionals, values };
  },
);

const historyExportParser = opt.options({
  format: opt.enum(['json', 'csv'] as const, {
    description: 'Export format',
  }),
  output: opt.string({
    aliases: ['o'],
    description: 'Output file path',
    required: true,
  }),
  since: opt.string({
    description: 'Export runs since date',
  }),
  until: opt.string({
    description: 'Export runs until date',
  }),
});

// ============================================================================
// Baseline Command Parsers
// ============================================================================

const baselineSetParser = merge(
  opt.options({
    branch: opt.string({
      description: 'Git branch name',
    }),
    commit: opt.string({
      description: 'Git commit SHA (40 characters)',
    }),
    default: opt.boolean({
      description: 'Set as default baseline',
    }),
    'run-id': opt.string({
      description: 'Specific run ID to save (default: most recent)',
    }),
  }),
  pos.positionals(
    pos.string({
      description: 'Name for the baseline',
      name: 'name',
      required: true,
    }),
  ),
);

const baselineListParser = opt.options({
  format: opt.enum(['human', 'json'] as const, {
    description: 'Output format',
  }),
});

const baselineShowParser = merge(
  opt.options({
    format: opt.enum(['human', 'json'] as const, {
      description: 'Output format',
    }),
  }),
  pos.positionals(
    pos.string({
      description: 'Baseline name to show',
      name: 'name',
      required: true,
    }),
  ),
);

const baselineDeleteParser = pos.positionals(
  pos.string({
    description: 'Baseline name to delete',
    name: 'name',
    required: true,
  }),
);

const baselineAnalyzeParser = opt.options({
  confidence: opt.number({
    description: 'Confidence level (0.5-0.999, default 0.95)',
  }),
  runs: opt.number({
    description: 'Number of recent runs to analyze',
  }),
});

// ============================================================================
// Run Command Parser
// ============================================================================

const runParserBase = merge(
  opt.options({
    bail: opt.boolean({
      aliases: ['b'],
      description: 'Stop on first failure',
    }),
    engine: opt.enum([Engines.TINYBENCH, Engines.ACCURATE] as const, {
      aliases: ['e'],
      description:
        'Benchmark engine: tinybench (default) or accurate (requires --allow-natives-syntax)',
    }),
    exclude: opt.array('string', {
      aliases: ['X'],
      description: 'Exclude patterns',
    }),
    'exclude-tag': opt.array('string', {
      aliases: ['T'],
      description: 'Exclude benchmarks with any of these tags',
    }),
    iterations: opt.number({
      aliases: ['i'],
      description: 'Number of iterations per benchmark',
    }),
    'json-pretty': opt.boolean({
      description: 'Pretty-print JSON output (only affects json reporter)',
    }),
    'limit-by': opt.enum(['time', 'iterations', 'any', 'all'] as const, {
      aliases: ['l', 'limit'],
      description:
        'How to limit benchmarks: time (time budget), iterations (sample count), any (either threshold), all (both thresholds)',
    }),
    output: opt.string({
      aliases: ['o'],
      description: 'Output directory for reports',
    }),
    'output-file': opt.string({
      aliases: ['of', 'file'],
      description:
        'Custom filename for reporter output (use with single reporter only)',
    }),
    quiet: opt.boolean({
      aliases: ['q'],
      description: 'Minimal output',
    }),
    reporter: opt.array(
      [
        Reporters.HUMAN,
        Reporters.JSON,
        Reporters.CSV,
        Reporters.NYAN,
        Reporters.SIMPLE,
      ] as const,
      {
        aliases: ['r'],
        default: [DEFAULT_REPORTER],
        description: 'Output reporters to use (human,json,csv)',
      },
    ),
    tag: opt.array('string', {
      description: 'Include only benchmarks with any of these tags',
    }),
    time: opt.number({
      aliases: ['t'],
      description: 'Time budget per benchmark in milliseconds',
    }),
    timeout: opt.number({
      description: 'Timeout per benchmark in milliseconds',
    }),
    warmup: opt.number({
      aliases: ['w', 'warm'],
      description: 'Number of warmup iterations',
    }),
  }),
  pos.positionals(
    pos.variadic('string', {
      description:
        'File paths, directory paths, or glob patterns for benchmark files',
      name: 'pattern',
    }),
  ),
);

// Add validation via map()
const runParser = map(runParserBase, ({ positionals, values }) => {
  if (values.reporter && values.reporter.length > 1 && values['output-file']) {
    throw new Error(
      '--output-file can only be used with a single reporter. Use --output <dir> for multiple reporters.',
    );
  }
  return { positionals, values };
});

// ============================================================================
// Init Command Parser
// ============================================================================

const initParser = merge(
  opt.options({
    'config-type': opt.enum(['json', 'yaml', 'js', 'ts'] as const, {
      description: 'Configuration file format',
    }),
    examples: opt.boolean({
      description: 'Include example benchmark files',
    }),
    force: opt.boolean({
      description: 'Overwrite existing files',
    }),
    quiet: opt.boolean({
      aliases: ['q'],
      description: 'Minimal output',
    }),
    yes: opt.boolean({
      aliases: ['y'],
      description: 'Accept all prompts automatically',
    }),
  }),
  pos.positionals(
    pos.enum(['basic', 'advanced', 'library'] as const, {
      description: 'Type of project to initialize',
      name: 'type',
    }),
  ),
);

// ============================================================================
// Analyze Command Parser
// ============================================================================

const analyzeParserBase = merge(
  opt.options({
    'filter-file': opt.string({
      description: 'Filter functions by file glob pattern',
    }),
    'group-by-file': opt.boolean({
      description: 'Group results by file',
    }),
    input: opt.string({
      aliases: ['i'],
      description: 'Path to existing *.cpuprofile file',
    }),
    'min-percent': opt.number({
      aliases: ['m', 'min'],
      default: 0.5,
      description: 'Minimum execution percentage to show',
    }),
    top: opt.number({
      aliases: ['n'],
      default: 25,
      description: 'Number of top functions to show',
    }),
  }),
  pos.positionals(
    pos.string({
      description: 'Command to analyze (e.g., "npm test")',
      name: 'command',
    }),
  ),
);

// Add validation
const analyzeParser = map(analyzeParserBase, ({ positionals, values }) => {
  const [command] = positionals;
  if (!command && !values.input) {
    throw new Error('Either [command] or --input must be provided');
  }
  return { positionals, values };
});

// ============================================================================
// Test Command Parser
// ============================================================================

const testParser = merge(
  opt.options({
    bail: opt.boolean({
      aliases: ['b'],
      description: 'Stop on first failure',
    }),
    iterations: opt.number({
      aliases: ['i'],
      default: 100,
      description: 'Number of iterations per test',
    }),
    quiet: opt.boolean({
      aliases: ['q'],
      description: 'Minimal output',
    }),
    warmup: opt.number({
      aliases: ['w'],
      default: 5,
      description: 'Number of warmup iterations',
    }),
  }),
  pos.positionals(
    pos.enum(['ava', 'jest', 'mocha', 'node-test'] as const, {
      description: 'Test framework to use',
      name: 'framework',
      required: true,
    }),
    pos.variadic('string', {
      description: 'Test file paths or glob patterns',
      name: 'files',
    }),
  ),
);

// ============================================================================
// Subcommand-specific options
// ============================================================================

/**
 * Additional global options for history and baseline subcommands
 */
const quietOption = opt.options({
  quiet: opt.boolean({
    description: 'Minimal output',
  }),
});

// ============================================================================
// Main CLI Builder
// ============================================================================

/**
 * Synthwave-inspired theme for CLI help output
 *
 * Matches the retro aesthetic used in modestbench reporters
 */
const synthwaveTheme = {
  colors: {
    command: ansi.brightMagenta,
    defaultText: ansi.dim,
    defaultValue: ansi.brightYellow,
    description: ansi.brightWhite,
    epilog: ansi.brightWhite,
    example: ansi.cyan,
    flag: ansi.brightCyan,
    positional: ansi.brightMagenta,
    scriptName: ansi.brightCyan + ansi.bold,
    sectionHeader: ansi.magenta + ansi.bold,
    type: ansi.brightWhite + ansi.dim,
    url: ansi.brightCyan + ansi.underline,
    usage: ansi.white,
  },
};

const createCli = (abortController: AbortController) => {
  return bargs('modestbench', {
    description: 'A modern benchmark runner for Node.js',
    theme: synthwaveTheme,
  })
    .globals(globalOptions)
    .command(
      'run',
      runParser,
      async ({ positionals, values }) => {
        const [pattern] = positionals;
        const context = await createCliContext(
          values,
          abortController,
          values.engine,
        );
        const exitCode = await runCommand(context, {
          bail: values.bail,
          config: values.config,
          cwd: values.cwd,
          engine: values.engine,
          exclude: values.exclude,
          excludeTags: values['exclude-tag'],
          iterations: values.iterations,
          json: values.json,
          jsonPretty: values['json-pretty'],
          noColor: values['no-color'],
          outputDir: values.output,
          outputFile: values['output-file'],
          pattern,
          progress: values.progress,
          quiet: values.quiet,
          reporters: values.reporter,
          tags: values.tag,
          time: values.time,
          timeout: values.timeout,
          verbose: values.verbose,
          warmup: values.warmup,
        });
        process.exit(exitCode);
      },
      'Run benchmark files',
    )
    .command(
      'history',
      (history) =>
        history
          .globals(quietOption)
          .command(
            'list',
            historyListParser,
            async ({ values }) => {
              const context = await createCliContext(values, abortController);
              const exitCode = await handleListCommand(context, {
                cwd: values.cwd,
                format: values.format,
                limit: values.limit,
                pattern: values.pattern,
                since: values.since,
                tags: values.tag,
                until: values.until,
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'List recent benchmark runs',
          )
          .command(
            'show',
            historyShowParser,
            async ({ positionals, values }) => {
              const [runId] = positionals;
              const context = await createCliContext(values, abortController);
              const exitCode = await handleShowCommand(context, {
                cwd: values.cwd,
                format: values.format,
                runId,
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Show detailed results for a specific run',
          )
          .command(
            'compare',
            historyCompareParser,
            async ({ positionals, values }) => {
              const [runId1, runId2] = positionals;
              const context = await createCliContext(values, abortController);
              const exitCode = await handleCompareCommand(context, {
                cwd: values.cwd,
                format: values.format,
                runId1,
                runId2,
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Compare two benchmark runs',
          )
          .command(
            'trends',
            historyTrendsParser,
            async ({ positionals, values }) => {
              const [pattern] = positionals;
              const context = await createCliContext(values, abortController);
              const exitCode = await handleTrendsCommand(context, {
                all: values.all,
                cwd: values.cwd,
                format: values.format,
                limit: values.limit,
                pattern,
                since: values.since,
                tags: values.tag,
                until: values.until,
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Show performance trends over time',
          )
          .command(
            'clean',
            historyCleanParser,
            async ({ values }) => {
              const context = await createCliContext(values, abortController);
              const exitCode = await handleCleanCommand(context, {
                confirm: values.yes,
                cwd: values.cwd,
                maxAge: values['max-age'],
                maxRuns: values['max-runs'],
                maxSize: values['max-size'],
                quiet: values.quiet,
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Clean up old benchmark history',
          )
          .command(
            'export',
            historyExportParser,
            async ({ values }) => {
              const context = await createCliContext(values, abortController);
              const exitCode = await handleExportCommand(context, {
                cwd: values.cwd,
                format: values.format,
                outputPath: values.output,
                quiet: Boolean(values.quiet),
                since: values.since,
                until: values.until,
                verbose: values.verbose,
              });
              process.exitCode = exitCode;
            },
            'Export benchmark history to a file',
          ),
      'View and manage benchmark history',
    )
    .command(
      'baseline',
      (baseline) =>
        baseline
          .globals(quietOption)
          .command(
            'set',
            baselineSetParser,
            async ({ positionals, values }) => {
              const [name] = positionals;
              const context = await createCliContext(values, abortController);
              const exitCode = await handleBaselineSetCommand(context, {
                branch: values.branch,
                commit: values.commit,
                cwd: values.cwd,
                default: values.default,
                name,
                quiet: Boolean(values.quiet),
                runId: values['run-id'],
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Save a benchmark run as a baseline',
          )
          .command(
            'list',
            baselineListParser,
            async ({ values }) => {
              const context = await createCliContext(values, abortController);
              const exitCode = await handleBaselineListCommand(context, {
                cwd: values.cwd,
                format: values.format,
                quiet: Boolean(values.quiet),
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'List all saved baselines',
          )
          .command(
            'show',
            baselineShowParser,
            async ({ positionals, values }) => {
              const [name] = positionals;
              const context = await createCliContext(values, abortController);
              const exitCode = await handleBaselineShowCommand(context, {
                cwd: values.cwd,
                format: values.format,
                name,
                quiet: Boolean(values.quiet),
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Show baseline details',
          )
          .command(
            'delete',
            baselineDeleteParser,
            async ({ positionals, values }) => {
              const [name] = positionals;
              const context = await createCliContext(values, abortController);
              const exitCode = await handleBaselineDeleteCommand(context, {
                cwd: values.cwd,
                name,
                quiet: Boolean(values.quiet),
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Delete a baseline',
          )
          .command(
            'analyze',
            baselineAnalyzeParser,
            async ({ values }) => {
              const context = await createCliContext(values, abortController);
              const exitCode = await handleBaselineAnalyzeCommand(context, {
                confidence: values.confidence,
                cwd: values.cwd,
                quiet: Boolean(values.quiet),
                runs: values.runs,
                verbose: values.verbose,
              });
              process.exit(exitCode);
            },
            'Analyze history and suggest performance budgets',
          ),
      'Manage performance baselines',
    )
    .command(
      'init',
      initParser,
      async ({ positionals, values }) => {
        const [type] = positionals;
        const context = await createCliContext(values, abortController);
        const exitCode = await initCommand(context, {
          configType: values['config-type'],
          cwd: values.cwd,
          examples: values.examples,
          force: values.force,
          quiet: values.quiet,
          type,
          verbose: values.verbose,
          yes: values.yes,
        });
        process.exitCode = exitCode;
      },
      'Initialize a new benchmark project',
    )
    .command(
      'analyze',
      analyzeParser,
      async ({ positionals, values }) => {
        const [command] = positionals;
        // Context not needed for analyze command currently
        const context = {} as CliContext;

        const options: AnalyzeOptions = {
          color: !values['no-color'],
          command,
          cwd: values.cwd || process.cwd(),
          filterFile: values['filter-file'],
          groupByFile: values['group-by-file'],
          input: values.input,
          minPercent: values['min-percent'],
          top: values.top,
        };

        process.exitCode = await analyzeCommand(context, options);
      },
      {
        aliases: ['profile'],
        description: 'Analyze code execution and identify benchmark candidates',
      },
    )
    .command(
      'test',
      testParser,
      async ({ positionals, values }) => {
        const [framework, files] = positionals;
        const context = await createCliContext(values, abortController);
        const options: TestOptions = {
          bail: values.bail,
          cwd: values.cwd,
          framework,
          iterations: values.iterations,
          json: values.json,
          noColor: values['no-color'],
          pattern: files,
          quiet: values.quiet,
          verbose: values.verbose,
          warmup: values.warmup,
        };
        const exitCode = await testCommand(context, options);
        process.exit(exitCode);
      },
      'Run test files as benchmarks',
    )
    .defaultCommand('run');
};

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
  const controller = abortController ?? new AbortController();

  try {
    const cliBuilder = createCli(controller);
    await cliBuilder.parseAsync(argv);
  } catch (error) {
    // Handle bargs errors
    if (error instanceof HelpError) {
      // Help was requested or invalid args - message already printed
      process.exit(ExitCodes.CONFIG_ERROR);
    }

    if (error instanceof BargsError) {
      console.error('Error:', error.message);
      process.exit(ExitCodes.CONFIG_ERROR);
    }

    // Handle bargs validation errors (thrown as plain Error, not BargsError)
    if (
      error instanceof Error &&
      (error.message.startsWith('Invalid value for --') ||
        error.message.startsWith('Missing required'))
    ) {
      console.error('Error:', error.message);
      process.exit(ExitCodes.CONFIG_ERROR);
    }

    // Handle ModestBench errors
    if (isModestBenchError(error)) {
      console.error('Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }

      // Show help for file discovery errors
      if (error.code === ErrorCodes.FILE_DISCOVERY_FAILED) {
        process.exit(ExitCodes.DISCOVERY_ERROR);
      }

      process.exit(ExitCodes.RUNTIME_ERROR);
    }

    // Unexpected error
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
  options: InferParserValues<typeof globalOptions>,
  abortController: AbortController,
  engineType: Engine = DEFAULT_ENGINE,
): Promise<CliContext> => {
  try {
    const dependencies = bootstrap();

    // Select engine based on type
    const engine =
      engineType === Engines.ACCURATE
        ? new AccurateEngine(dependencies)
        : new TinybenchEngine(dependencies);

    // Register built-in reporters
    engine.registerReporter(
      Reporters.HUMAN,
      new HumanReporter({
        color: !options['no-color'],
        verbose: options.verbose,
      }),
    );

    engine.registerReporter(
      'json',
      new JsonReporter({
        prettyPrint: false,
      }),
    );

    engine.registerReporter(
      'csv',
      new CsvReporter({
        includeHeaders: true,
        includeMetadata: true,
      }),
    );

    engine.registerReporter(
      'simple',
      new SimpleReporter({
        verbose: options.verbose,
      }),
    );

    engine.registerReporter(
      'nyan',
      new NyanReporter({
        color: !options['no-color'],
      }),
    );

    return {
      abortController,
      configManager: engine.configManager,
      engine,
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

  const handleSignal = (signal: NodeJS.Signals) => {
    if (abortRequested) {
      // Second signal, force exit
      console.log(`\nReceived ${signal} again, forcing exit...`);
      process.exit(computeExitCode(signal));
    }

    console.log(`\nReceived ${signal}, aborting benchmarks...`);
    abortRequested = true;
    abortController.abort();

    // Give a short grace period for cleanup, then exit
    setTimeout(() => {
      console.log('\nBenchmark aborted.');
      process.exit(computeExitCode(signal));
    }, ABORT_TIMEOUT);
  };

  process
    .once('SIGINT', handleSignal)
    .once('SIGQUIT', handleSignal)
    .once('SIGTERM', handleSignal)
    .once('uncaughtException', (error) => {
      // Wrap non-ModestBench errors with UnknownError
      const wrappedError: Error = isModestBenchError(error)
        ? error
        : new UnknownError(error.message, { cause: error });
      console.error(`${wrappedError}`);
      process.exit(ExitCodes.RUNTIME_ERROR);
    })
    .once('unhandledRejection', (reason) => {
      const wrappedError = new UnknownError(
        isError(reason) ? reason.message : String(reason),
        { cause: reason },
      );
      console.error(`${wrappedError}`);
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

/**
 * Compute the exit code based on the signal
 *
 * @param signal - The signal that caused the exit
 * @returns The exit code
 */
const computeExitCode = (signal: NodeJS.Signals): number => {
  return 128 + (signal === 'SIGINT' ? 2 : signal === 'SIGQUIT' ? 3 : 15);
};
