# Cursor Workflow Prompts Guide

This guide explains how to use the converted workflow prompts in Cursor.

## Quick Reference

All workflow prompts are now available in `.cursor/prompts/` and can be referenced using `@prompt-name` in chat.

### Available Prompts

| Prompt          | Usage                            | Description                                          |
| --------------- | -------------------------------- | ---------------------------------------------------- |
| `@specify`      | `@specify` + feature description | Create a feature specification from natural language |
| `@clarify`      | `@clarify`                       | Resolve ambiguities through max 5 targeted questions |
| `@plan`         | `@plan`                          | Generate implementation plan and design artifacts    |
| `@tasks`        | `@tasks`                         | Create actionable, dependency-ordered task breakdown |
| `@implement`    | `@implement`                     | Execute tasks following TDD principles               |
| `@analyze`      | `@analyze`                       | Cross-artifact consistency analysis (read-only)      |
| `@constitution` | `@constitution`                  | Update project constitution and principles           |

## Usage Examples

### Starting a New Feature

```
@specify Create a CSV export feature for benchmark results
```

This will:

1. Run `.specify/scripts/bash/create-new-feature.sh`
2. Create a new branch and spec file
3. Generate the specification from your description

### Clarifying Ambiguities

```
@clarify
```

This will:

1. Analyze the current spec for ambiguities
2. Ask up to 5 targeted questions interactively
3. Update the spec with your answers

### Creating Implementation Plan

```
@plan
```

This will:

1. Verify clarifications exist
2. Generate research.md, data-model.md, contracts/, quickstart.md
3. Create implementation plan

### Generating Tasks

```
@tasks
```

This will:

1. Parse all design artifacts
2. Generate dependency-ordered task list
3. Mark parallel tasks with [P]

### Executing Implementation

```
@implement
```

This will:

1. Load tasks.md
2. Execute tasks in dependency order
3. Mark completed tasks as [X]

### Analyzing Consistency

```
@analyze
```

This will:

1. Check spec, plan, and tasks for consistency
2. Validate against constitution
3. Report issues by severity (read-only)

### Updating Constitution

```
@constitution Add a new principle about API versioning
```

This will:

1. Update `.specify/memory/constitution.md`
2. Propagate changes to templates
3. Version bump with rationale

## Workflow Chain

The typical workflow follows this sequence:

1. **@specify** - Create specification
2. **@clarify** - Resolve ambiguities (optional but recommended)
3. **@plan** - Generate implementation plan
4. **@tasks** - Create task breakdown
5. **@implement** - Execute tasks
6. **@analyze** - Validate consistency (can run after tasks or implementation)

## Main .cursorrules File

The `.cursorrules` file provides:

- Project context about the workflow system
- Overview of all available workflows
- Instructions for invoking prompts
- Reference to `.specify/` infrastructure
- Guidance on when to use each workflow

## Infrastructure

All prompts integrate with existing infrastructure:

- **Scripts**: `.specify/scripts/bash/` - Shell scripts for setup and validation
- **Templates**: `.specify/templates/` - Markdown templates for artifacts
- **Constitution**: `.specify/memory/constitution.md` - Non-negotiable project principles
- **Specs**: `specs/NNN-feature-name/` - Feature-specific artifacts

## Key Changes from GitHub Copilot

1. **Command Format**: Changed from `/specify` to `@specify`
2. **Arguments**: Removed `$ARGUMENTS` placeholder, using natural conversation
3. **Frontmatter**: Removed YAML frontmatter (not needed in Cursor)
4. **Context**: Added introductory paragraphs explaining when to use each prompt
5. **Integration**: Maintains all `.specify/` script integration

## Tips

- Use `@prompt-name` to reference prompts in chat
- Prompts can access and execute `.specify/scripts/` shell scripts
- All file paths are absolute for consistency
- Interactive workflows (like clarify) work naturally in conversation
- Constitution principles are non-negotiable across all workflows
