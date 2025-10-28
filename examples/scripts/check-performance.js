// scripts/check-performance.js
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Run benchmarks and get JSON output
execSync('modestbench run --reporter json --output ./tmp');
const results = JSON.parse(readFileSync('./tmp/results.json', 'utf8'));

// Compare with baseline
const baseline = JSON.parse(readFileSync('./baseline-results.json', 'utf8'));

for (const result of results.results) {
  const baselineResult = baseline.results.find(
    /** @param {any} r */
    (r) =>
      r.file === result.file &&
      r.suite === result.suite &&
      r.task === result.task,
  );

  if (baselineResult) {
    const regression = (baselineResult.hz - result.hz) / baselineResult.hz;
    if (regression > 0.1) {
      // 10% regression threshold
      console.error(
        `Performance regression detected in ${result.task}: ${(regression * 100).toFixed(1)}%`,
      );
      process.exit(1);
    }
  }
}
