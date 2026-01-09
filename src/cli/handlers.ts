/**
 * CLI Signal Handlers
 *
 * Handles process signals (SIGINT, SIGTERM, etc.) and uncaught errors for
 * graceful shutdown of benchmark runs.
 *
 * @packageDocumentation
 */

import { ABORT_TIMEOUT, ExitCodes } from '../constants.js';
import { isError } from '../errors/base.js';
import { isModestBenchError, UnknownError } from '../errors/index.js';

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
  return 128 + (signal === 'SIGINT' ? 2 : signal === 'SIGQUIT' ? 3 : 15);
};
