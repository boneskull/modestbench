#!/usr/bin/env bash

# Script to record an asciinema demo of modestbench for documentation
#
# Usage:
#   ./scripts/record-demo.sh [output-file]
#
# The recording will be saved to public/modestbench.cast by default,
# which is where the documentation expects it.
#
# After recording:
#   1. Preview with: asciinema play public/modestbench.cast
#   2. Build docs with: npm run docs:build
#   3. Preview docs with: npm run docs:preview
#
# Requirements:
#   - asciinema CLI tool: https://asciinema.org/

set -e

OUTPUT_FILE="${1:-public/modestbench.cast}"

echo "Recording modestbench demo..."
echo "This will record the output of running modestbench on the examples."
echo ""
echo "Press Ctrl+D when done recording."
echo ""

# Make sure we're in the project root
cd "$(dirname "$0")/.."

# Record the demo
asciinema rec "$OUTPUT_FILE" \
  --overwrite \
  --cols 100 \
  --rows 60 \
  --title "modestbench Getting Started Demo" \
  --command "modestbench run examples/benchmarks/advanced-operations.bench.js --iterations 1000 --warmup 100"

echo ""
echo "Recording saved to: $OUTPUT_FILE"
echo ""
echo "To preview the recording, run:"
echo "  asciinema play $OUTPUT_FILE"
echo ""
echo "To build and preview the docs, run:"
echo "  npm run docs:build && npm run docs:preview"
