/**
 * CLI Signal Handlers
 *
 * Handles process signals (SIGINT, SIGTERM, etc.) and uncaught errors for
 * graceful shutdown of benchmark runs.
 *
 * @packageDocumentation
 */

import { ABORT_TIMEOUT, ExitCodes } from '../constants.js';
import { isModestBenchError, UnknownError } from '../errors/index.js';
import { isError } from '../utils/type-guards.js';

/**
 * Handle process signals gracefully
 */
export const setupSignalHandlers = (abortController: AbortController): void => {
  let abortRequested = false;

  const handleSignal = (signal: NodeJS.Signals) => {
    if (abortRequested) {
      // Second signal, force exit
      console.log(`\nReceived ${signal} again, forcing exit...`);
      process.exit(computeExitCode(signal));
    }

    console.log(`\nReceived ${signal}, aborting benchmarks...`);
    abortRequested = true;
    abortController.abort();

    // Give a short grace period for cleanup, then exit
    setTimeout(() => {
      console.log('\nBenchmark aborted.');
      process.exit(computeExitCode(signal));
    }, ABORT_TIMEOUT);
  };

  process
    .once('SIGINT', handleSignal)
    .once('SIGQUIT', handleSignal)
    .once('SIGTERM', handleSignal)
    .once('uncaughtException', (error) => {
      // Wrap non-ModestBench errors with UnknownError
      const wrappedError: Error = isModestBenchError(error)
        ? error
        : new UnknownError(error.message, { cause: error });
      console.error(`${wrappedError}`);
      process.exit(ExitCodes.RUNTIME_ERROR);
    })
    .once('unhandledRejection', (reason) => {
      const wrappedError: Error = isModestBenchError(reason)
        ? reason
        : new UnknownError(isError(reason) ? reason.message : String(reason), {
            cause: reason,
          });
      console.error(`${wrappedError}`);
      process.exit(ExitCodes.RUNTIME_ERROR);
    });
};

/**
 * Compute the exit code based on the signal
 *
 * @param signal - The signal that caused the exit
 * @returns The exit code
 */
const computeExitCode = (signal: NodeJS.Signals): number => {
  switch (signal) {
    case 'SIGINT':
      return 130; // 128 + 2
    case 'SIGQUIT':
      return 131; // 128 + 3
    default:
      return 143; // 128 + 15 (SIGTERM)
  }
};
