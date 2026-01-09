/**
 * Test Command Parser
 *
 * Parser for the `test` command which runs test files as benchmarks.
 *
 * @packageDocumentation
 */

import { merge, opt, pos } from '@boneskull/bargs';

/**
 * Parser for `test` command
 */
export const testParser = merge(
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
