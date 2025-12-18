import { expect } from 'bupkis';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import {
  generateTimestampedFilename,
  resolveOutputPath,
} from '../../src/core/output-path-resolver.js';

describe('resolveOutputPath', () => {
  it('should return undefined when no paths provided', () => {
    const result = resolveOutputPath(undefined, undefined, 'default.json');
    expect(result, 'to be undefined');
  });

  it('should use outputFile as-is when absolute', () => {
    const absolutePath = '/tmp/custom.json';
    const result = resolveOutputPath(undefined, absolutePath, 'default.json');
    expect(result, 'to equal', absolutePath);
  });

  it('should resolve outputFile relative to cwd when no outputDir', () => {
    const result = resolveOutputPath(undefined, 'custom.json', 'default.json');
    expect(result, 'to equal', resolve(process.cwd(), 'custom.json'));
  });

  it('should join outputFile with outputDir when both provided', () => {
    const result = resolveOutputPath(
      '/tmp/results',
      'custom.json',
      'default.json',
    );
    expect(result, 'to equal', '/tmp/results/custom.json');
  });

  it('should fall back to default filename when only outputDir provided', () => {
    const result = resolveOutputPath('/tmp/results', undefined, 'default.json');
    expect(result, 'to equal', '/tmp/results/default.json');
  });

  it('should handle outputFile with directory separators', () => {
    const result = resolveOutputPath(
      '/tmp',
      'subdir/custom.json',
      'default.json',
    );
    expect(result, 'to equal', '/tmp/subdir/custom.json');
  });
});

describe('generateTimestampedFilename', () => {
  it('should generate filename with json extension', () => {
    const result = generateTimestampedFilename('json');
    expect(
      result,
      'to match',
      /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
    );
  });

  it('should generate filename with csv extension', () => {
    const result = generateTimestampedFilename('csv');
    expect(
      result,
      'to match',
      /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/,
    );
  });

  it('should generate filename with arbitrary extension', () => {
    const result = generateTimestampedFilename('xml');
    expect(
      result,
      'to match',
      /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.xml$/,
    );
  });

  it('should generate different filenames at different times', async () => {
    const result1 = generateTimestampedFilename('json');
    // Wait a second to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const result2 = generateTimestampedFilename('json');
    expect(result1, 'not to equal', result2);
  });

  it('should use zero-padded date and time components', () => {
    const result = generateTimestampedFilename('json');
    // The format should be: benchmarks-YYYY-MM-DD-HH-MM-SS.ext
    // All numeric parts should be properly padded (year 4 digits, rest 2 digits)
    const match = result.match(
      /^benchmarks-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json$/,
    );
    expect(match, 'to be truthy');
    if (match) {
      // Verify all parts are numbers within valid ranges
      const [, year, month, day, hour, minute, second] = match;
      expect(Number(year), 'to be greater than', 2020);
      expect(Number(month), 'to be within', 1, 12);
      expect(Number(day), 'to be within', 1, 31);
      expect(Number(hour), 'to be within', 0, 23);
      expect(Number(minute), 'to be within', 0, 59);
      expect(Number(second), 'to be within', 0, 59);
    }
  });
});
