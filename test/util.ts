import { type ChildProcess, spawn } from 'node:child_process';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';

// Use compiled dist files instead of tsx for faster test execution
const cliPath = fileURLToPath(new URL('../dist/cli/index.js', import.meta.url));

/**
 * Helper function to run CLI commands and capture output
 */
export const runCommand = async (
  args: string[],
  cwd: string = process.cwd(),
): Promise<{
  exitCode: number;
  stderr: string;
  stdout: string;
}> => {
  if (
    args.includes('run') &&
    !args.includes('--iterations') &&
    !args.includes('-i')
  ) {
    args.push('--iterations', '1');
  }
  return new Promise((resolve) => {
    const child: ChildProcess = spawn('node', [cliPath, ...args], {
      cwd,
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

/**
 * Null stream to suppress output
 */
export const nullStream = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});
