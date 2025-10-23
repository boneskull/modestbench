---
title: Understanding Benchmark Statistics
description: A practical guide to interpreting benchmark statistics without making a fool of yourself
---

[_I'm happy for you though, or sorry that happened:_ (TL;DR)](#summary-tldr-for-the-skimmers).

> _"I just want to know which one is faster!"_
>
> <small>‒you, probably</small>

Yeah, we get it. You pasted your little function into some online JS benchmarking tool, ran it, and now you're staring at a wall of numbers wondering what the hell `±2.45%` means and whether you should care.

**We're supposed to say "you should care" here**—but that's not up to us. But if you want to continue fumbling around in the dark, stop reading now.

Look—benchmarking isn't just mashing the "go" button and picking whichever number is biggest. JavaScript engines are _chaos incarnate_. They optimize dynamically. The capricious OS schedules processes like a _squirrel on tweak_. And you think running in a _browser_ is going to give you accurate results?

_Fools!_ Hardware throttles because your laptop is _sitting on a blanket_. **Everything is non-deterministic and we live in a false reality created by unnameable horrors.**

But… statistics. Statistics are real. _They told us so._

This guide explains what **modestbench's** numbers actually mean. No statistics degree required. No hand-waving. Just straight talk about the math ("maths" for some of you) you need to stop embarrassing yourself in front of your team.

:::note[Developers Developers Developers]
This guide assumes you're a _developer_—not a statistician. There are little-to-no equations in this guide and no MathJax. If you want formal proofs and Greek letters, go back to college.
:::

## Why These Numbers Matter (And No, "Higher is Better" Isn't Enough)

When you benchmark JS code, you're measuring something that won't sit still. JavaScript engines are constantly JIT-optimizing your code. Background processes steal CPU cycles. Memory pressure triggers GC pauses. Your measurements will _invariably_ vary.

Statistics help us answer three (3) critical questions about our code's performance:

1. **What's typical?** - Not the best case, not the worst case, but what you'll actually see in production
2. **How reliable is this?** - Are we measuring actual performance or just cosmic background radiation?
3. **Can we actually tell these apart?** - Or are we seeing noise and calling it a "10% improvement"?

Without understanding these numbers, you might as well go _dowsing_.

## The Core Metrics (AKA "The Numbers Everyone Looks At First")

### Mean (Average) Execution Time

The **mean** is the average time your code takes to run _once_. **modestbench** runs your benchmark hundreds or thousands of times and calculates the mean.

**Think of it like:** Your daily commute _usually_ takes 30 minutes. Some days it's 28, some days it's 33, but 30 is typical.

```javascript
// Example output
mean: 0.00081005  // 810.05 microseconds
```

**modestbench** displays this as `810.05μs`, `12.5ms`, or `1.82s`.

:::tip[But You Said No Greek]
"μs" means "microseconds." Yes, that's the Greek letter 'mu'—but it's just SI shorthand for 'micro-', not scary math notation.
:::

**The mean is your baseline.** Everything else is about understanding how much you can trust it.

### Operations Per Second (Throughput)

**Operations per second** (ops/sec) tells you how many times your code could run in one second. It's just `1 / mean`.

**Think of it like:** Requests per second your API can handle, or FPS in a game, or how many times in a minute you can make a full rotation of your twiddling thumbs.

```javascript
// Example output
opsPerSecond: 1234567.89  // About 1.23 million ops/sec
```

For this one, though, **higher is better.** This is usually what you compare when someone asks "which is faster?"

:::tip[Comparing Implementation Throughput]
When comparing implementations, ops/sec gives you an easy ratio: if Implementation _A_ does 1M ops/sec and _B_ does 500K ops/sec, _A_ is twice as fast.
:::

### Min and Max (The Extremes)

**Min** is the fastest run. **Max** is the slowest.

```javascript
// Example output
min: 0.000785,  // Best case: 785 microseconds
max: 0.000853   // Worst case: 853 microseconds
```

A _huge_ gap between min and max? Something else is competing for resources. Quit all those Electron apps and try again.

## Measuring Reliability (Or: "How Much Can I Trust This?")

This is where it gets interesting. After reading this, you will ~~be~~ feel smarter.

### Standard Deviation (SD)

**Standard deviation** measures how spread out your measurements are. Low SD = consistent. High SD = all over the place.

**Think of it like:** Your commute is 30 minutes ±2 minutes? Predictable. 45 minutes ±30 minutes? What's a good remote job board?

```javascript
// Example output
mean: 0.00081,
stdDev: 0.00002  // Only 2% of the mean - very consistent
```

Standard deviation uses _the same units_ as your [mean](#mean-average-execution-time). Which brings us to...

:::note[We Lied About "No Greek"]
Often, you'll see standard deviation written as `σ` (sigma). This symbol may also be used to refer to a frat, though, so make sure you can tell the difference.
:::

### Coefficient of Variation (CV)

**Coefficient of Variation** normalizes stdDev as a percentage: `CV = (stdDev / mean) × 100`.

**Why it matters:** 1ms stdDev sounds huge for a 10ms operation (10% CV) but tiny for a 1-second operation (0.1% CV). CV lets you compare reliability _across benchmarks_ with wildly different speeds.

```javascript
// Example output
cv: 2.47  // 2.47% - chef's kiss
```

**The rules:**

- **CV < 5%**: Excellent. Trust these results.
- **CV 5-10%**: Pretty pretty pretty pretty good. Generally reliable.
- **CV > 10%**: _Utter shit_. High variability. Did you hibernate your background tabs, you _complete donkey?_

:::caution[CV: Real Talk]
If your CV is above 10%, your results are questionable. More iterations won't fix interference from background processes. Again: stop _mining crypto_ or try some other suggested fixes ([skip ahead](#interpreting-results-aka-good-vs-bad-numbers)).
:::

### Variance

**Variance** is standard deviation squared (`variance = stdDev²`).

```javascript
// Example output
variance: 0.0000004  // stdDev²
```

It's used in calculations. You'll mostly ignore it. We mention it because it's in the output and we don't want you wondering what it means. Nobody can think in "stdDev²" anyhow.

### Margin of Error (RME)

**Margin of error** (also called **RME** - Relative Margin of Error) gives you a confidence interval. We're 95% confident the _true mean_ is within `mean ± marginOfError`.

:::note[True Mean?]
Yes. What you measured with your benchmarking tool is a _sample mean_—the average from your benchmark runs. The _true mean_ (or "population mean") is the theoretical "real" average if you could run the benchmark infinite times. You can try, but you will fail.

Statistics like RME and [CV](#coefficient-of-variation-cv) give you a confidence interval around your sample mean to _estimate_ the _true mean_.
:::

**Think of it like:** This Gallup poll says "52% ±3%" for a bill to issue government quiche to every newborn. They sampled 1,000 voters, but the _actual_ population support is probably between 49-55% (assuming a representative sample, which is a big assumption).

```javascript
// Example output
mean: 0.00081,          // Your sample mean (what you measured)
marginOfError: 0.00002  // 95% confident the TRUE mean is 0.00079-0.00083
```

Displayed as `±2.45%` (or "RME: 2.45%"). Lower RME = more confidence in your results.

**Here's the thing:** If two implementations have overlapping confidence intervals, they might be statistically indistinguishable. We'll cover this later because it's important (and you're gonna hate it).

## Understanding Tail Performance

Did you forget about tail performance? You did.

### Percentiles (p95, p99)

**Percentile** tells you: "X% of executions completed in this time or less."

- **p95 (95th percentile)**: 95% of runs were this fast or faster
- **p99 (99th percentile)**: 99% of runs were this fast or faster

**Think of it like:** If your API's p95 response time is 200ms, then 95% of requests finish in 200ms or less. The unlucky 5% take longer.

```javascript
// Example output
mean: 0.00081,   // 810μs average
p95: 0.00083,    // 830μs - 95% complete by here
p99: 0.000845    // 845μs - 99% complete by here
```

**Why you should care:** Mean is a lie if you're ignoring tail latencies. A service with mean 100ms but p99 1s means 1% of your users are having a rotten experience and you should go to jail.

**Interpreting the gaps:**

- Small p99-mean gap: Consistent performance, no surprises
- Large p99-mean gap: Occasional slowdowns (GC pauses, cache misses, etc.)

:::note[Horror Story (Based On True Events)]
We once saw a benchmark with mean 5ms and p99 500ms. Turns out major GC pauses were happening. The mean was technically correct but _completely useless_ for understanding real-world performance. Everyone died.
:::

## The Measurement Process (Or: "What's Actually Happening Here?")

"Process" is a technical term you may be familiar with. It means "the thing that happens when you run a benchmark."

### Iterations

**Iterations** are how many times your benchmark function runs. **modestbench** keeps running until it hits the time limit or iteration count (configured via `limitBy`).

```javascript
// Example output
iterations: 1000  // Ran your code 1,000 times
```

_More iterations_ = _more accurate statistics_ = _longer to run_. It's a tradeoff. Welcome to software engineering.

### Samples vs Iterations

**modestbench** might run many iterations in batches, collecting **samples** (measurements). The `AccurateEngine` (see [Advanced Usage](/guides/advanced/)) uses an adaptive algorithm to figure out optimal batch sizes based on how fast your code runs.

- **Fast operations**: Small batches, lots of samples
- **Slow operations**: Fewer iterations, fewer samples

You don't control this directly; the engine figures it out.

> If you need that granular control, what are you even doing reading this? _Looking for mistakes?_ (If you find any, please [report them](https://github.com/boneskull/modestbench/issues/new)!!)

### Warmup (AKA "Why Your First Run is Always Slow")

**Warmup** runs your code several times _before_ measuring, giving the V8 JIT compiler time to optimize.

**Think of it like:** Warming up your car engine before driving—you want to measure _normal_ performance, not cold-start behavior.

```javascript
// Config
{
  warmup: 30  // Run 30 times before measuring (this is the default)
}
```

**JavaScript engines are particularly sensitive to warmup** because of aggressive JIT optimization. Without warmup, you're measuring optimization overhead, not your code.

:::tip[Always Warmup]
Just... do it.
:::

### How Much Warmup?

**modestbench**'s default warmup is `30` iterations. That's enough to get V8 past cold-start behavior for most code. But you might want more:

**Recommended warmup values:**

- **For most benchmarks:** The default (30) or 50-100 iterations. V8 typically optimizes after ~10-20 runs.
- **For fast operations** (< 1μs): More warmup helps. Try 100-200 iterations.
- **For slow operations** (> 10ms): The default is fine. Even less (20-30) works.
- **When in doubt:** 100 iterations. It's a nice, round number.

**The thing is:** Too little warmup and you're measuring JIT overhead. Too much warmup and you're just wasting time—V8 already optimized after the first 50 runs.

> **"But I heard V8 has multiple optimization tiers!"**
>
> Well, aren't you smart? I bet the teachers loved you. Yes, V8 has Ignition (interpreter), Sparkplug (baseline JIT), TurboFan (optimizing JIT), and Maglev (mid-tier JIT). Your code might start in Ignition and work its way up. But for benchmarking purposes, 100 warmup iterations generally gets you to "hot" code. If you want to benchmark specific optimization tiers, you're in deep waters and probably shouldn't be reading this guide (maybe look at [bench-node](https://github.com/kkaefer/bench-node) instead).

**Bottom line:** The default (30) is sensible for most use cases. Bump it to 100 if you want extra confidence.

## Outlier Handling (Or: "Why We Throw Away Some Data")

**Outliers** are measurements that are way off from the rest—either freakishly fast or slow compared to everything else. They're often caused by external interference (your OS decided to index files, a GC pause hit, someone started a Zoom call, etc.) rather than reflecting your code's actual performance.

**Think of it like:** Your page load times are normally 200-300ms, but one request took 45 seconds because AWS had a _moment_. That's an outlier.

The question is: do we keep outliers and let them skew our statistics, or do we remove them to get a clearer picture? **modestbench** removes them because they suck. Here's how we do it:

### IQR (Interquartile Range)

**modestbench** automatically removes extreme outliers using the **IQR method** ([wiki](https://en.wikipedia.org/wiki/Interquartile_range)). This filters out measurements likely corrupted by system interference (background processes, GC pauses, tachyons, whatever).

**How it works:**

1. Sort all measurements in ascending order
2. Find Q1 (25th percentile, or p25) and Q3 (75th percentile, or p75)
3. Calculate `IQR = Q3 - Q1`
4. Remove values outside `[Q1 - 1.5×IQR, Q3 + 1.5×IQR]`

The result is the _interquartile range_ (IQR).

```javascript
// Example: measurements in microseconds

 // 150 is clearly an outlier
let samples = [78, 79, 80, 81, 82, 83, 150]; 
//    ^Q1      ^Q3
const IQR = 83 - 79; // 4
const upperBound = 83 + 1.5×4; // 89
// Remove 150 (it's way above 89)
samples = samples.filter(sample => sample <= upperBound);
samples; // [78, 79, 80, 81, 82, 83]
```

This is why reported iterations might be less than you told **modestbench** to run. It's not a bug; we're _protecting you_ from contaminated measurements.

> 🤔 **"But what if the outliers are _real_?"**
>
> If GC pauses are a significant part of your "real-world" performance, then yes, outliers matter. But most of the time, you're trying to measure _your code_, not whether Slack decided to spike CPU in the background. **modestbench** optimizes for the former.

## How to Read **modestbench**'s Output

**modestbench**'s default reporter is the `human` reporter. It's the one you see in your terminal when you run `modestbench`. It's the one you use to get a quick overview of your benchmark results. This is for _you_ to read; not for machines.

### Human Reporter Format

```text
✓ Array.push()
  810.05μs • ±2.45% • 1.23M ops/sec
```

Breaking this down:

- `810.05μs`: [Mean execution time](#mean-average-execution-time) (microseconds)
- `±2.45%`: [RME (Relative Margin of Error)](#margin-of-error-rme) - a 95% confidence interval
- `1.23M ops/sec`: Operations per second (throughput)

### JSON Reporter Format

For machines, we got a JSON reporter. We're not sure what you're gonna do with it, but here it is:

```json
{
  "task": "Array.push()",
  "opsPerSecond": 1234567.89,
  "stats": {
    "mean": 0.00081005,
    "min": 0.000785,
    "max": 0.000853,
    "stdDev": 0.00002,
    "variance": 0.0000004,
    "p95": 0.00083,
    "p99": 0.000845,
    "marginOfError": 2.45,
    "cv": 2.47,
    "iterations": 1000
  }
}
```

It contains a bit more information than the human reporter.

:::note[CSV Reporter]
There's also a CSV reporter. If you like Excel, this one is for you.
:::

### Interpreting Results (AKA "Good vs. Bad Numbers")

**Good** results look like:

```javascript
{
  cv: 1.5,              // Low variability
  marginOfError: 1.2,   // Low RME - tight confidence interval
  p99: 0.00082,         // Close to mean (0.00081)
  opsPerSecond: 1234567 // High throughput
}
```

**Crap** results look like:

```javascript
{
  cv: 15,               // ⚠️ High variability
  marginOfError: 12,    // ⚠️ High RME - wide confidence interval  
  p99: 0.0025,          // ⚠️ Far from mean (0.0010)
  opsPerSecond: 10      // Low throughput (but might be expected)
}
```

**If your results are crap:**

Try these things:

1. Increase iterations (`--iterations 5000`)
2. Increase time (`--time 10000`)
3. Close background applications
4. Run on a less-loaded system

If none of that works, then your code may also be crap. Just ship it.

Seriously, though: sometimes high variability is telling you something about your code. If your CV is consistently high even on a clean system, maybe your code's performance _is actually inconsistent_. That's worth investigating.

## Practical Examples

:::caution[They Are Just Examples]
These are not real benchmarks; do not consider them conclusive about how such code will actually run in production or even under **modestbench**.
:::

Because the human reporter doesn't emit all of these values, you may need to use the JSON or CSV reporter (or use **modestbench** programmatically) to get at them.

### Example 1: Comparing Implementations

```javascript
// Benchmark results
const results = {
  'Array.push()': {
    mean: 0.000810,
    cv: 2.5,
    opsPerSecond: 1234567
  },
  'Array spread': {
    mean: 0.081010,
    cv: 4.1,
    opsPerSecond: 12345
  }
};

// Array.push is ~100× faster (based on opsPerSecond ratio)
// Both have low CV, so results are reliable
// Conclusion: Use push(), not spread, for building arrays
```

**This is the happy path.** Clear winner, reliable numbers. _Winning._

### Example 2: Detecting Regressions

```javascript
// Baseline
const baseline = {
  mean: 0.000810,
  opsPerSecond: 1234567
};

// After "optimizations"
const current = {
  mean: 0.000950,
  opsPerSecond: 1052631
};

// Regression calculation
const regression = (baseline.opsPerSecond - current.opsPerSecond) 
                  / baseline.opsPerSecond;
// 0.147 or 14.7% slower

// Revert your "optimization", please
```

**Congratulations, you made it slower.** That's probably what you deserved.

### Example 3: Understanding Tail Latency Impact

```javascript
const result = {
  mean: 0.00100,   // 1ms average - looks great!
  p95: 0.00105,    // 5% worse than average - fine
  p99: 0.00500     // 5× worse than average - YIKES
};

// What's happening: 99% of executions are fast, 
// but 1% experience 5× slowdown.
//
// Possible causes:
// - GC pauses
// - Cache misses  
// - JIT deoptimization
// - Background processes
//
// For user-facing operations, that 1% matters.
// Users don't care about your mean.
```

**This is reality.** Your mean looks great but 1 in 100 requests takes 5× longer. QA will catch it, right? _Right?_

## An Uncomfortable Truth: When Results Disagree

Sometimes two implementations have overlapping confidence intervals:

```javascript
// Implementation A
mean: 1.00, marginOfError: 0.15  // Range: 0.85-1.15

// Implementation B  
mean: 1.10, marginOfError: 0.12  // Range: 0.98-1.22

// Ranges overlap (0.98-1.15)
// These might be statistically indistinguishable
```

**What this means:** The difference might just be noise. You can:

1. Run more iterations to tighten confidence intervals
2. Decide it's good enough. Pick based on other factors (readability, maintainability, vibes, etc.)
3. Keep pretending the 10% difference is real and be _shocked_ when it disappears in production

:::tip[Six & One-Half Dozen]
A lot of "performance optimizations" fall into this category. The benchmark says 8% faster, but the confidence intervals overlap, and in production nobody can tell the difference. In the case, the benchmark isn't really valuable. Do what you will with that information.
:::

## Summary (TL;DR for the Skimmers)

- **Mean**: Your typical performance (what you'll probably see)
- **True Mean**: The "real" average if you could run the benchmark infinite times
- **Ops/sec** or **Throughput**: How fast your code runs (higher = better, obviously)
- **CV & RME**: How reliable your results are (lower = better, less obviously)
- **p95/p99**: Worst-case performance your users actually experience (ignore at your peril)
- **Outliers**: Measurements that are way off from the rest (usually caused by external interference)
- **IQR**: The interquartile range (the range of the middle 50% of measurements)
- **Iterations**: More = accurate-er but slower to measure
- **Warmup**: Critical for reliably benchmarking JavaScript

**modestbench** handles the statistical heavy lifting. Your job is interpreting what the numbers mean for your application, and now you can confidently do so. Just don't do it on stage at a statistician's conference.

## Next Steps

- Learn about [Output Formats](/guides/output/) to see all available statistics
- Explore [Configuration](/guides/configuration/) to tune measurement parameters  
- Check [Advanced Usage](/guides/advanced/) for comparing results over time
