---
title: API Documentation
description: Programmatic API reference for modestbench
---

:::note[Coming Soon]
Full API documentation is under development and will be available soon.
:::

## Overview

modestbench provides a programmatic API for advanced usage and custom integrations. The API allows you to:

- Execute benchmarks programmatically
- Create custom reporters
- Integrate with your own tooling
- Build performance testing frameworks

## Basic Usage

```typescript
import { modestbench, HumanReporter } from 'modestbench';

// Initialize the engine
const engine = modestbench();

// Register reporters
engine.registerReporter('human', new HumanReporter());

// Execute benchmarks
const result = await engine.execute({
  pattern: '**/*.bench.js',
  iterations: 1000,
  warmup: 50,
  reporters: ['human'],
});

// Process results
if (result.summary.failedTasks > 0) {
  console.error('Some benchmarks failed');
  process.exit(1);
}

console.log(`Completed ${result.summary.totalTasks} benchmarks`);
```

## Exports

The main package exports:

- `modestbench()` - Create a benchmark engine instance
- `HumanReporter` - Color-coded terminal reporter (TTY with colors)
- `SimpleReporter` - Plain text reporter (non-TTY environments)
- `JsonReporter` - Structured JSON output reporter
- `CsvReporter` - Tabular CSV output reporter
- Type definitions for TypeScript

## Future Documentation

This API reference will be expanded to include:

- **Engine API** - Complete engine methods and configuration
- **Reporter Interface** - Creating custom reporters
- **Type Definitions** - Full TypeScript type reference
- **Advanced Usage** - Custom integrations and extensions

Documentation will be generated using [TypeDoc](https://typedoc.org/) to ensure accuracy and completeness.

## Current Status

The programmatic API is functional and used internally by the CLI. However, comprehensive documentation is still being developed.

For now, refer to:

- [Getting Started](/getting-started/) - Basic usage patterns
- [Advanced Usage](/guides/advanced/) - Complex scenarios
- [Source Code](https://github.com/boneskull/modestbench/tree/main/src) - Implementation reference

## Contributing

If you'd like to help with API documentation, please see our [Contributing Guide](/reference/contributing/).

## Questions?

For questions about the API:

- Check [GitHub Discussions](https://github.com/boneskull/modestbench/discussions)
- Open an [Issue](https://github.com/boneskull/modestbench/issues) for bugs or feature requests
- Review [examples](https://github.com/boneskull/modestbench/tree/main/examples) in the repository
