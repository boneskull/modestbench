import { type ModestBenchConfig } from '../src/types/index.js';

const config: Partial<ModestBenchConfig> = {
  iterations: 2000,
  outputDir: './reports',
  pattern: 'src/**/*.bench.ts',
  reporters: ['human', 'csv'],
};

export default config;
