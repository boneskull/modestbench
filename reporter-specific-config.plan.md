# Feature Plan: Reporter-Specific CLI Configuration

## Overview
Add support for configuring individual reporters via CLI flags (e.g., `--human-colors`, `--json-pretty`, `--csv-delimiter`).

## Current Behavior
- Reporters are configured via config file or environment variables
- No CLI flags for per-reporter configuration
- Global options like `--quiet` affect all reporters

## Desired Behavior
Users can configure individual reporters via CLI flags:
- `--human-colors <boolean>` - Enable/disable colors in human reporter
- `--json-pretty <boolean>` - Enable/disable pretty-printing in JSON reporter
- `--csv-delimiter <string>` - Custom delimiter for CSV reporter
- Pattern: `--<reporter>-<option> <value>`

## Implementation Steps

### 1. Design CLI Option Naming Convention
**Decision needed:**
- Flat flags: `--json-pretty`, `--human-colors`, `--csv-delimiter`
- Namespaced: `--reporter.json.pretty`, `--reporter.human.colors`
- Hybrid: Current approach with flat flags seems most user-friendly

### 2. Update CLI Command Definition
**File:** `src/cli/commands/run.ts`

Add reporter-specific options:
```typescript
// Human reporter options
.option('human-colors', {
  description: 'Enable/disable colors in human reporter output',
  type: 'boolean',
})
.option('human-progress', {
  description: 'Show progress bars in human reporter',
  type: 'boolean',
  default: true,
})

// JSON reporter options
.option('json-pretty', {
  description: 'Pretty-print JSON output',
  type: 'boolean',
  default: false,
})

// CSV reporter options
.option('csv-delimiter', {
  description: 'Delimiter character for CSV output',
  type: 'string',
  default: ',',
})
.option('csv-headers', {
  description: 'Include header row in CSV output',
  type: 'boolean',
  default: true,
})
.option('csv-quote', {
  description: 'Quote character for CSV output',
  type: 'string',
  default: '"',
})
```

### 3. Create Reporter Config Mapper
**New file:** `src/reporters/cli-config-mapper.ts`

Create utility to map CLI args to reporter-specific configs:
```typescript
interface ReporterCliConfig {
  human?: {
    colors?: boolean;
    progress?: boolean;
  };
  json?: {
    prettyPrint?: boolean;
  };
  csv?: {
    delimiter?: string;
    includeHeaders?: boolean;
    quote?: string;
  };
}

export function mapCliArgsToReporterConfig(args: RunCommandArgs): ReporterCliConfig {
  return {
    human: {
      colors: args.humanColors,
      progress: args.humanProgress,
    },
    json: {
      prettyPrint: args.jsonPretty,
    },
    csv: {
      delimiter: args.csvDelimiter,
      includeHeaders: args.csvHeaders,
      quote: args.csvQuote,
    },
  };
}
```

### 4. Update Reporter Registry
**File:** `src/reporters/registry.ts`

Modify `createReporter()` to accept and pass reporter-specific config:
```typescript
function createReporter(
  name: string,
  options: ReporterOptions,
  reporterConfig: ReporterCliConfig,
): Reporter {
  switch (name) {
    case 'human':
      return new HumanReporter({
        ...options,
        colors: reporterConfig.human?.colors ?? true,
        showProgress: reporterConfig.human?.progress ?? true,
      });
    
    case 'json':
      return new JsonReporter({
        ...options,
        prettyPrint: reporterConfig.json?.prettyPrint ?? false,
      });
    
    case 'csv':
      return new CsvReporter({
        ...options,
        delimiter: reporterConfig.csv?.delimiter ?? ',',
        includeHeaders: reporterConfig.csv?.includeHeaders ?? true,
        quote: reporterConfig.csv?.quote ?? '"',
      });
    
    default:
      throw new Error(`Unknown reporter: ${name}`);
  }
}
```

### 5. Update Type Definitions
**File:** `src/types/cli.ts`

Add reporter-specific CLI options:
```typescript
export interface RunCommandArgs extends BaseCommandArgs {
  // ... existing options ...
  
  // Human reporter options
  humanColors?: boolean;
  humanProgress?: boolean;
  
  // JSON reporter options
  jsonPretty?: boolean;
  
  // CSV reporter options
  csvDelimiter?: string;
  csvHeaders?: boolean;
  csvQuote?: string;
}
```

### 6. Handle Config Precedence
**File:** `src/config/manager.ts`

Define precedence order:
1. CLI flags (highest priority)
2. Config file `reporterConfig` section
3. Reporter defaults (lowest priority)

### 7. Update Tests
**File:** `test/integration/reporters.test.ts`

- Un-skip the test at line 394
- Add test cases for each reporter-specific flag
- Test precedence: CLI > config file > defaults
- Test with multiple reporters using different configs

### 8. Update Documentation
- `README.md` - Add section on reporter-specific CLI options
- `ARCHITECTURE.md` - Document configuration precedence
- Create examples showing reporter configuration

## Testing Checklist
- [ ] `--human-colors` enables/disables colors
- [ ] `--json-pretty` formats JSON output
- [ ] `--csv-delimiter` changes CSV delimiter
- [ ] `--csv-headers` controls header inclusion
- [ ] CLI flags override config file settings
- [ ] Works with single reporter
- [ ] Works with multiple reporters simultaneously
- [ ] Invalid values are validated and produce helpful errors
- [ ] Help text documents all reporter-specific options

## Edge Cases to Consider
- What if reporter isn't used but flag is specified? (ignore or warn?)
- How to document which flags apply to which reporters?
- Should config file reporter settings merge with CLI or be overridden entirely?
- Validation: ensure boolean flags get boolean values, string flags get strings

## Documentation Considerations
- Group reporter-specific flags in help text by reporter
- Provide examples for common configuration scenarios
- Document that flags only affect specified reporters

## Estimated Complexity
**Medium** - Requires coordinating CLI parsing, config management, and reporter instantiation. Need clear precedence rules and good documentation.

## Related Files
- `src/cli/commands/run.ts`
- `src/config/manager.ts`
- `src/reporters/registry.ts`
- `src/reporters/human.ts`
- `src/reporters/json.ts`
- `src/reporters/csv.ts`
- `src/types/cli.ts`
- `test/integration/reporters.test.ts`

## Alternative Approaches Considered

### Approach 1: Nested CLI Arguments
Use yargs groups/nesting: `--reporter-json-pretty`
- Pro: More explicit
- Con: Verbose, awkward to type

### Approach 2: JSON String Argument
Single `--reporter-config '{"json": {"pretty": true}}'`
- Pro: Flexible, supports any config
- Con: Difficult to use, hard to document, error-prone

### Approach 3: Current Approach (Flat Flags)
Individual flags: `--json-pretty`, `--csv-delimiter`
- Pro: Easy to use, discoverable via `--help`
- Con: Namespace pollution (selected approach)

