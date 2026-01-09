/**
 * CLI Builder
 *
 * Constructs the CLI using bargs, registering all commands, subcommands, and
 * their handlers.
 *
 * @packageDocumentation
 */

import { bargs } from '@boneskull/bargs';

import type { CliContext } from './context.js';

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
import { createCliContext } from './context.js';
import {
  analyzeParser,
  baselineAnalyzeParser,
  baselineDeleteParser,
  baselineListParser,
  baselineSetParser,
  baselineShowParser,
  globalOptions,
  historyCleanParser,
  historyCompareParser,
  historyExportParser,
  historyListParser,
  historyShowParser,
  historyTrendsParser,
  initParser,
  quietOption,
  runParser,
  testParser,
} from './parsers/index.js';
import { synthwaveTheme } from './theme.js';

/**
 * Create the CLI builder with all commands registered
 *
 * @param abortController - Controller for aborting benchmark runs
 * @returns Configured bargs CLI builder
 */
export const createCli = (abortController: AbortController) => {
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
          excludeTags: values.excludeTag,
          iterations: values.iterations,
          json: values.json,
          jsonPretty: values.jsonPretty,
          noColor: values.noColor,
          outputDir: values.output,
          outputFile: values.outputFile,
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
        process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
                maxAge: values.maxAge,
                maxRuns: values.maxRuns,
                maxSize: values.maxSize,
                quiet: values.quiet,
                verbose: values.verbose,
              });
              process.exitCode = exitCode;
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
                runId: values.runId,
                verbose: values.verbose,
              });
              process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
              process.exitCode = exitCode;
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
          configType: values.configType,
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
          color: !values.noColor,
          command,
          cwd: values.cwd || process.cwd(),
          filterFile: values.filterFile,
          groupByFile: values.groupByFile,
          input: values.input,
          minPercent: values.minPercent,
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
          noColor: values.noColor,
          pattern: files,
          quiet: values.quiet,
          verbose: values.verbose,
          warmup: values.warmup,
        };
        const exitCode = await testCommand(context, options);
        process.exitCode = exitCode;
      },
      'Run test files as benchmarks',
    )
    .defaultCommand('run');
};
