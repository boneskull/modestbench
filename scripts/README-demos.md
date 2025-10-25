# Recording History Command Demos

This directory contains scripts to generate asciinema recordings of ModestBench history commands for documentation. The `.cast` files can be embedded in documentation using the AsciinemaPlayer component.

## Quick Start

Record all history command demos:

```bash
./scripts/record-all-history-demos.sh
```

This generates `.cast` files to `public/demos/` for use in site documentation.

## Individual Scripts

### Record All Demos

```bash
./scripts/record-all-history-demos.sh [output-directory]
```

Records all history command demos in sequence. Generates:

- `history-list.cast`
- `history-show.cast`
- `history-compare.cast`
- `history-trends.cast`

### Record History List

```bash
./scripts/record-history-list.sh [output-file]
```

Records the `modestbench history list` command showing recent runs.

**Output:** `public/demos/history-list.cast` (default)

### Record History Show

```bash
./scripts/record-history-show.sh [output-file] [run-id]
```

Records the `modestbench history show` command for a specific run.

**Output:** `public/demos/history-show.cast` (default)
**Run ID:** Auto-detected from latest run if not provided

### Record History Compare

```bash
./scripts/record-history-compare.sh [output-file] [run-id-1] [run-id-2]
```

Records the `modestbench history compare` command comparing two runs.

**Output:** `public/demos/history-compare.cast` (default)
**Run IDs:** Auto-detected from last 2 runs if not provided

### Record History Trends

```bash
./scripts/record-history-trends.sh [output-file]
```

Records the `modestbench history trends` command with trend analysis and visualizations.

**Output:** `public/demos/history-trends.cast` (default)

## Using in Documentation

Once generated, reference the `.cast` files in Astro components:

```astro
---
import { AsciinemaPlayer } from '@components/AsciinemaPlayer.astro';
---

<AsciinemaPlayer src="/demos/history-list.cast" />
```

## Environment Variables

All scripts respect `FORCE_COLOR=1` for colored output (enabled by default).

## Requirements

- `asciinema` command-line tool installed
- ModestBench with historical data (at least 1 run for `list`, 2 runs for `compare`, etc.)
- bash shell

Install asciinema:

```bash
npm install -g asciinema
# or
brew install asciinema
```

## Notes

- Scripts use idle time of 0.5 seconds between commands for readability
- Empty lines are removed for cleaner playback
- Color output is forced to ensure ANSI codes are captured
- Run ID detection is automatic; provide explicit IDs to override
