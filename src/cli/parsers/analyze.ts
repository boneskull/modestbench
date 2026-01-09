/**
 * Analyze Command Parser
 *
 * Parser for the `analyze` command (aliased as `profile`) which profiles code
 * execution to identify benchmark candidates.
 *
 * @packageDocumentation
 */

import { camelCaseValues, map, merge, opt, pos } from '@boneskull/bargs';

/**
 * Base parser for `analyze` command options and positionals
 */
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

/**
 * Parser for `analyze` command with validation and camelCase values
 *
 * Validates that either a command or --input is provided. Uses camelCaseValues
 * transform for cleaner property access.
 */
export const analyzeParser = map(
  map(analyzeParserBase, ({ positionals, values }) => {
    const [command] = positionals;
    if (!command && !values.input) {
      throw new Error('Either [command] or --input must be provided');
    }
    return { positionals, values };
  }),
  camelCaseValues,
);
