import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import {
  baselineStorageSchema,
  budgetSchema,
  parsePercentageString,
  parseTimeString,
} from '../../../src/config/budget-schema.js';

describe('Budget Schema', () => {
  describe('parseTimeString', () => {
    it('should parse nanoseconds', () => {
      expect(parseTimeString('100ns'), 'to equal', 100);
    });

    it('should parse microseconds', () => {
      expect(parseTimeString('50us'), 'to equal', 50_000);
    });

    it('should parse milliseconds', () => {
      expect(parseTimeString('10ms'), 'to equal', 10_000_000);
    });

    it('should parse seconds', () => {
      expect(parseTimeString('5s'), 'to equal', 5_000_000_000);
    });

    it('should parse decimal values', () => {
      expect(parseTimeString('2.5ms'), 'to equal', 2_500_000);
    });

    it('should throw on invalid format', () => {
      expect(
        () => parseTimeString('invalid'),
        'to throw',
        'Invalid time format: "invalid". Expected format like "10ms", "5s", "100us", "50ns"',
      );
    });

    it('should throw on missing unit', () => {
      expect(
        () => parseTimeString('100'),
        'to throw',
        'Invalid time format: "100". Expected format like "10ms", "5s", "100us", "50ns"',
      );
    });
  });

  describe('parsePercentageString', () => {
    it('should parse percentage', () => {
      expect(parsePercentageString('10%'), 'to equal', 0.1);
    });

    it('should parse decimal percentage', () => {
      expect(parsePercentageString('5.5%'), 'to equal', 0.055);
    });

    it('should throw on invalid format', () => {
      expect(
        () => parsePercentageString('invalid'),
        'to throw',
        'Invalid percentage format: "invalid". Expected format like "10%", "5.5%"',
      );
    });

    it('should throw on missing percent sign', () => {
      expect(
        () => parsePercentageString('10'),
        'to throw',
        'Invalid percentage format: "10". Expected format like "10%", "5.5%"',
      );
    });
  });

  describe('budgetSchema', () => {
    it('should validate absolute budget with time string', () => {
      const result = budgetSchema.parse({
        absolute: {
          maxTime: '10ms',
        },
      });

      expect(result, 'to satisfy', {
        absolute: {
          maxTime: 10_000_000,
        },
      });
    });

    it('should validate absolute budget with nanoseconds', () => {
      const result = budgetSchema.parse({
        absolute: {
          maxTime: 10_000_000,
        },
      });

      expect(result, 'to satisfy', {
        absolute: {
          maxTime: 10_000_000,
        },
      });
    });

    it('should validate relative budget with percentage string', () => {
      const result = budgetSchema.parse({
        relative: {
          maxRegression: '10%',
        },
      });

      expect(result, 'to satisfy', {
        relative: {
          maxRegression: 0.1,
        },
      });
    });

    it('should validate relative budget with decimal', () => {
      const result = budgetSchema.parse({
        relative: {
          maxRegression: 0.1,
        },
      });

      expect(result, 'to satisfy', {
        relative: {
          maxRegression: 0.1,
        },
      });
    });

    it('should validate combined absolute and relative budget', () => {
      const result = budgetSchema.parse({
        absolute: {
          maxTime: '10ms',
          minOpsPerSec: 100_000,
        },
        relative: {
          baseline: 'production-v1.0',
          maxRegression: '5%',
        },
      });

      expect(result, 'to satisfy', {
        absolute: {
          maxTime: 10_000_000,
          minOpsPerSec: 100_000,
        },
        relative: {
          baseline: 'production-v1.0',
          maxRegression: 0.05,
        },
      });
    });

    it('should reject invalid budget', () => {
      expect(
        () =>
          budgetSchema.parse({
            absolute: {
              maxTime: 'invalid',
            },
          }),
        'to throw',
      );
    });
  });

  describe('baselineStorageSchema', () => {
    it('should validate baseline storage', () => {
      const result = baselineStorageSchema.parse({
        baselines: {
          'production-v1.0': {
            branch: 'main',
            commit: '1234567890abcdef1234567890abcdef12345678',
            date: '2025-10-26T12:00:00Z',
            name: 'production-v1.0',
            runId: 'k3m9x2p',
            summary: {
              parseConfig: {
                mean: 8_200_000,
                opsPerSecond: 121_951,
                p99: 9_000_000,
              },
            },
          },
        },
        default: 'production-v1.0',
        version: '1.0.0',
      });

      expect(result, 'to have properties', ['version', 'baselines', 'default']);
      expect(result.version, 'to equal', '1.0.0');
      expect(result.baselines['production-v1.0'], 'to be defined');
      expect(result.default, 'to equal', 'production-v1.0');
    });

    it('should coerce date strings', () => {
      const result = baselineStorageSchema.parse({
        baselines: {
          test: {
            date: '2025-10-26T12:00:00Z',
            name: 'test',
            runId: 'abc1234',
            summary: {},
          },
        },
        version: '1.0.0',
      });

      expect(result.baselines.test!.date, 'to be a', Date);
    });

    it('should allow optional fields', () => {
      const result = baselineStorageSchema.parse({
        baselines: {
          test: {
            date: '2025-10-26T12:00:00Z',
            name: 'test',
            runId: 'abc1234',
            summary: {},
          },
        },
        version: '1.0.0',
      });

      expect(result.baselines.test!.commit, 'to be undefined');
      expect(result.baselines.test!.branch, 'to be undefined');
      expect(result.default, 'to be undefined');
    });

    it('should reject invalid runId format', () => {
      expect(
        () =>
          baselineStorageSchema.parse({
            baselines: {
              test: {
                date: '2025-10-26T12:00:00Z',
                name: 'test',
                runId: 'invalid-run-id',
                summary: {},
              },
            },
            version: '1.0.0',
          }),
        'to throw',
      );
    });

    it('should reject runId with uppercase characters', () => {
      expect(
        () =>
          baselineStorageSchema.parse({
            baselines: {
              test: {
                date: '2025-10-26T12:00:00Z',
                name: 'test',
                runId: 'ABC1234',
                summary: {},
              },
            },
            version: '1.0.0',
          }),
        'to throw',
      );
    });

    it('should reject invalid commit hash length', () => {
      expect(
        () =>
          baselineStorageSchema.parse({
            baselines: {
              test: {
                commit: 'short',
                date: '2025-10-26T12:00:00Z',
                name: 'test',
                runId: 'abc1234',
                summary: {},
              },
            },
            version: '1.0.0',
          }),
        'to throw',
      );
    });

    it('should reject commit hash with non-hex characters', () => {
      expect(
        () =>
          baselineStorageSchema.parse({
            baselines: {
              test: {
                commit: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
                date: '2025-10-26T12:00:00Z',
                name: 'test',
                runId: 'abc1234',
                summary: {},
              },
            },
            version: '1.0.0',
          }),
        'to throw',
      );
    });
  });
});
