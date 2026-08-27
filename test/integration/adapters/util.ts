/**
 * Utilities for adapter E2E tests
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Paths to CLI and adapter loaders
const cliPath = fileURLToPath(
  new URL('../../../dist/cli/index.js', import.meta.url),
);

// Adapters that have register/hooks pattern (ESM loader support)
// Note: Mocha uses global injection, not ESM loader hooks
const adapterPaths = {
  ava: fileURLToPath(
    new URL('../../../dist/adapters/ava-register.js', import.meta.url),
  ),
  jest: fileURLToPath(
    new URL('../../../dist/adapters/jest-register.js', import.meta.url),
  ),
  'node-test': fileURLToPath(
    new URL('../../../dist/adapters/node-test-register.js', import.meta.url),
  ),
} as const;

// Frameworks that use global injection (no loader needed)
const globalAdapters = ['mocha'] as const;

export interface AdapterCommandOptions {
  /** Working directory */
  cwd?: string;
  /** Number of benchmark iterations */
  iterations?: number;
  /** Output JSON */
  json?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

export type AdapterFramework =
  (typeof globalAdapters)[number] | keyof typeof adapterPaths;

/**
 * Check if a framework uses global injection (no loader needed)
 */
const isGlobalAdapter = (
  framework: AdapterFramework,
): framework is (typeof globalAdapters)[number] => {
  return (globalAdapters as readonly string[]).includes(framework);
};

/**
 * Run the test command with an adapter
 */
export const runAdapterCommand = async (
  framework: AdapterFramework,
  files: string[],
  options: AdapterCommandOptions = {},
): Promise<{
  exitCode: number;
  stderr: string;
  stdout: string;
}> => {
  // Build args differently for global vs loader-hook adapters
  let args: string[];

  if (isGlobalAdapter(framework)) {
    // Mocha and similar - no loader needed, globals are injected at runtime
    args = [cliPath, 'test', framework, ...files];
  } else {
    // ESM loader hook adapters (jest, ava, node-test)
    const adapterPath = adapterPaths[framework];
    args = ['--import', adapterPath, cliPath, 'test', framework, ...files];
  }

  // Add options
  if (options.iterations !== undefined) {
    args.push('--iterations', String(options.iterations));
  }
  if (options.json) {
    args.push('--json');
  }
  if (options.verbose) {
    args.push('--verbose');
  }

  return new Promise((resolve) => {
    const child: ChildProcess = spawn('node', args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: null | number) => {
      resolve({
        exitCode: code ?? -1,
        stderr,
        stdout,
      });
    });

    child.on('error', (error: Error) => {
      resolve({
        exitCode: -1,
        stderr: stderr + error.message,
        stdout,
      });
    });
  });
};
