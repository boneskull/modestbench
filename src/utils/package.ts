/**
 * Package Utilities
 *
 * Utilities for working with package.json files and package structure.
 *
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Cached package version, loaded at module initialization
 *
 * NOTE: This relies on package.json being at the same relative path from both
 * src/ and dist/ directories (../../package.json). If the build output
 * structure changes, this will break.
 */
const cachedPackageVersion = (() => {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkgContent = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent) as { version: string };
    return pkg.version;
  } catch {
    // Fallback if package.json cannot be read (shouldn't happen in normal use)
    return 'unknown';
  }
})();

/**
 * Get the ModestBench package version
 *
 * @returns The version string from package.json
 */
export const getPackageVersion = (): string => {
  return cachedPackageVersion;
};

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
