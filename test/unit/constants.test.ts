import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import {
  BENCHMARK_FILE_EXTENSIONS,
  BENCHMARK_FILE_PATTERN,
} from '../../src/constants.js';

describe('constants', () => {
  describe('BENCHMARK_FILE_EXTENSIONS', () => {
    it('should include all TypeScript extensions', () => {
      expect(BENCHMARK_FILE_EXTENSIONS, 'to contain', '.ts');
      expect(BENCHMARK_FILE_EXTENSIONS, 'to contain', '.cts');
      expect(BENCHMARK_FILE_EXTENSIONS, 'to contain', '.mts');
    });

    it('should include all JavaScript extensions', () => {
      expect(BENCHMARK_FILE_EXTENSIONS, 'to contain', '.js');
      expect(BENCHMARK_FILE_EXTENSIONS, 'to contain', '.cjs');
      expect(BENCHMARK_FILE_EXTENSIONS, 'to contain', '.mjs');
    });

    it('should be a Set for efficient lookups', () => {
      expect(BENCHMARK_FILE_EXTENSIONS, 'to be a', Set);
    });
  });

  describe('BENCHMARK_FILE_PATTERN', () => {
    it('should create a glob pattern with all extensions', () => {
      expect(BENCHMARK_FILE_PATTERN, 'to be a', 'string');
      expect(BENCHMARK_FILE_PATTERN, 'to match', /\.bench\./);
      expect(BENCHMARK_FILE_PATTERN, 'to match', /\{.*\}/);
    });
  });
});
