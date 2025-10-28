/**
 * Profile Runner Service
 *
 * Executes commands with Node.js CPU profiling enabled and captures profiler
 * output to *.cpuprofile files in .modestbench/profiles/.
 *
 * @packageDocumentation
 */

import { glob } from 'glob';
import { spawn } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Options for running with profiling
 */
interface RunOptions {
  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: NodeJS.ProcessEnv;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Run a command with Node.js profiling enabled
 *
 * @param command - Command to run (e.g., "npm test")
 * @param options - Execution options
 * @returns Path to generated *.cpuprofile file
 */
export const runWithProfiling = async (
  command: string,
  options: RunOptions = {},
): Promise<string> => {
  const cwd = options.cwd || process.cwd();

  // Create profiles directory
  const profilesDir = join(cwd, '.modestbench', 'profiles');
  await mkdir(profilesDir, { recursive: true });

  // Run command with NODE_OPTIONS="--cpu-prof --cpu-prof-dir=..."
  const proc = spawn(command, {
    cwd,
    env: {
      ...process.env,
      ...options.env,
      NODE_OPTIONS: `--cpu-prof --cpu-prof-dir=${profilesDir}`,
    },
    shell: true,
    stdio: 'inherit',
  });

  // Wait for process to complete
  await new Promise<void>((resolve, reject) => {
    const timeout = options.timeout
      ? setTimeout(() => {
          proc.kill();
          reject(
            new Error(`Profile command timed out after ${options.timeout}ms`),
          );
        }, options.timeout)
      : null;

    proc.on('close', (code) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Profile command exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(err);
    });
  });

  // Find generated *.cpuprofile file in profiles directory
  const profileFiles = await glob('*.cpuprofile', { cwd: profilesDir });

  if (profileFiles.length === 0) {
    throw new Error(
      'No CPU profile generated. Ensure the command runs Node.js code.',
    );
  }

  // Return most recent profile file
  return await getMostRecentFile(profileFiles, profilesDir);
};

/**
 * Get the most recently modified file from a list
 */
const getMostRecentFile = async (
  files: string[],
  cwd: string,
): Promise<string> => {
  let mostRecent = files[0];
  let mostRecentTime = (await stat(`${cwd}/${mostRecent}`)).mtimeMs;

  for (const file of files.slice(1)) {
    const filePath = `${cwd}/${file}`;
    const fileTime = (await stat(filePath)).mtimeMs;
    if (fileTime > mostRecentTime) {
      mostRecent = file;
      mostRecentTime = fileTime;
    }
  }

  return `${cwd}/${mostRecent}`;
};
