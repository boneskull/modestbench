export default {
  bail: false,
  exclude: ['node_modules/**', 'dist/**'],
  iterations: 500,
  metadata: {
    format: 'javascript',
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
  tags: ['test', 'javascript'],
  thresholds: {
    maxMean: 1000,
  },
  time: 2000,
  timeout: 60_000,
  verbose: true,
  warmup: 100,
};
