---
title: Build a Custom Reporter
description: Create third-party reporter plugins for modestbench
---

So the built-in reporters aren't cutting it for you? Fair enough. We're not sad. Maybe you want to push results to a database, send Slack notifications, generate fancy HTML reports, or integrate with your company's performance monitoring system.

Too bad, friend. No can do. Guess you should just die!

OK, just kidding. You can build your own reporter. This is how.

## Quick Start

Here's a minimal reporter that logs results to the console:

:::tip[TypeScript, JavaScript, & Module Systems]
This example is written in TypeScript. You can write it in JavaScript, if you please. CJS and ESM are both supported. If using CJS, use `module.exports` instead of `export default`.

To load `.ts` files directly, you'll need Node.js 22.6+ (with `--experimental-strip-types`) or Node.js 23.6+. Otherwise, compile to JavaScript first.
:::

```typescript
// my-reporter.ts
import type { Reporter } from 'modestbench';

const reporter: Reporter = {
  onStart(run) {
    console.log(`Starting benchmark run: ${run.id}`);
  },
  onEnd(run) {
    console.log(`Completed: ${run.summary.totalTasks} tasks`);
  },
  onError(error) {
    console.error('Benchmark failed:', error.message);
  },
  onTaskResult(result) {
    console.log(`${result.name}: ${result.opsPerSecond.toFixed(2)} ops/sec`);
  },
};

export default reporter;
```

Run it:

```bash
modestbench --reporter ./my-reporter.ts
```

That's it. Your pet kerploppus could do this.

## Reporter Patterns

**modestbench** supports three ways to define reporters. Pick whichever fits your brain best.

### Pattern 1: Plain Old JavaScript Object

Export a reporter object directly. No options support, but perfect for simple use cases:

```typescript
import type { Reporter } from 'modestbench';

const reporter: Reporter = {
  onStart(run) {
    /* ... */
  },
  onEnd(run) {
    /* ... */
  },
  onError(error) {
    /* ... */
  },
  onTaskResult(result) {
    /* ... */
  },
};

export default reporter;
```

### Pattern 2: Factory Function

Export a function that creates the reporter. Gets options from your config file and utility functions from the [context](/reference/reporter-api/#reportercontext):

```typescript
import type { ReporterFactory } from 'modestbench';

const createReporter: ReporterFactory = (options, context) => {
  const verbose = options.verbose ?? false;

  return {
    onStart(run) {
      if (verbose) console.log('Environment:', run.environment);
    },
    onEnd(run) {
      console.log(`Duration: ${context.utils.formatDuration(run.duration)}`);
    },
    onError(error) {
      console.error(error);
    },
    onTaskResult(result) {
      const time = context.utils.formatDuration(result.mean);
      const ops = context.utils.formatOpsPerSecond(result.opsPerSecond);
      console.log(`${result.name}: ${time} (${ops})`);
    },
  };
};

export default createReporter;
```

::tip[Async Factory Functions]
If you need to do async work during initialization, you can return a `Promise` from the factory function.
:::

### Pattern 3: Class (For the OOP Crowd)

Export a class if you prefer that style:

```typescript
import type { Reporter, ReporterContext } from 'modestbench';

class MyReporter implements Reporter {
  constructor(
    private options: Record<string, unknown>,
    private context: ReporterContext,
  ) {}

  onStart(run) {
    console.log('Starting...');
  }

  onEnd(run) {
    const duration = this.context.utils.formatDuration(run.duration);
    console.log(`Completed in ${duration}`);
  }

  onError(error) {
    console.error(error);
  }

  onTaskResult(result) {
    console.log(`${result.name}: ${result.opsPerSecond} ops/sec`);
  }
}

export default MyReporter;
```

## Required Methods

Every reporter must implement these four methods:

| Method                 | When It's Called              | What You Get                   |
| ---------------------- | ----------------------------- | ------------------------------ |
| `onStart(run)`         | Before any benchmarks execute | Run metadata, environment info |
| `onEnd(run)`           | After all benchmarks complete | Full results, summary stats    |
| `onError(error)`       | When something goes wrong     | The error object               |
| `onTaskResult(result)` | After each benchmark task     | Individual task results        |

## Optional Methods

Want more granular lifecycle hooks? Implement any of these:

| Method                          | When It's Called                      | Use Case               |
| ------------------------------- | ------------------------------------- | ---------------------- |
| `onFileStart(file)`             | Before processing a benchmark file    | Per-file logging       |
| `onFileEnd(result)`             | After a file completes                | File-level summaries   |
| `onSuiteStart(suite)`           | Before a suite runs                   | Suite grouping         |
| `onSuiteEnd(result)`            | After a suite completes               | Suite summaries        |
| `onSuiteInit(suite, taskNames)` | Before suite execution with task list | Pre-calculating widths |
| `onTaskStart(task)`             | Before a task runs                    | Progress indicators    |
| `onProgress(state)`             | During benchmark execution            | Live progress bars     |
| `onBudgetResult(summary)`       | After budget evaluation               | Budget pass/fail       |

## The Context Object

Factory functions and classes receive a `ReporterContext` with useful stuff:

```typescript
interface ReporterContext {
  // ModestBench version string (e.g., "0.6.0")
  version: string;

  // Plugin API version (currently 1)
  pluginApiVersion: number;

  // Logger for reporter output
  logger: {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    trace(message: string, ...args: unknown[]): void;
  };

  // Formatting utilities
  utils: {
    formatDuration(nanoseconds: number): string; // "1.23ms", "456.78μs"
    formatOpsPerSecond(ops: number): string; // "1.2M ops/sec"
    formatPercentage(value: number): string; // "12.34%"
    formatBytes(bytes: number): string; // "1.5 GB"
  };
}
```

Use the logger instead of `console` methods for output that respects the user's verbosity settings:

```typescript
const createReporter: ReporterFactory = (options, context) => {
  return {
    onStart(run) {
      context.logger.info(`Starting run: ${run.id}`);
      context.logger.debug('Environment:', run.environment);
    },
    onTaskResult(result) {
      const time = context.utils.formatDuration(result.mean);
      const ops = context.utils.formatOpsPerSecond(result.opsPerSecond);
      const moe = context.utils.formatPercentage(result.marginOfError);

      context.logger.info(`${result.name}: ${time} ±${moe} (${ops})`);
      // Output: "Array.push(): 810.05μs ±2.45% (1.23M ops/sec)"
    },
    // ... other methods
  };
};
```

## Passing Options

Configure your reporter via `modestbench.config.json`:

```json
{
  "reporterConfig": {
    "./my-reporter.ts": {
      "verbose": true,
      "outputFormat": "markdown",
      "webhookUrl": "https://example.com/benchmark-results"
    }
  },
  "reporters": ["human", "./my-reporter.ts"]
}
```

Your factory function receives these options. Use a generic type parameter to get full type safety:

```typescript
interface MyReporterOptions {
  verbose?: boolean;
  outputFormat?: 'text' | 'markdown';
  webhookUrl: string;
}

const createReporter: ReporterFactory<MyReporterOptions> = (options, context) => {
  // Options are fully typed - no type assertions needed!
  const verbose = options.verbose ?? false;
  const format = options.outputFormat ?? 'text';
  const webhook = options.webhookUrl;

  // ...
};
```

## Using Your Reporter

### By File Path

```bash
# Relative path
modestbench --reporter ./reporters/my-reporter.ts

# Absolute path
modestbench --reporter /path/to/my-reporter.ts
```

### By npm Package

Publish your reporter to npm and use it by package name:

```bash
modestbench --reporter modestbench-reporter-whozit
modestbench --reporter @flibbertigibbet/modestbench-reporter-wazit
```

### Mix and Match

Use multiple reporters simultaneously:

```bash
modestbench --reporter human --reporter ./my-reporter.ts --reporter json
```

## Real-World Examples

### Slack Notification Reporter

```typescript
import type { ReporterFactory } from 'modestbench';

interface SlackReporterOptions {
  webhookUrl: string;
  channel?: string;
}

const createSlackReporter: ReporterFactory<SlackReporterOptions> = (options, context) => {
  const { webhookUrl, channel = '#benchmarks' } = options;
  let failedTasks: string[] = [];

  return {
    onStart(run) {
      failedTasks = [];
    },

    onTaskResult(result) {
      if (result.status === 'failed') {
        failedTasks.push(result.name);
      }
    },

    async onEnd(run) {
      const { totalTasks, passedTasks, failedTasks: failed } = run.summary;

      const message =
        failed > 0
          ? `⚠️ Benchmark run completed with ${failed} failures`
          : `✅ All ${totalTasks} benchmarks passed`;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          text: message,
          attachments: [
            {
              fields: [
                { title: 'Total', value: totalTasks, short: true },
                { title: 'Passed', value: passedTasks, short: true },
                {
                  title: 'Duration',
                  value: context.utils.formatDuration(run.duration),
                },
              ],
            },
          ],
        }),
      });
    },

    async onError(error) {
      await fetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify({
          channel,
          text: `❌ Benchmark error: ${error.message}`,
        }),
      });
    },
  };
};

export default createSlackReporter;
```

### Markdown Report Generator

```typescript
import { writeFileSync } from 'node:fs';
import type { ReporterFactory, TaskResult } from 'modestbench';

const createMarkdownReporter: ReporterFactory<{ output?: string }> = (options, context) => {
  const outputPath = options.output ?? 'benchmark-report.md';
  const results: TaskResult[] = [];

  return {
    onStart() {
      results.length = 0;
    },

    onTaskResult(result) {
      results.push(result);
    },

    onEnd(run) {
      const lines = [
        '# Benchmark Results',
        '',
        `**Run ID:** ${run.id}`,
        `**Date:** ${new Date(run.startTime).toISOString()}`,
        `**Duration:** ${context.utils.formatDuration(run.duration)}`,
        '',
        '## Results',
        '',
        '| Task | Ops/sec | Mean | ±% |',
        '|------|---------|------|-----|',
      ];

      for (const result of results) {
        const ops = context.utils.formatOpsPerSecond(result.opsPerSecond);
        const mean = context.utils.formatDuration(result.mean);
        const moe = context.utils.formatPercentage(result.marginOfError);
        lines.push(`| ${result.name} | ${ops} | ${mean} | ${moe} |`);
      }

      writeFileSync(outputPath, lines.join('\n'));
    },

    onError(error) {
      console.error('Benchmark failed:', error);
    },
  };
};

export default createMarkdownReporter;
```

## Publishing Your Reporter

Want to share your reporter with the world? Follow npm conventions:

1. **Name it properly**: Use `modestbench-reporter-*` or `@scope/modestbench-reporter-*`
2. **Add the `modestbench-plugin` keyword** to your `package.json`
3. **Add peer dependency**: Add `modestbench` as a peer dependency in `package.json`:

   ```json
   {
     "peerDependencies": {
       "modestbench": ">=0.6.0"
     }
   }
   ```

4. (Optional) **Export types**: Export custom option types

## Error Handling

Avoid throwing exceptions to avoid crashing when multiple reporters are in use. Instead, be a good dog andjust log an error:

```typescript
const createReporter: ReporterFactory = (options, context) => {
  return {
    async onEnd(run) {
      try {
        await sendToExternalService(run);
      } catch (error) {
        // Log but don't throw - let other reporters finish
        context.logger.error('[MyReporter] Failed to send results:', error);
      }
    },
    // ... other methods
  };
};
```

## Next Steps

- Explore the [API Reference](/reference/reporter-api/) for complete type definitions
- See [Output Formats](/guides/output/) for built-in reporter details
