# Feature Plan: Custom CSV Delimiter Support

## Overview
Add support for custom delimiters in CSV output via the `--csv-delimiter` CLI flag.

## Current Behavior
- CSV reporter always uses comma (`,`) as the delimiter
- Delimiter is hardcoded in the CSVReporter constructor

## Desired Behavior
- Users can specify custom delimiters via `--csv-delimiter <char>` flag
- Common use cases:
  - Semicolon (`;`) for European locales
  - Tab (`\t`) for TSV format
  - Pipe (`|`) for specific processing needs

## Implementation Steps

### 1. Update CLI Command Definition
**File:** `src/cli/commands/run.ts`

Add option to yargs configuration:
```typescript
.option('csv-delimiter', {
  alias: 'csv-delim',
  description: 'Delimiter character for CSV output',
  type: 'string',
  default: ',',
})
```

### 2. Update Type Definitions
**File:** `src/types/cli.ts` or relevant types file

Add to RunCommandArgs interface:
```typescript
csvDelimiter?: string;
```

### 3. Pass Delimiter to Reporter Registry
**File:** `src/reporters/registry.ts` or where reporters are instantiated

When creating CSV reporter, pass delimiter from CLI options:
```typescript
case 'csv':
  return new CsvReporter({
    delimiter: options.csvDelimiter || ',',
    outputPath: options.output,
    quiet: options.quiet,
  });
```

### 4. Update CSV Reporter
**File:** `src/reporters/csv.ts`

- Already supports `delimiter` in constructor options ✅
- Ensure delimiter is used in `formatRow()` method ✅
- No changes needed (already implemented!)

### 5. Update Tests
**File:** `test/integration/reporters.test.ts`

- Un-skip the test at line 317
- Verify test passes with custom delimiter
- Add additional test cases for common delimiters (tab, pipe)

### 6. Update Documentation
**Files to update:**
- `README.md` - Add `--csv-delimiter` to CLI options
- `ARCHITECTURE.md` - Document reporter configuration options
- Examples directory - Add example using custom delimiter

## Testing Checklist
- [ ] Can specify delimiter via `--csv-delimiter` flag
- [ ] Semicolon delimiter works correctly
- [ ] Tab delimiter works correctly
- [ ] Pipe delimiter works correctly
- [ ] Default comma delimiter still works when flag not specified
- [ ] Multi-character delimiters are handled (error or support?)
- [ ] Special characters are properly escaped in CSV output
- [ ] Works with `--output` directory option
- [ ] Works with stdout output

## Edge Cases to Consider
- What if delimiter is the same as the quote character?
- Should we support multi-character delimiters?
- Validate delimiter doesn't contain newlines or invalid characters
- How to specify tab character on command line? (`\t` vs literal tab)

## Estimated Complexity
**Low** - Most infrastructure already exists, mainly CLI plumbing needed.

## Related Files
- `src/cli/commands/run.ts`
- `src/reporters/csv.ts`
- `src/reporters/registry.ts`
- `test/integration/reporters.test.ts`

