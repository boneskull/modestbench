import { expect } from 'bupkis';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { resolveOutputPath } from '../../src/core/output-path-resolver.ts';

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
