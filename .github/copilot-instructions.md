# ModestBench Development Guide

## Git Workflow

### Linear History Required

- **No merge commits** - use `git rebase` or `git merge --ff-only`
- If merge commits exist, use `git rebase -i` to eliminate them
- Keep history clean and readable

### Feature Development with Worktrees

Create worktrees **INSIDE** the project directory:

```bash
# Create worktree in worktrees/ directory
git worktree add worktrees/<feature-name> -b feature/<feature-name>
cd worktrees/<feature-name>/

# Work on feature...
# When done, clean up the worktree
```

### Branch Naming

- Use `feature/<descriptive-name>` (not `feat/`)
- Worktrees go in `worktrees/` directory (already gitignored)

## Code Organization

### Architecture

- **Core engine:** `src/core/engine.ts` - benchmark execution orchestration
- **CLI commands:** `src/cli/commands/` - yargs-based command definitions
- **Reporters:** `src/reporters/` - output formats (human, json, csv)
- **Config:** `src/config/` - configuration management with Zod schemas
- **Storage:** `src/storage/` - benchmark history persistence
- **Progress:** `src/progress/` - progress tracking and display

### Testing Structure

- **Contract tests:** `test/contract/` - unit tests for individual components
- **Integration tests:** `test/integration/` - end-to-end CLI behavior
- **Test utilities:** `test/util.ts` - shared test helpers

## Development Workflow

### 1. Planning

For complex features, create `.plan.md` files documenting:

- Overview and goals
- Implementation steps
- Testing checklist
- Edge cases to consider

### 2. Test-Driven Development

1. Write failing tests first
2. Implement minimal code to pass
3. Refactor for clarity
4. Run full test suite: `npm test`

### 3. Building

- Build before committing: `npm run build`
- Generates both ESM and CJS outputs in `dist/`
- Uses `tshy` for hybrid module builds

### 4. Verification

- Check for linting errors: Run ESLint
- Ensure all tests pass
- Verify no type errors

## Key Principles

### Reporter Behavior

**Important distinction:**

- `--quiet` suppresses **progress messages** (stderr)
- `--quiet` does **NOT** suppress **data output** (stdout)

When no `--output` directory is specified:

- Data reporters (JSON, CSV) write to stdout
- Progress reporters (human) write to stderr

All reporters support `outputPath` for file output.

### CLI Options

**Structure:**

1. Define options in `src/cli/commands/*.ts` using yargs
2. Add TypeScript types in `src/types/cli.ts`
3. Pass through to appropriate components
4. Add integration tests in `test/integration/`

**Example pattern:**

```typescript
// In src/cli/commands/run.ts
.option('my-option', {
  description: 'Description of option',
  type: 'string',
  default: 'default-value',
})

// In src/types/cli.ts
export interface RunCommandArgs {
  myOption?: string;
}
```

### Reporter Implementation

Reporters implement the `Reporter` interface:

```typescript
class MyReporter implements Reporter {
  onRunStart(run: BenchmarkRun): void {}
  onFileStart(file: string): void {}
  onSuiteStart(suite: string): void {}
  onTaskStart(task: string): void {}
  onTaskResult(result: TaskResult): void {}
  onSuiteEnd(suite: string): void {}
  onFileEnd(file: string): void {}
  onRunEnd(summary: RunSummary): Promise<void> {}
}
```

## Coding Standards

### Function Design

- Keep functions focused on single responsibility
- Extract complex logic into named helper functions
- Prefer pure functions when possible

### Naming Conventions

- Name by domain/business purpose, not implementation
- Use full words, avoid abbreviations unless standard
- Be consistent with existing codebase patterns

### Error Handling

- Validate inputs at boundaries
- Use descriptive error messages
- Handle errors at appropriate level
- Don't swallow errors silently

## External Dependencies

- **Testing:** `node:test` (built-in), `bupkis` (assertions)
- **CLI:** `yargs` (argument parsing)
- **Validation:** `zod` (schema validation)
- **Config:** `cosmiconfig` (configuration file loading)
- **Build:** `tshy` (TypeScript hybrid builds)

## File Locations

- **Source:** `src/`
- **Tests:** `test/` (contract and integration)
- **Built output:** `dist/` (gitignored)
- **Examples:** `examples/` (demo benchmarks)
- **Documentation:** `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`

## Quality Standards

Before committing:

- ✅ All tests pass: `npm test`
- ✅ No linting errors
- ✅ Linear git history (no merge commits)
- ✅ Tests added for new features
- ✅ Documentation updated for user-facing changes

## Common Patterns

### Configuration Loading

Uses `cosmiconfig` with Zod validation:

1. Load config from file (if exists)
2. Validate against schema
3. Merge with CLI arguments (CLI takes precedence)
4. Apply defaults for missing values

### Benchmark Execution Flow

1. Load configuration
2. Discover benchmark files
3. Initialize reporters
4. For each file:
   - Load benchmark definitions
   - Execute suites → tasks
   - Report results via reporter callbacks
5. Generate summary statistics
6. Write final reports

### Progress Tracking

- `ProgressManager` handles progress display
- Reporters receive progress events
- Human reporter shows progress bars (unless `--quiet`)
- Data reporters focus on final results

## Documentation Resources

- **README.md** - User documentation, getting started
- **ARCHITECTURE.md** - System design and component interactions
- **CONTRIBUTING.md** - Contribution guidelines
- **Examples** - Working benchmark examples in `examples/`
