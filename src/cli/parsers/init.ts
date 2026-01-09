/**
 * Init Command Parser
 *
 * Parser for the `init` command which initializes a new benchmark project.
 *
 * @packageDocumentation
 */

import { camelCaseValues, map, merge, opt, pos } from '@boneskull/bargs';

/**
 * Parser for `init` command
 *
 * Uses camelCaseValues transform for cleaner property access.
 */
export const initParser = map(
  merge(
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
  ),
  camelCaseValues,
);
