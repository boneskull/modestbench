#!/bin/bash
# Record history compare command with colors
# Output: public/demos/history-compare.cast
# Usage: ./scripts/record-history-compare.sh [output-file] [run-id-1] [run-id-2]

set -e

OUTPUT_FILE="${1:-public/demos/history-compare.cast}"
RUN_ID_1="${2:-}"
RUN_ID_2="${3:-}"

mkdir -p "$(dirname "$OUTPUT_FILE")"

# Get the directory this script is in, then go up to find dist/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/cli/index.js"

# If run IDs not provided, get the last 2 runs
if [ -z "$RUN_ID_1" ] || [ -z "$RUN_ID_2" ]; then
  echo "Fetching recent run IDs..."
  RUNS=$(FORCE_COLOR=1 node $CLI_PATH history list --format json --limit 2 | grep -oE '"id"\s*:\s*"[^"]*"' | cut -d'"' -f4 || FORCE_COLOR=1 node $CLI_PATH history list --format json --limit 2 | grep -oE '"id"\s*:\s*[0-9a-z]+' | cut -d':' -f2 | xargs)
  RUNS_ARRAY=($RUNS)

  if [ ${#RUNS_ARRAY[@]} -lt 2 ]; then
    echo "❌ Error: Need at least 2 historical runs to compare"
    exit 1
  fi

  RUN_ID_1="${RUNS_ARRAY[1]}"
  RUN_ID_2="${RUNS_ARRAY[0]}"
fi

echo "Recording comparison of $RUN_ID_1 vs $RUN_ID_2..."

# Record with asciinema
FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$OUTPUT_FILE" \
  --command "bash -c 'node $CLI_PATH history compare \"$RUN_ID_1\" \"$RUN_ID_2\"'"

echo "✅ Recorded history compare demo to $OUTPUT_FILE"

