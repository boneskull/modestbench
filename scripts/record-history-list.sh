#!/bin/bash
# Record history list command with colors
# Output: public/demos/history-list.cast

set -e

OUTPUT_FILE="${1:-public/demos/history-list.cast}"
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Get the directory this script is in, then go up to find dist/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/cli/index.js"

# Record with asciinema
FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$OUTPUT_FILE" \
  --command "bash -c 'node $CLI_PATH history list --limit 5; echo; node $CLI_PATH history list --format json --limit 2 | head -20'"

echo "✅ Recorded history list demo to $OUTPUT_FILE"

