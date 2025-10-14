import { type ChildProcess, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const cliPath = fileURLToPath(new URL('../src/cli/index.ts', import.meta.url));
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
  return new Promise((resolve) => {
    const child: ChildProcess = spawn('npx', ['tsx', cliPath, ...args], {
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
