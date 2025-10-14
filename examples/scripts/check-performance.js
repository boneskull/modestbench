// scripts/check-performance.js
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Run benchmarks and get JSON output
execSync('modestbench run --reporters json --output ./tmp');
const results = JSON.parse(readFileSync('./tmp/results.json'));

// Compare with baseline
const baseline = JSON.parse(readFileSync('./baseline-results.json'));

for (const result of results.results) {
  const baselineResult = baseline.results.find(
    r =>
      r.file === result.file &&
      r.suite === result.suite &&
      r.task === result.task
  );

  if (baselineResult) {
    const regression = (baselineResult.hz - result.hz) / baselineResult.hz;
    if (regression > 0.1) {
      // 10% regression threshold
      console.error(
        `Performance regression detected in ${result.task}: ${(regression * 100).toFixed(1)}%`
      );
      process.exit(1);
    }
  }
}
