# Feature Plan: Custom Output Filenames

## Overview
Add support for specifying custom output filenames via the `--output-file` CLI flag, instead of using the default `results.json`/`results.csv` naming convention.

## Current Behavior
- `--output <dir>` specifies output directory
- Filenames are hardcoded:
  - JSON: `results.json`
  - CSV: `results.csv`
- No way to customize the filename

## Desired Behavior
Users can specify custom output filenames:
```bash
# Single reporter with custom filename
modestbench run --reporters json --output-file my-benchmarks.json

# Multiple reporters with pattern/template
modestbench run --reporters json,csv --output-file "benchmarks-{date}-{reporter}"
# Produces: benchmarks-2025-10-19-json.json, benchmarks-2025-10-19-csv.csv

# With output directory
modestbench run --reporters json --output ./results --output-file custom-name.json
# Produces: ./results/custom-name.json
```

## Implementation Steps

### 1. Design Filename Specification
**Decision needed:** How to handle multiple reporters?

**Option A: Single Filename (Simple)**
- Only works with single reporter
- Error if multiple reporters specified
```bash
--output-file benchmarks.json
```

**Option B: Filename Pattern (Recommended)**
- Template string with variables
- `{reporter}`, `{date}`, `{time}`, `{timestamp}`, `{ext}`
```bash
--output-file "benchmarks-{date}-{reporter}.{ext}"
```

**Option C: Per-Reporter Specification**
- Specify filename per reporter
```bash
--json-file benchmarks.json --csv-file data.csv
```

**Recommendation:** Start with Option A (simple), add Option B later if needed.

### 2. Update CLI Command Definition
**File:** `src/cli/commands/run.ts`

Add option:
```typescript
.option('output-file', {
  alias: 'o',
  description: 'Custom filename for reporter output (use with single reporter)',
  type: 'string',
  conflicts: ['reporters'], // Validate single reporter if used
})
```

### 3. Add Validation Logic
**File:** `src/cli/commands/run.ts` or new validator

Validate usage:
```typescript
if (args.outputFile && args.reporters && args.reporters.length > 1) {
  throw new Error(
    '--output-file can only be used with a single reporter. ' +
    'Use --output <dir> for multiple reporters.'
  );
}

// Ensure extension matches reporter type
if (args.outputFile && args.reporters) {
  const reporter = args.reporters[0];
  const ext = path.extname(args.outputFile);
  
  const expectedExt = {
    json: '.json',
    csv: '.csv',
  }[reporter];
  
  if (expectedExt && ext && ext !== expectedExt) {
    console.warn(
      `Warning: Output file extension '${ext}' doesn't match reporter type '${reporter}' ` +
      `(expected '${expectedExt}')`
    );
  }
}
```

### 4. Update Type Definitions
**File:** `src/types/cli.ts`

```typescript
export interface RunCommandArgs extends BaseCommandArgs {
  // ... existing options ...
  
  /** Custom output filename (works with single reporter only) */
  outputFile?: string;
}
```

### 5. Modify Reporter Instantiation
**File:** `src/reporters/registry.ts` or where reporters are created

Pass custom filename to reporter:
```typescript
function createReporter(
  name: string,
  options: ReporterOptions & { customFilename?: string },
): Reporter {
  switch (name) {
    case 'json':
      return new JsonReporter({
        ...options,
        outputPath: options.customFilename || 
                    (options.outputPath ? path.join(options.outputPath, 'results.json') : undefined),
      });
    
    case 'csv':
      return new CsvReporter({
        ...options,
        outputPath: options.customFilename || 
                    (options.outputPath ? path.join(options.outputPath, 'results.csv') : undefined),
      });
    
    // ... other reporters
  }
}
```

### 6. Handle Path Resolution
**New file or existing config manager**

Create helper function:
```typescript
function resolveOutputPath(
  outputDir?: string,
  outputFile?: string,
  defaultFilename?: string,
): string | undefined {
  if (outputFile) {
    // If outputFile is absolute, use as-is
    if (path.isAbsolute(outputFile)) {
      return outputFile;
    }
    
    // If outputDir specified, join them
    if (outputDir) {
      return path.join(outputDir, outputFile);
    }
    
    // Otherwise, resolve relative to cwd
    return path.resolve(process.cwd(), outputFile);
  }
  
  // Fall back to default behavior
  if (outputDir && defaultFilename) {
    return path.join(outputDir, defaultFilename);
  }
  
  return undefined;
}
```

### 7. Update Reporters
**Files:** `src/reporters/json.ts`, `src/reporters/csv.ts`

Reporters already support custom `outputPath` - no changes needed! ✅

### 8. Update Tests
**File:** `test/integration/reporters.test.ts`

Un-skip and update test at line 503:
```typescript
it('should support custom output filenames', async () => {
  const benchFile = join(tempDir, 'custom-name-test.bench.js');
  await writeFile(benchFile, `...`);

  const customFile = 'my-benchmarks.json';
  const result = await runCommand([
    'run',
    benchFile,
    '--reporters',
    'json',
    '--output',
    tempDir,
    '--output-file',
    customFile,
  ]);

  expect(result.exitCode, 'to equal', 0);
  
  // Verify custom filename used
  const outputPath = join(tempDir, customFile);
  const content = await readFile(outputPath, 'utf-8');
  expect(content.length, 'to be greater than', 0);
});
```

Add additional tests:
- Custom filename without output dir
- Custom filename with absolute path
- Error when using with multiple reporters
- Warning when extension doesn't match reporter type

### 9. Update Documentation
- `README.md` - Add `--output-file` to CLI options
- Add examples showing custom filenames
- Document limitations (single reporter only in v1)

## Testing Checklist
- [ ] Custom filename works with `--output-file` alone
- [ ] Custom filename works with `--output` and `--output-file` together
- [ ] Absolute paths are respected
- [ ] Relative paths resolve correctly
- [ ] Error when used with multiple reporters
- [ ] Warning when extension doesn't match reporter type
- [ ] Works with JSON reporter
- [ ] Works with CSV reporter
- [ ] File is created at correct location
- [ ] Parent directories are created if needed

## Edge Cases to Consider
- What if output file already exists? (overwrite like current behavior)
- What if output file is a directory?
- What if output file path includes non-existent directories? (create them)
- Should we validate file extension?
- What about special characters in filename?
- How to handle stdout output with custom filename?

## Future Enhancements
After implementing basic version, consider:
- Filename templates with variables (`{date}`, `{reporter}`, etc.)
- Per-reporter filename specification (`--json-file`, `--csv-file`)
- Timestamped output to avoid overwriting
- Append mode instead of overwrite

## Estimated Complexity
**Low-Medium** - Straightforward path manipulation, main complexity is validation and error handling.

## Related Files
- `src/cli/commands/run.ts`
- `src/reporters/registry.ts`
- `src/reporters/json.ts`
- `src/reporters/csv.ts`
- `src/types/cli.ts`
- `test/integration/reporters.test.ts`

## Implementation Priority
**Phase 1 (Simple, MVP):**
- Single reporter only
- Basic validation
- Absolute and relative path support

**Phase 2 (Enhanced):**
- Template variables
- Per-reporter filenames
- Advanced validation

**Phase 3 (Future):**
- Append mode
- Automatic timestamping
- Rollover strategies

