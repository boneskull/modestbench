import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { safeParsePartialConfig } from '../../../src/config/schema.js';

describe('Budget Configuration Schema Integration', () => {
  describe('budgets field validation', () => {
    it('should accept valid budget configuration with nested structure', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              task: {
                absolute: {
                  maxTime: 10_000_000,
                  minOpsPerSec: 100_000,
                },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
      // Verify transform created ResolvedBudgets with exact matches
      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(resolved.exact['test.bench.js/default/task'], 'to be defined');
      }
    });

    it('should accept relative budget with maxRegression', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              task: {
                relative: {
                  maxRegression: 0.1,
                },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
    });

    it('should accept combined absolute and relative budgets', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              task: {
                absolute: {
                  maxTime: 15_000_000,
                },
                relative: {
                  maxRegression: 0.2,
                },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
    });

    it('should accept time strings for absolute budgets', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              task: {
                absolute: {
                  maxP99: '20ms',
                  maxTime: '10ms',
                },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);

      // Config schema accepts strings as-is (validation happens at runtime)
      expect(result.success, 'to be true');
    });

    it('should accept percentage strings for relative budgets', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              task: {
                relative: {
                  maxRegression: '15%',
                },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);

      // Config schema accepts strings as-is (validation happens at runtime)
      expect(result.success, 'to be true');
    });

    it('should accept various budget structures (lenient validation)', () => {
      const config = {
        budgets: {
          'test.bench.js': {
            default: {
              task: {
                absolute: {
                  maxTime: 100_000,
                },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);

      // Config schema is lenient - detailed validation happens at runtime
      expect(result.success, 'to be true');
    });
  });

  describe('baseline field validation', () => {
    it('should accept valid baseline name', () => {
      const config = {
        baseline: 'production-v1.0',
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
      if (result.success) {
        expect(result.data.baseline, 'to equal', 'production-v1.0');
      }
    });

    it('should accept undefined baseline', () => {
      const config = {};

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
    });
  });

  describe('budgetMode field validation', () => {
    it('should accept fail mode', () => {
      const config = {
        budgetMode: 'fail',
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
      if (result.success) {
        expect(result.data.budgetMode, 'to equal', 'fail');
      }
    });

    it('should accept warn mode', () => {
      const config = {
        budgetMode: 'warn',
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
      if (result.success) {
        expect(result.data.budgetMode, 'to equal', 'warn');
      }
    });

    it('should accept report mode', () => {
      const config = {
        budgetMode: 'report',
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
      if (result.success) {
        expect(result.data.budgetMode, 'to equal', 'report');
      }
    });

    it('should reject invalid budget mode', () => {
      const config = {
        budgetMode: 'invalid',
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be false');
    });

    it('should accept undefined budgetMode', () => {
      const config = {};

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
    });
  });

  describe('full configuration with budgets', () => {
    it('should accept complete config with nested budget structure', () => {
      const config = {
        bail: false,
        baseline: 'main',
        budgetMode: 'fail',
        budgets: {
          'test.bench.js': {
            default: {
              criticalPath: {
                absolute: {
                  maxTime: '50ms',
                  minOpsPerSec: 20_000,
                },
                relative: {
                  maxRegression: '10%',
                },
              },
            },
          },
        },
        exclude: [],
        excludeTags: [],
        iterations: 100,
        limitBy: 'iterations',
        metadata: {},
        outputDir: '.modestbench',
        pattern: '**/*.bench.js',
        quiet: false,
        reporterConfig: {},
        reporters: ['human'],
        tags: [],
        thresholds: {},
        time: 5000,
        timeout: 30_000,
        verbose: false,
        warmup: 10,
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
      // Verify transform created ResolvedBudgets with exact matches
      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(
          resolved.exact['test.bench.js/default/criticalPath'],
          'to be defined',
        );
      }
    });

    it('should accept multiple files and suites', () => {
      const config = {
        budgets: {
          'api.bench.js': {
            default: {
              healthCheck: {
                absolute: { maxTime: '1ms' },
              },
            },
            'HTTP Routes': {
              createUser: {
                absolute: { maxTime: '20ms' },
              },
              getUser: {
                absolute: { maxTime: '10ms' },
              },
            },
          },
          'db.bench.js': {
            'Query Performance': {
              selectOne: {
                relative: { maxRegression: '5%' },
              },
            },
          },
        },
      };

      const result = safeParsePartialConfig(config);

      expect(result.success, 'to be true');
      // Verify all tasks were transformed to ResolvedBudgets
      if (result.success && result.data.budgets) {
        const resolved = result.data.budgets;
        expect(
          resolved.exact['api.bench.js/HTTP Routes/getUser'],
          'to be defined',
        );
        expect(
          resolved.exact['api.bench.js/HTTP Routes/createUser'],
          'to be defined',
        );
        expect(
          resolved.exact['api.bench.js/default/healthCheck'],
          'to be defined',
        );
        expect(
          resolved.exact['db.bench.js/Query Performance/selectOne'],
          'to be defined',
        );
      }
    });
  });
});
