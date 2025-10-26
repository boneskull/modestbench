/**
 * AccurateEngine Example
 *
 * This example demonstrates how to use the AccurateEngine for high-accuracy
 * benchmarking with V8 optimization guards.
 *
 * Run with: node --allow-natives-syntax examples/accurate-engine-example.js
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AccurateEngine } from '../src/index.js';
import { ModestBenchConfigurationManager } from '../src/services/config-manager.js';
import { BenchmarkFileLoader } from '../src/services/file-loader.js';
import { FileHistoryStorage } from '../src/services/history-storage.js';
import { ModestBenchProgressManager } from '../src/services/progress-manager.js';
import { ModestBenchReporterRegistry } from '../src/services/reporter-registry.js';

const main = async () => {
  console.log('🎯 AccurateEngine Example\n');

  // Create engine with all dependencies
  const engine = new AccurateEngine({
    configManager: new ModestBenchConfigurationManager(),
    fileLoader: new BenchmarkFileLoader(),
    historyStorage: new FileHistoryStorage({
      storageDir: join(tmpdir(), '.modestbench-example'),
    }),
    progressManager: new ModestBenchProgressManager(),
    reporterRegistry: new ModestBenchReporterRegistry(),
  });

  // Configuration for accurate measurement
  const config = {
    config: {
      iterations: 100, // Minimum iterations per task
      limitBy: 'any', // Stop at first limit reached
      quiet: false, // Show progress
      time: 1000, // Maximum time per task (1 second)
      verbose: true, // Detailed output
      warmup: 20, // 20 warmup iterations
    },
    // Point to example benchmark files
    pattern: 'examples/benchmarks/*.bench.js',
    reporters: ['human'],
  };

  try {
    console.log('Running benchmarks with AccurateEngine...\n');

    const result = await engine.execute(config);

    console.log('\n✅ Benchmark complete!\n');
    console.log('Summary:');
    console.log(`  Files: ${result.files.length}`);
    console.log(`  Suites: ${result.summary.totalSuites}`);
    console.log(`  Tasks: ${result.summary.totalTasks}`);
    console.log(`  Total operations: ${result.summary.totalOperations}`);
    console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.summary.fastest) {
      console.log(`\n⚡ Fastest: ${result.summary.fastest.name}`);
      console.log(
        `   ${result.summary.fastest.opsPerSecond.toFixed(2)} ops/sec`,
      );
    }

    if (result.summary.slowest) {
      console.log(`\n🐌 Slowest: ${result.summary.slowest.name}`);
      console.log(
        `   ${result.summary.slowest.opsPerSecond.toFixed(2)} ops/sec`,
      );
    }
  } catch (error) {
    console.error(
      '❌ Error running benchmarks:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};

void main();
