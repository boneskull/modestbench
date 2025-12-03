# modestbench Development Guide

## Project-Specific Practices

### Stylized Name

In Markdown text, refer to the name of this project as `**modestbench**` (bold) instead of `ModestBench` or `Modestbench`.

### Git Workflow

**Linear History Required:**

- No merge commits - use `git rebase` or `git merge --ff-only`
- If merge commits exist, use `git rebase -i` to eliminate them

**Feature Development with Worktrees:**

```bash
# Create worktree INSIDE project directory
git worktree add .worktrees/<feature-name> -b feature/<feature-name>
cd .worktrees/<feature-name>/

# Work on feature...

# When done, see skills/collaboration/finishing-a-development-branch
```

**Branch Naming:**

- Use `feature/<descriptive-name>` (not `feat/`)
- Worktrees go in `../modestbench.worktree/` directory

### Code Style

**Testing:**

- Follow TDD principles (search your user rules for "test-driven development")
- Contract tests in `test/contract/`
- Integration tests in `test/integration/`
- Use the wallaby MCP tools for runtime debugging

**Architecture:**

- Core engine: `src/core/engine.ts` - benchmark execution
- CLI commands: `src/cli/commands/` - yargs-based CLI
- Reporters: `src/reporters/` - output formats (human, json, csv)
- Config: `src/config/` - configuration management with Zod

**Key Principles:**

- Reporters: `--quiet` suppresses progress (stderr), not data output (stdout)
- When no `--output` specified, data reporters write to stdout
- All reporters support `outputPath` for file output

### Development Workflow

1. **Planning:** Create `.plan.md` files for complex features
2. **Implementation:**
   - Write tests first (TDD)
   - Keep functions focused (see `skills/coding/keeping-routines-focused`)
   - Name by domain (see `skills/coding/naming-by-domain`)
3. **Testing:** Run `npm test` - aim for high coverage
4. **Building:** `npm run build` before committing
5. **Verification:** Check linter with `eslint` (see `skills/debugging/verification-before-completion`)

### Common Patterns

**CLI Options:**

- Use yargs for argument parsing
- Options in `src/cli/commands/*.ts`
- Types in `src/types/cli.ts`

**Reporter Structure:**

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

**Adding CLI Flags:**

1. Add to command definition in `src/cli/commands/run.ts`
2. Add type to `src/types/cli.ts`
3. Pass through to appropriate component
4. Add integration test in `test/integration/`

### File Locations

- Source: `src/`
- Tests: `test/` (contract and integration)
- Built output: `dist/` (gitignored)
- Examples: `examples/`
- Docs: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`

### External Dependencies

- **Testing:** `node:test` (built-in), `bupkis` (assertions)
- **CLI:** `yargs` (argument parsing)
- **Validation:** `zod` (schemas)
- **Config:** `cosmiconfig` (file loading)
- **Build:** `tshy` (TypeScript + hybrid module builds)

## Quality Standards

- All tests must pass: `npm test`
- No linting errors: Check with `eslint`
- Linear git history (no merge commits)
- Comprehensive test coverage for new features
- Documentation updates for user-facing changes

## Getting Help

- Follow any instructions in user rules for general development patterns
- See `ARCHITECTURE.md` for system design
- See `CONTRIBUTING.md` for contribution guidelines
- See `README.md` for user documentation
