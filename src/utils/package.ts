/**
 * Package Utilities
 *
 * Utilities for working with package.json files and package structure.
 *
 * @packageDocumentation
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Find the nearest package.json and return its directory
 *
 * @param startDir - Directory to start searching from
 * @returns Path to directory containing package.json
 */
export const findPackageRoot = async (startDir: string): Promise<string> => {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    try {
      const packagePath = path.join(currentDir, 'package.json');
      await readFile(packagePath, 'utf-8');
      return currentDir;
    } catch {
      // package.json not found, go up one directory
      currentDir = path.dirname(currentDir);
    }
  }

  // No package.json found, return starting directory
  return startDir;
};
