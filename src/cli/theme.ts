/**
 * CLI Theme Configuration
 *
 * Synthwave-inspired color theme for bargs help output, matching the retro
 * aesthetic used throughout modestbench reporters.
 *
 * @packageDocumentation
 */

import { ansi } from '@boneskull/bargs';

/**
 * Synthwave-inspired theme for CLI help output
 *
 * Matches the retro aesthetic used in modestbench reporters
 */
export const synthwaveTheme = {
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
