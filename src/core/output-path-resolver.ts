import { isAbsolute, join, resolve } from 'node:path';

/**
 * Resolves the final output path for a reporter
 *
 * @param outputDir - Optional output directory from --output flag
 * @param outputFile - Optional output filename from --output-file flag
 * @param defaultFilename - Default filename to use if none specified
 * @returns Resolved output path, or undefined if no output to file requested
 */
export const resolveOutputPath = (
  outputDir?: string,
  outputFile?: string,
  defaultFilename?: string,
): string | undefined => {
  // If outputFile is provided
  if (outputFile) {
    // If outputFile is absolute, use as-is
    if (isAbsolute(outputFile)) {
      return outputFile;
    }

    // If outputDir specified, join them
    if (outputDir) {
      return join(outputDir, outputFile);
    }

    // Otherwise, resolve relative to cwd
    return resolve(process.cwd(), outputFile);
  }

  // Fall back to default behavior
  if (outputDir && defaultFilename) {
    return join(outputDir, defaultFilename);
  }

  return undefined;
};
