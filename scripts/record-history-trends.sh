#!/bin/bash
# Record history trends command with colors
# Output: public/demos/history-trends.cast

set -e

OUTPUT_FILE="${1:-public/demos/history-trends.cast}"
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Get the directory this script is in, then go up to find dist/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/cli/index.js"

# Record with asciinema
FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$OUTPUT_FILE" \
  --command "bash -c 'node $CLI_PATH history trends --limit 10'"

echo "✅ Recorded history trends demo to $OUTPUT_FILE"

