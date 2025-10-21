/**
 * Contract tests for benchmark file format validation
 *
 * Tests that the schema accepts both traditional suite-based format and
 * simplified flat task definitions.
 */

import { expect } from 'bupkis';
import { describe, it } from 'node:test';

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
          'task one' in result.data.suites['default']!.benchmarks,
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

    it('should accept flat format with task objects', () => {
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
      expect(result.success, 'to be true');
    });

    it('should accept flat format with mixed function/object tasks', () => {
      const input = {
        'task one': () => {},
        'task two': {
          fn: () => {},
          metadata: { note: 'something' },
        },
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });

    it('should accept flat format with config', () => {
      const input = {
        config: {
          iterations: 1000,
        },
        'task one': () => {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });

    it('should accept flat format with metadata', () => {
      const input = {
        metadata: {
          author: 'test',
        },
        'task one': () => {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });

    it('should accept flat format with tags', () => {
      const input = {
        tags: ['performance', 'arrays'],
        'task one': () => {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');
    });

    it('should accept flat format with all optional fields', () => {
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
      expect(result.success, 'to be true');
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

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');

      if (result.success) {
        expect(result.data.suites, 'to be truthy');
        expect(Object.keys(result.data.suites).length, 'to be greater than', 0);

        // Get the default suite (there should be exactly one)
        const suiteNames = Object.keys(result.data.suites);
        expect(suiteNames.length, 'to equal', 1);

        const suiteName = suiteNames[0];
        expect(suiteName, 'to be truthy');

        const defaultSuite = result.data.suites[suiteName!];
        expect(defaultSuite?.benchmarks, 'to be truthy');
        expect('task one' in (defaultSuite?.benchmarks ?? {}), 'to be true');
        expect('task two' in (defaultSuite?.benchmarks ?? {}), 'to be true');
      }
    });

    it('should preserve config/metadata/tags when transforming flat format', () => {
      const input = {
        config: { iterations: 1000 },
        metadata: { author: 'test' },
        tags: ['performance'],
        'task one': () => {},
      };

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');

      if (result.success) {
        expect(result.data.config, 'to be truthy');
        expect(result.data.metadata, 'to be truthy');
        expect(result.data.tags, 'to be truthy');
        expect(result.data.suites, 'to be truthy');
      }
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

      const result = benchmarkFileSchema.safeParse(input);
      expect(result.success, 'to be true');

      if (result.success) {
        expect('My Suite' in result.data.suites, 'to be true');
      }
    });
  });
});
