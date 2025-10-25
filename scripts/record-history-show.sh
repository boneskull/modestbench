#!/bin/bash
# Record history show command with colors
# Output: public/demos/history-show.cast
# Usage: ./scripts/record-history-show.sh [output-file] [run-id]

set -e

OUTPUT_FILE="${1:-public/demos/history-show.cast}"
RUN_ID="${2:-}"

mkdir -p "$(dirname "$OUTPUT_FILE")"

# Get the directory this script is in, then go up to find dist/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/cli/index.js"

# If run ID not provided, get the latest run
if [ -z "$RUN_ID" ]; then
  echo "Fetching latest run ID..."
  RUN_ID=$(FORCE_COLOR=1 node $CLI_PATH history list --format json --limit 1 | grep -oE '"id"\s*:\s*"[^"]*"' | cut -d'"' -f4)

  if [ -z "$RUN_ID" ]; then
    echo "❌ Error: No historical runs found"
    exit 1
  fi
fi

echo "Recording show for $RUN_ID..."

# Record with asciinema
FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$OUTPUT_FILE" \
  --command "bash -c 'node $CLI_PATH history show \"$RUN_ID\"'"

echo "✅ Recorded history show demo to $OUTPUT_FILE"

