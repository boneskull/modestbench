/**
 * ModestBench CLI Types
 *
 * Defines types specific to the command-line interface, including command
 * definitions, argument parsing, and CLI-specific configuration structures.
 */

import { ExitCodes } from '../constants.js';

export { ExitCodes };

/**
 * CLI argument specification for a command
 */
export interface ArgumentSpec {
  /** Short alias */
  readonly alias?: string;
  /** Choices for string arguments */
  readonly choices?: string[];
  /** Default value */
  readonly default?: unknown;
  /** Argument description */
  readonly description: string;
  /** Argument name */
  readonly name: string;
  /** Whether argument is required */
  readonly required?: boolean;
  /** Argument type */
  readonly type: 'array' | 'boolean' | 'number' | 'string';
  /** Validation function */
  readonly validate?: (value: unknown) => boolean | string;
}

/**
 * Parsed command-line arguments
 */
export interface CommandArguments {
  /** Positional arguments */
  readonly _: string[];
  /** Named arguments */
  readonly [key: string]: unknown;
}

/**
 * CLI command specification
 */
export interface CommandSpec {
  /** Command aliases */
  readonly aliases?: string[];
  /** Command description */
  readonly description: string;
  /** Examples of command usage */
  readonly examples?: string[];
  /** Command name */
  readonly name: string;
  /** Named arguments */
  readonly options?: ArgumentSpec[];
  /** Positional arguments */
  readonly positional?: ArgumentSpec[];
  /** Subcommands */
  readonly subcommands?: CommandSpec[];
}

export type Engine = 'accurate' | 'tinybench';

export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];

/**
 * Progress display options
 */
export interface ProgressDisplayOptions {
  /** Progress bar width */
  readonly barWidth: number;
  /** Show current file being processed */
  readonly showCurrentFile: boolean;
  /** Show progress bars */
  readonly showProgress: boolean;
  /** Show estimated time remaining */
  readonly showTimeRemaining: boolean;
  /** Update interval in milliseconds */
  readonly updateInterval: number;
}
