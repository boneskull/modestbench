import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { safeParsePartialConfig } from '../../../src/config/schema.js';

describe('Budget Wildcard Configuration', () => {
  describe('pattern detection', () => {
    it('should categorize exact file/suite/task as exact match', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              myTask: {
                absolute: { maxTime: 100 },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(Object.keys(resolved.exact).length, 'to equal', 1);
        expect(resolved.exact['test.bench.js/default/myTask'], 'to be defined');
        expect(resolved.patterns.length, 'to equal', 0);
      }
    });

    it('should categorize glob file pattern as pattern', () => {
      const config = {
        budgets: {
          '**/*.bench.js': {
            '*': {
              '*': {
                absolute: { maxTime: 100 },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(Object.keys(resolved.exact).length, 'to equal', 0);
        expect(resolved.patterns.length, 'to equal', 1);
        expect(resolved.patterns[0]!.filePattern, 'to equal', '**/*.bench.js');
        expect(resolved.patterns[0]!.suitePattern, 'to equal', '*');
        expect(resolved.patterns[0]!.taskPattern, 'to equal', '*');
      }
    });

    it('should categorize wildcard suite as pattern', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            '*': {
              myTask: {
                absolute: { maxTime: 100 },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(Object.keys(resolved.exact).length, 'to equal', 0);
        expect(resolved.patterns.length, 'to equal', 1);
        expect(resolved.patterns[0]!.suitePattern, 'to equal', '*');
        expect(resolved.patterns[0]!.taskPattern, 'to equal', 'myTask');
      }
    });

    it('should categorize wildcard task as pattern', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              '*': {
                absolute: { maxTime: 100 },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(Object.keys(resolved.exact).length, 'to equal', 0);
        expect(resolved.patterns.length, 'to equal', 1);
        expect(resolved.patterns[0]!.taskPattern, 'to equal', '*');
      }
    });
  });

  describe('specificity calculation', () => {
    it('should sort patterns by specificity descending', () => {
      const config = {
        budgets: {
          '**/*': {
            '*': {
              '*': { absolute: { maxTime: 1000 } },
            },
          },
          '**/*.bench.js': {
            '*': {
              '*': { absolute: { maxTime: 500 } },
            },
          },
          'test.bench.js': {
            '*': {
              '*': { absolute: { maxTime: 100 } },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(resolved.patterns.length, 'to equal', 3);

        // Should be sorted by specificity descending
        // Exact file (2) > glob with specificity (1) > generic glob (0)
        expect(resolved.patterns[0]!.filePattern, 'to equal', 'test.bench.js');
        expect(resolved.patterns[0]!.specificity, 'to equal', 2);

        expect(resolved.patterns[1]!.filePattern, 'to equal', '**/*.bench.js');
        expect(resolved.patterns[1]!.specificity, 'to equal', 1);

        expect(resolved.patterns[2]!.filePattern, 'to equal', '**/*');
        expect(resolved.patterns[2]!.specificity, 'to equal', 0);
      }
    });
  });

  describe('budget value transformation', () => {
    it('should transform time strings in pattern budgets', () => {
      const config = {
        budgets: {
          '**/*': {
            '*': {
              '*': {
                absolute: { maxTime: '10ms' },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(
          resolved.patterns[0]!.budget.absolute?.maxTime,
          'to equal',
          10_000_000,
        );
      }
    });

    it('should transform percentage strings in pattern budgets', () => {
      const config = {
        budgets: {
          '**/*': {
            '*': {
              '*': {
                relative: { maxRegression: '15%' },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(
          resolved.patterns[0]!.budget.relative?.maxRegression,
          'to equal',
          0.15,
        );
      }
    });
  });

  describe('mixed exact and pattern budgets', () => {
    it('should separate exact and pattern budgets correctly', () => {
      const config = {
        budgets: {
          // This is a pattern (glob file)
          '**/*': {
            '*': {
              '*': { relative: { maxRegression: '15%' } },
            },
          },
          // This file has both pattern (wildcard suite) and exact match entries
          'api.bench.js': {
            '*': {
              '*': { absolute: { maxTime: '50ms' } },
            },
            'User Routes': {
              getUser: { absolute: { maxTime: '5ms' } },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;

        // Should have one exact match (User Routes/getUser)
        expect(Object.keys(resolved.exact).length, 'to equal', 1);
        expect(
          resolved.exact['api.bench.js/User Routes/getUser'],
          'to be defined',
        );

        // Should have two patterns: **/* and api.bench.js/*/*)
        expect(resolved.patterns.length, 'to equal', 2);
      }
    });
  });

  describe('real-world configuration example', () => {
    it('should handle comprehensive wildcard configuration', () => {
      const config = {
        budgets: {
          // Global default for all benchmarks
          '**/*': {
            '*': {
              '*': {
                relative: { maxRegression: '15%' },
              },
            },
          },
          // API benchmarks should be faster
          '**/api/**/*.bench.js': {
            '*': {
              '*': {
                absolute: { maxTime: '50ms' },
              },
            },
          },
          // Specific file overrides
          'benchmarks/api/users.bench.js': {
            'User Routes': {
              '*': { absolute: { maxTime: '20ms' } },
              getUser: { absolute: { maxTime: '5ms' } },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);
      expect(result.success, 'to be true');

      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;

        // Should have one exact match (getUser)
        expect(Object.keys(resolved.exact).length, 'to equal', 1);
        expect(
          resolved.exact['benchmarks/api/users.bench.js/User Routes/getUser']
            ?.absolute?.maxTime,
          'to equal',
          5_000_000,
        );

        // Should have patterns sorted by specificity
        expect(resolved.patterns.length, 'to equal', 3);

        // Verify patterns are sorted (most specific first)
        // Note: exact file with exact suite and wildcard task has specificity 3
        // Glob with specific parts has specificity 1
        // Generic glob has specificity 0
        const specificities = resolved.patterns.map((p) => p.specificity);
        expect(
          specificities[0],
          'to be greater than or equal to',
          specificities[1],
        );
        expect(
          specificities[1],
          'to be greater than or equal to',
          specificities[2],
        );
      }
    });
  });
});
