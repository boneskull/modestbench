import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { safeParseConfig } from '../../src/config/schema.js';

describe('safeParseConfig()', () => {
  describe('valid configurations', () => {
    it('should accept a complete valid configuration', () => {
      const config = {
        bail: false,
        exclude: ['node_modules/**'],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '**/*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);

      expect(result.success, 'to be true');
      if (result.success) {
        expect(result.data, 'to satisfy', config);
      }
    });

    it('should accept valid limitBy enum values', () => {
      const baseConfig = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'time' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['json'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      for (const limitBy of ['time', 'iterations', 'any', 'all'] as const) {
        const result = safeParseConfig({ ...baseConfig, limitBy });
        expect(result.success, 'to be true');
      }
    });

    it('should accept pattern as string or array', () => {
      const baseConfig = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const stringPattern = safeParseConfig({
        ...baseConfig,
        pattern: '*.bench.ts',
      });
      expect(stringPattern.success, 'to be true');

      const arrayPattern = safeParseConfig({
        ...baseConfig,
        pattern: ['*.bench.ts', '*.bench.js'],
      });
      expect(arrayPattern.success, 'to be true');
    });

    it('should accept valid threshold configuration', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {
          maxMarginOfError: 5,
          maxMean: 1000,
          maxP95: 5000,
          maxP99: 10_000,
          maxStdDev: 500,
          minOpsPerSecond: 1000,
        },
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be true');
    });
  });

  describe('invalid configurations', () => {
    it('should reject missing required fields', () => {
      const result = safeParseConfig({});
      expect(result.success, 'to be false');
    });

    it('should reject invalid limitBy value', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'invalid',
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject negative iterations', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: -100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject zero iterations', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 0,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject negative time', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'time' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: -1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject negative warmup', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: -1,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject empty reporters array', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: [],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject empty pattern string', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject empty outputDir string', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: '',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject negative threshold values', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {
          maxMean: -1000,
        },
        time: 1000,
        timeout: 30_000,
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });

    it('should reject extra unknown fields (strict mode)', () => {
      const config = {
        bail: false,
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations' as const,
        metadata: {},
        outputDir: './results',
        pattern: '*.bench.ts',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 1000,
        timeout: 30_000,
        unknownField: 'should not be allowed',
        verbose: false,
        warmup: 0,
      };

      const result = safeParseConfig(config);
      expect(result.success, 'to be false');
    });
  });
});
