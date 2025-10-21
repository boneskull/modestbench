/**
 * Contract tests for benchmark file format validation
 *
 * Tests that the schema accepts both traditional suite-based format and
 * simplified flat task definitions.
 */

import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { BenchmarkSuite } from '../../src/types/core.js';

import { benchmarkFileSchema } from '../../src/core/benchmark-schema.js';

describe('Benchmark file format validation', () => {
  describe('traditional suite-based format', () => {
    it('should accept traditional format with suites', () => {
      const input = {
        suites: {
          'My Suite': {
            benchmarks: {
              'task one': () => {
                // benchmark code
              },
            },
          },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });

    it('should accept traditional format with suite explicitly named "default"', () => {
      const input = {
        suites: {
          default: {
            benchmarks: {
              'task one': () => {
                // benchmark code
              },
            },
          },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');

      // Verify it stays as-is (no transformation)
      if (result.success) {
        expect('default' in result.data.suites, 'to be true');
        expect(
          'task one' in result.data.suites['default'].benchmarks,
          'to be true',
        );
      }
    });

    it('should accept suite with task object format', () => {
      const input = {
        suites: {
          'My Suite': {
            benchmarks: {
              'task one': {
                fn: () => {
                  // benchmark code
                },
              },
            },
          },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });

    it('should accept multiple suites', () => {
      const input = {
        suites: {
          'Suite One': {
            benchmarks: {
              'task one': () => {},
            },
          },
          'Suite Two': {
            benchmarks: {
              'task two': () => {},
            },
          },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });
  });

  describe('simplified flat format (no suites)', () => {
    it('should accept flat format with function shorthand', () => {
      const input = {
        'Array.push': () => {
          // benchmark code
        },
        'Array.unshift': () => {
          // benchmark code
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });

    it('should reject flat format with task objects (functions only)', () => {
      const input = {
        'Array.push': {
          fn: () => {
            // benchmark code
          },
        },
        'Array.unshift': {
          fn: () => {
            // benchmark code
          },
          metadata: { description: 'test' },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });

    it('should reject flat format with task objects (use suite format for task metadata)', () => {
      const input = {
        'task one': () => {},
        'task two': {
          fn: () => {},
          metadata: { note: 'something' },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');

      // Use suite format instead
      const suiteFormat = {
        suites: {
          default: {
            benchmarks: {
              'task one': () => {},
              'task two': {
                fn: () => {},
                metadata: { note: 'something' },
              },
            },
          },
        },
      };

      const suiteResult = benchmarkFileSchema.safeParse(suiteFormat);
      expect(suiteResult.success, 'to be true');
    });

    it('should reject flat format with config (use suite format instead)', () => {
      const input = {
        config: {
          iterations: 1000,
        },
        'task one': () => {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });

    it('should reject flat format with metadata (use suite format instead)', () => {
      const input = {
        metadata: {
          author: 'test',
        },
        'task one': () => {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });

    it('should reject flat format with tags (use suite format instead)', () => {
      const input = {
        tags: ['performance', 'arrays'],
        'task one': () => {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });

    it('should reject flat format with config/metadata/tags (use suite format instead)', () => {
      const input = {
        config: { iterations: 500 },
        metadata: { author: 'test' },
        tags: ['test'],
        'task one': () => {},
        'task two': {
          fn: () => {},
          tags: ['specific'],
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });
  });

  describe('validation errors', () => {
    it('should reject when neither suites nor tasks provided', () => {
      const input = {
        config: { iterations: 1000 },
        metadata: { note: 'no tasks' },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });

    it('should reject empty suites object', () => {
      const input = {
        suites: {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });

    it('should reject when task has invalid structure', () => {
      const input = {
        'task one': 'not a function or object',
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });

    it('should reject when task object is missing fn', () => {
      const input = {
        'task one': {
          metadata: { note: 'no fn' },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be false');
    });
  });

  describe('schema transformation', () => {
    it('should transform flat format to normalized structure with default suite', () => {
      const input = {
        'task one': () => {},
        'task two': () => {},
      };

      const data = benchmarkFileSchema.parse(input);

      expect(Object.keys(data.suites), 'not to be empty');

      // Get the default suite (there should be exactly one)
      const suites = data.suites as Record<string, BenchmarkSuite>;
      const suiteNames = Object.keys(suites);
      expect(suiteNames, 'to have length', 1);

      const suiteName = suiteNames[0]!;
      const defaultSuite = suites[suiteName]!;
      expect(defaultSuite, 'to be truthy');
      expect(defaultSuite.benchmarks, 'to be truthy');
      expect('task one' in defaultSuite.benchmarks, 'to be true');
      expect('task two' in defaultSuite.benchmarks, 'to be true');
    });

    it('should use suite format for config/metadata/tags support', () => {
      // Flat format with config/metadata/tags is NOT supported
      const flatWithConfig = {
        config: { iterations: 1000 },
        metadata: { author: 'test' },
        tags: ['performance'],
        'task one': () => {},
      };

      expect(() => benchmarkFileSchema.parse(flatWithConfig), 'to throw');

      // Use suite format instead
      const suiteFormat = {
        config: { iterations: 1000 },
        metadata: { author: 'test' },
        suites: {
          default: {
            benchmarks: {
              'task one': () => {},
            },
          },
        },
        tags: ['performance'],
      };

      expect(() => benchmarkFileSchema.parse(suiteFormat), 'not to throw');
    });

    it('should not transform traditional format', () => {
      const input = {
        suites: {
          'My Suite': {
            benchmarks: {
              'task one': () => {},
            },
          },
        },
      };

      expect(() => benchmarkFileSchema.parse(input), 'not to throw');
    });
  });
});
