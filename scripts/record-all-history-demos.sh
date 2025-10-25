#!/bin/bash
# Record all history command demos with colors
# Generates asciinema .cast files for documentation
# Output: public/demos/history-*.cast

set -e

DEMO_DIR="${1:-public/demos}"
mkdir -p "$DEMO_DIR"

# Get the directory this script is in, then go up to find dist/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/cli/index.js"

echo "🎬 Recording ModestBench History Demos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Record history list
echo "1️⃣  Recording 'history list' demo..."
FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$DEMO_DIR/history-list.cast" \
  --command "bash -c 'node $CLI_PATH history list --limit 5'"
echo "   ✅ Saved to $DEMO_DIR/history-list.cast"
echo ""

# Get run IDs for show and compare commands
echo "2️⃣  Fetching run IDs..."
RUNS=$(FORCE_COLOR=1 node $CLI_PATH history list --format json --limit 2 2>/dev/null | grep -oE '"id"\s*:\s*"[^"]*"' | cut -d'"' -f4 || FORCE_COLOR=1 node $CLI_PATH history list --format json --limit 2 2>/dev/null | grep -oE '"id"\s*:\s*[0-9a-z]+' | cut -d':' -f2 | xargs || echo "")
RUNS_ARRAY=($RUNS)

if [ ${#RUNS_ARRAY[@]} -ge 1 ]; then
  LATEST_RUN="${RUNS_ARRAY[0]}"

  # Record history show
  echo "3️⃣  Recording 'history show' demo..."
  FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$DEMO_DIR/history-show.cast" \
    --command "bash -c 'node $CLI_PATH history show \"$LATEST_RUN\"'"
  echo "   ✅ Saved to $DEMO_DIR/history-show.cast"
  echo ""

  # Record history compare (if 2+ runs available)
  if [ ${#RUNS_ARRAY[@]} -ge 2 ]; then
    PREV_RUN="${RUNS_ARRAY[1]}"

    echo "4️⃣  Recording 'history compare' demo..."
    FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$DEMO_DIR/history-compare.cast" \
      --command "bash -c 'node $CLI_PATH history compare \"$PREV_RUN\" \"$LATEST_RUN\"'"
    echo "   ✅ Saved to $DEMO_DIR/history-compare.cast"
    echo ""
  else
    echo "⚠️  Skipping 'history compare' - need at least 2 runs"
    echo ""
  fi
else
  echo "⚠️  Skipping 'history show' and 'history compare' - no runs found"
  echo ""
fi

# Record history trends
echo "5️⃣  Recording 'history trends' demo..."
FORCE_COLOR=1 asciinema rec --overwrite -i 0.5 "$DEMO_DIR/history-trends.cast" \
  --command "bash -c 'node $CLI_PATH history trends --limit 10'"
echo "   ✅ Saved to $DEMO_DIR/history-trends.cast"
echo ""

echo "✨ All demos recorded!"
echo ""
echo "📁 Saved to: $DEMO_DIR/"
ls -lh "$DEMO_DIR"/history-*.cast 2>/dev/null || echo "   (No demos generated)"

