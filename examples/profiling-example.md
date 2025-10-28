# Profiling Example

This example shows how to use the `modestbench analyze` command to identify benchmark candidates.

## Try the Demo

Run the included profiling demo to see the profiler in action:

```bash
modestbench analyze "node examples/profiling-demo.js"
```

Output:

```text
██ Profile Analysis

Command: node examples/profiling-demo.js
Duration: 0.9s
Total Ticks: 632

██ Benchmark Candidates

Top functions by execution time:

  sortLargeArray                                            61.9%  (391 ticks)
  examples/profiling-demo.js:11

  (anonymous)                                                6.6%  (42 ticks)
  examples/profiling-demo.js:13

  processStrings                                             3.0%  (19 ticks)
  examples/profiling-demo.js:17

  transformData                                              1.7%  (11 ticks)
  examples/profiling-demo.js:41

  serializeData                                              1.7%  (11 ticks)
  examples/profiling-demo.js:58

... (showing top 5 of 14 user functions)
```

## Grouped by File

See which files contain the most hot functions:

```bash
modestbench analyze "node examples/profiling-demo.js" --group-by-file
```

Output:

```text
██ Grouped by File

▓ examples/profiling-demo.js                                 85.5%  (537 ticks)
  ▪ sortLargeArray                                           63.4%  (398 ticks)    :11
  ▪ (anonymous)                                               6.7%  (42 ticks)     :13
  ▪ processStrings                                            2.4%  (15 ticks)     :17
  ▪ transformData                                             2.1%  (13 ticks)     :41
  ▪ serializeData                                             1.4%  (9 ticks)      :58
  ...
```

## What to Benchmark

Functions at the top of the profile (>5% execution time) are excellent candidates for benchmarking:

1. **High-frequency functions** - Called many times during execution
2. **Computational functions** - Pure functions with measurable performance
3. **Core utilities** - Reusable functions used throughout your codebase

## Next Steps

Once you've identified candidates, create benchmarks:

```bash
# Initialize benchmarking
modestbench init

# Create a benchmark file
cat > benchmarks/sorting.bench.js << 'EOF'
import { sortArray } from '../src/utils/sorting.js';

const testData = Array.from({ length: 1000 }, () => Math.random());

export default {
  'sortArray': () => {
    sortArray([...testData]);
  },
};
EOF

# Run benchmarks
modestbench
```
