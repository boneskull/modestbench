/**
 * Run Command Parser
 *
 * Parser for the `run` command which executes benchmark files.
 *
 * @packageDocumentation
 */

import { map, merge, opt, pos } from '@boneskull/bargs';

import { DEFAULT_REPORTER, Engines, Reporters } from '../../constants.js';

/**
 * Base parser for `run` command options and positionals
 */
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

/**
 * Parser for `run` command with validation
 *
 * Validates that --output-file is only used with a single reporter.
 */
export const runParser = map(runParserBase, ({ positionals, values }) => {
  if (values.reporter && values.reporter.length > 1 && values['output-file']) {
    throw new Error(
      '--output-file can only be used with a single reporter. Use --output <dir> for multiple reporters.',
    );
  }
  return { positionals, values };
});
