import { type ModestBenchConfig } from 'modestbench';

const config: ModestBenchConfig = {
  concurrent: true,
  iterations: 2000,
  outputDir: './reports',
  pattern: 'src/**/*.bench.ts',
  reporters: ['human', 'csv'],
};

export default config;
