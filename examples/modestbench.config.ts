import { ModestBenchConfig } from 'modestbench';

const config: ModestBenchConfig = {
  pattern: 'src/**/*.bench.ts',
  reporters: ['human', 'csv'],
  iterations: 2000,
  concurrent: true,
  outputDir: './reports',
};

export default config;
