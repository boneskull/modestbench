import type { ModestBenchConfig } from '../../../src/types/index.js';

const config: Partial<ModestBenchConfig> = {
  bail: false,
  exclude: ['node_modules/**', 'dist/**'],
  iterations: 500,
  metadata: {
    format: 'typescript',
    testFile: true,
  },
  outputDir: './test-output',
  pattern: 'test/**/*.bench.ts',
  quiet: false,
  reporterConfig: {
    human: {
      showProgress: true,
    },
  },
  reporters: ['human', 'json'],
  tags: ['test', 'typescript'],
  thresholds: {
    maxMean: 1000,
  },
  time: 2000,
  timeout: 60000,
  verbose: true,

  warmup: 100,
};

export default config;
