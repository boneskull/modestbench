/**
 * Global CLI Options
 *
 * Options shared across all commands (verbose, config, cwd, etc.) and common
 * option fragments used by subcommands.
 *
 * @packageDocumentation
 */

import { opt } from '@boneskull/bargs';

/**
 * Global options available to all commands
 */
export const globalOptions = opt.options({
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

/**
 * Additional global options for history and baseline subcommands
 */
export const quietOption = opt.options({
  quiet: opt.boolean({
    description: 'Minimal output',
  }),
});
