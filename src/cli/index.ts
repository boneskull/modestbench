#!/usr/bin/env node

/**
 * ModestBench CLI Entry Point
 *
 * Command-line interface using bargs for command parsing and routing. This
 * module provides the main entry points and re-exports key types.
 *
 * @packageDocumentation
 */

import { BargsError, HelpError } from '@boneskull/bargs';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ErrorCodes, ExitCodes } from '../constants.js';
import { isModestBenchError } from '../errors/index.js';
import { createCli } from './builder.js';
import { setupSignalHandlers } from './handlers.js';

// Re-export types and utilities for external use
export { createCliContext } from './context.js';
export type { CliContext } from './context.js';

/**
 * Initialize and run the CLI
 */
export const cli = (argv?: string[]): void => {
  const abortController = new AbortController();
  setupSignalHandlers(abortController);
  main(argv, abortController).catch((error) => {
    console.error('CLI error:', error);
    process.exit(ExitCodes.UNKNOWN_ERROR);
  });
};

/**
 * Main CLI entry point
 */
export const main = async (
  argv?: string[],
  abortController?: AbortController,
): Promise<void> => {
  const controller = abortController ?? new AbortController();

  try {
    const cliBuilder = createCli(controller);
    await cliBuilder.parseAsync(argv);
  } catch (error) {
    // Handle bargs errors
    if (error instanceof HelpError) {
      // Help was requested or invalid args - message already printed
      process.exit(ExitCodes.CONFIG_ERROR);
    }

    if (error instanceof BargsError) {
      console.error('Error:', error.message);
      process.exit(ExitCodes.CONFIG_ERROR);
    }

    // Handle bargs validation errors (thrown as plain Error, not BargsError)
    if (
      error instanceof Error &&
      (error.message.startsWith('Invalid value for --') ||
        error.message.startsWith('Missing required'))
    ) {
      console.error('Error:', error.message);
      process.exit(ExitCodes.CONFIG_ERROR);
    }

    // Handle ModestBench errors
    if (isModestBenchError(error)) {
      console.error('Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }

      // Show help for file discovery errors
      if (error.code === ErrorCodes.FILE_DISCOVERY_FAILED) {
        process.exit(ExitCodes.DISCOVERY_ERROR);
      }

      process.exit(ExitCodes.RUNTIME_ERROR);
    }

    // Unexpected error
    console.error(
      'Unexpected error:',
      error instanceof Error ? error.message : String(error),
    );
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(ExitCodes.UNKNOWN_ERROR);
  }
};

// Run CLI if this file is executed directly
const scriptPath = fileURLToPath(import.meta.url);
const argPath = process.argv[1];

// Resolve both to real paths to handle symlinks (e.g. npm install ../package)
try {
  const scriptRealPath = realpathSync(scriptPath);
  const argRealPath = argPath ? realpathSync(argPath) : '';

  if (scriptRealPath === argRealPath) {
    cli();
  }
} catch {
  // If realpath fails (file doesn't exist), fall back to string comparison
  if (import.meta.url === `file://${argPath}`) {
    cli();
  }
}
