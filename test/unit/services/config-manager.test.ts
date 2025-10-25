import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { ModestBenchConfigurationManager } from '../../../src/services/config-manager.js';

describe('ModestBenchConfigurationManager', () => {
  describe('merge()', () => {
    it('should merge empty configs', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge({}, {});

      expect(result, 'to be an object');
      expect(result.reporters, 'to be an array');
      expect(result.iterations, 'to be a number');
    });

    it('should handle undefined values in configs', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge({ iterations: 100 }, {});

      // Merge should preserve previous values when not overridden
      expect(result.iterations, 'to be a number');
      expect(result.iterations, 'to be greater than', 0);
    });

    it('should replace arrays rather than merge them', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge(
        { reporters: ['human'] },
        { reporters: ['json', 'csv'] },
      );

      expect(result.reporters.length, 'to equal', 2);
      expect(result.reporters, 'to contain', 'json');
      expect(result.reporters, 'to contain', 'csv');
      expect(result.reporters, 'not to contain', 'human');
    });

    it('should replace exclude arrays completely', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge(
        { exclude: ['node_modules/**'] },
        { exclude: ['dist/**', 'build/**'] },
      );

      expect(result.exclude.length, 'to equal', 2);
      expect(result.exclude, 'to contain', 'dist/**');
      expect(result.exclude, 'to contain', 'build/**');
      expect(result.exclude, 'not to contain', 'node_modules/**');
    });

    it('should replace tags arrays completely', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge(
        { tags: ['performance'] },
        { tags: ['unit', 'integration'] },
      );

      expect(result.tags.length, 'to equal', 2);
      expect(result.tags, 'to contain', 'unit');
      expect(result.tags, 'to contain', 'integration');
      expect(result.tags, 'not to contain', 'performance');
    });

    it('should deep merge nested objects (reporterConfig)', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge(
        { reporterConfig: { human: { color: true } } },
        { reporterConfig: { json: { pretty: false } } },
      );

      expect(result.reporterConfig, 'to satisfy', {
        human: { color: true },
        json: { pretty: false },
      });
    });

    it('should deep merge nested objects (metadata)', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge(
        { metadata: { project: 'test', version: '1.0' } },
        { metadata: { author: 'tester' } },
      );

      expect(result.metadata, 'to satisfy', {
        author: 'tester',
        project: 'test',
        version: '1.0',
      });
    });

    it('should deep merge nested objects (thresholds)', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge(
        { thresholds: { maxMean: 1000 } },
        { thresholds: { maxP95: 5000 } },
      );

      expect(result.thresholds, 'to satisfy', {
        maxMean: 1000,
        maxP95: 5000,
      });
    });

    it('should apply precedence correctly (later configs override earlier ones)', () => {
      const manager = new ModestBenchConfigurationManager();
      const result = manager.merge(
        { iterations: 100, warmup: 10 },
        { iterations: 500 },
        { warmup: 20 },
      );

      expect(result.iterations, 'to equal', 500);
      expect(result.warmup, 'to equal', 20);
    });

    it('should not mutate input configs', () => {
      const manager = new ModestBenchConfigurationManager();
      const config1 = { metadata: { test: true }, reporters: ['human'] };
      const config2 = { reporters: ['json'] };

      const result = manager.merge(config1, config2);

      // Verify input configs weren't mutated (content preserved)
      expect(config1.reporters.length, 'to equal', 1);
      expect(config1.reporters[0], 'to equal', 'human');
      expect(config1.metadata.test, 'to equal', true);
      expect(config2.reporters.length, 'to equal', 1);
      expect(config2.reporters[0], 'to equal', 'json');

      // Result has content from config2
      expect(result.reporters[0], 'to equal', 'json');
    });
  });

  describe('applySmartDefaults() - limitBy logic', () => {
    it('should default to iterations when neither time nor iterations provided', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({});
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        {},
        {},
      );

      expect(result.limitBy, 'to equal', 'iterations');
    });

    it('should use time when only --time provided', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({});
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { time: 5000 },
        {},
      );

      expect(result.limitBy, 'to equal', 'time');
    });

    it('should use iterations when only --iterations provided', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({});
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { iterations: 1000 },
        {},
      );

      expect(result.limitBy, 'to equal', 'iterations');
    });

    it('should use any when both --time and --iterations provided', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({});
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { iterations: 1000, time: 5000 },
        {},
      );

      expect(result.limitBy, 'to equal', 'any');
    });

    it('should use time when only -t short flag provided', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({});
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { t: 5000 },
        {},
      );

      expect(result.limitBy, 'to equal', 'time');
    });

    it('should use iterations when only -i short flag provided', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({});
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { i: 1000 },
        {},
      );

      expect(result.limitBy, 'to equal', 'iterations');
    });

    it('should respect explicit limitBy from CLI', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({ limitBy: 'any' as any });
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { iterations: 1000, 'limit-by': 'any', time: 5000 },
        {},
      );

      // When limitBy is explicitly provided in CLI, merged config is returned as-is
      expect(result.limitBy, 'to equal', 'any');
    });

    it('should respect explicit limitBy from file config', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({ limitBy: 'time' });
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { iterations: 1000 },
        { limitBy: 'time' },
      );

      // When limitBy is in file config, merged config is returned as-is
      expect(result.limitBy, 'to equal', 'time');
    });

    it('should prefer CLI limitBy over file config', () => {
      const manager = new ModestBenchConfigurationManager();
      // Merge with CLI value taking precedence
      const merged = manager.merge(
        { limitBy: 'time' },
        { limitBy: 'any' as any },
      );
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { limitBy: 'any' },
        { limitBy: 'time' },
      );

      // Merged config should have CLI value which is preserved
      expect(result.limitBy, 'to equal', 'any');
    });

    it('should not change limitBy if already set in merged config and present in fileConfig', () => {
      const manager = new ModestBenchConfigurationManager();
      const merged = manager.merge({ limitBy: 'any' as any });
      const result = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        { iterations: 1000, time: 5000 },
        { limitBy: 'any' },
      );

      // Should keep the merged value when fileConfig has limitBy
      expect(result.limitBy, 'to equal', 'any');
    });
  });
});
