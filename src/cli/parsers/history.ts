/**
 * History Command Parsers
 *
 * Parsers for the `history` command and its subcommands: list, show, compare,
 * trends, clean, and export.
 *
 * @packageDocumentation
 */

import { camelCaseValues, map, merge, opt, pos } from '@boneskull/bargs';

/**
 * Parser for `history list` command
 */
export const historyListParser = opt.options({
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

/**
 * Parser for `history show` command
 */
export const historyShowParser = merge(
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

/**
 * Parser for `history compare` command
 */
export const historyCompareParser = merge(
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

/**
 * Parser for `history trends` command
 */
export const historyTrendsParser = merge(
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

/**
 * Parser for `history clean` command
 *
 * Includes validation requiring at least one cleanup criterion. Uses
 * camelCaseValues transform for cleaner property access.
 */
export const historyCleanParser = map(
  map(
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
  ),
  camelCaseValues,
);

/**
 * Parser for `history export` command
 */
export const historyExportParser = opt.options({
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
