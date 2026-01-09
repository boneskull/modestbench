/**
 * Baseline Command Parsers
 *
 * Parsers for the `baseline` command and its subcommands: set, list, show,
 * delete, and analyze.
 *
 * @packageDocumentation
 */

import { camelCaseValues, map, merge, opt, pos } from '@boneskull/bargs';

/**
 * Parser for `baseline set` command
 *
 * Uses camelCaseValues transform for cleaner property access.
 */
export const baselineSetParser = map(
  merge(
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
  ),
  camelCaseValues,
);

/**
 * Parser for `baseline list` command
 */
export const baselineListParser = opt.options({
  format: opt.enum(['human', 'json'] as const, {
    description: 'Output format',
  }),
});

/**
 * Parser for `baseline show` command
 */
export const baselineShowParser = merge(
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

/**
 * Parser for `baseline delete` command
 */
export const baselineDeleteParser = pos.positionals(
  pos.string({
    description: 'Baseline name to delete',
    name: 'name',
    required: true,
  }),
);

/**
 * Parser for `baseline analyze` command
 */
export const baselineAnalyzeParser = opt.options({
  confidence: opt.number({
    description: 'Confidence level (0.5-0.999, default 0.95)',
  }),
  runs: opt.number({
    description: 'Number of recent runs to analyze',
  }),
});
