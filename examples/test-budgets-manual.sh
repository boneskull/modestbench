#!/usr/bin/env bash
#
# Manual Testing Script for Performance Budgets Feature
#
# This script demonstrates the key features of the performance budgets system
# with the new nested configuration structure.
#

set -e

echo "========================================"
echo "Performance Budgets Manual Testing"
echo "========================================"
echo

export FORCE_COLOR=1

PASSING_BENCHMARKS=(bench/advanced-operations.bench.js bench/array-operations.bench.js performance-tips.bench.js typescript-example.bench.ts)
cd "$(dirname "$0")"

# Create .tmp directory for generated files
mkdir -p .tmp

# Clean up from previous runs (including any baselines in root)
rm -f .modestbench.history.jsonl .modestbench.baselines.json
rm -rf .tmp/*

echo "1. Run benchmarks (no budgets yet)"
echo "===================================="
npx modestbench run "${PASSING_BENCHMARKS[@]}" --quiet
echo

echo "2. Create and manage baselines"
echo "==============================="
npx modestbench baseline set my-baseline --default --cwd .tmp
echo "✓ Created baseline 'my-baseline' and set as default"
echo

npx modestbench baseline list --cwd .tmp
echo

npx modestbench baseline show my-baseline --cwd .tmp
echo

echo "3. Test absolute budgets (should PASS)"
echo "======================================="
cat > .tmp/modestbench-budgets-pass.json << 'EOF'
{
  "pattern": ["bench/array-operations.bench.js"],
  "budgets": {
    "bench/array-operations.bench.js": {
      "Array Operations": {
        "Array.push()": {
          "absolute": {
            "maxTime": "1s",
            "minOpsPerSec": 100
          }
        }
      }
    }
  },
  "budgetMode": "fail"
}
EOF

npx modestbench run --config .tmp/modestbench-budgets-pass.json --reporters simple
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE (should be 0)"
echo

echo "4. Test absolute budgets (should FAIL)"
echo "======================================="
cat > .tmp/modestbench-budgets-fail.json << 'EOF'
{
  "pattern": ["bench/array-operations.bench.js"],
  "budgets": {
    "bench/array-operations.bench.js": {
      "Array Operations": {
        "Array.push()": {
          "absolute": {
            "maxTime": "1ns",
            "minOpsPerSec": 999999999
          }
        }
      }
    }
  },
  "budgetMode": "fail"
}
EOF

echo "Running with unrealistic budget (should fail)..."
npx modestbench run --config .tmp/modestbench-budgets-fail.json --reporters simple || true
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE (should be 1)"
echo

echo "5. Test relative budgets"
echo "========================"
echo "Creating fresh baseline for relative test..."
npx modestbench run bench/array-operations.bench.js --quiet > /dev/null 2>&1
npx modestbench baseline set relative-test-baseline --cwd .tmp > /dev/null 2>&1
cat > .tmp/modestbench-budgets-relative.json << 'EOF'
{
  "pattern": ["bench/array-operations.bench.js"],
  "baseline": "relative-test-baseline",
  "budgets": {
    "bench/array-operations.bench.js": {
      "Array Operations": {
        "Array.push()": {
          "relative": {
            "maxRegression": "50%"
          }
        }
      }
    }
  },
  "budgetMode": "fail"
}
EOF

npx modestbench run --config .tmp/modestbench-budgets-relative.json --reporters simple
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE (should be 0)"
echo

echo "6. Test combined budgets"
echo "========================"
cat > .tmp/modestbench-budgets-combined.json << 'EOF'
{
  "pattern": ["bench/array-operations.bench.js"],
  "baseline": "my-baseline",
  "budgets": {
    "bench/array-operations.bench.js": {
      "Array Operations": {
        "Array.push()": {
          "absolute": {
            "maxTime": "1s",
            "minOpsPerSec": 100
          },
          "relative": {
            "maxRegression": "50%"
          }
        }
      }
    }
  },
  "budgetMode": "fail"
}
EOF

npx modestbench run --config .tmp/modestbench-budgets-combined.json --reporters human
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE (should be 0)"
echo

echo "7. Test budget modes"
echo "===================="

echo "Testing WARN mode (shows warning, exits 0)..."
cat > .tmp/modestbench-budgets-warn.json << 'EOF'
{
  "pattern": ["bench/array-operations.bench.js"],
  "budgets": {
    "bench/array-operations.bench.js": {
      "Array Operations": {
        "Array.push()": {
          "absolute": { "maxTime": "1ns" }
        }
      }
    }
  },
  "budgetMode": "warn"
}
EOF

npx modestbench run --config .tmp/modestbench-budgets-warn.json --reporters human 2>&1 | grep -E "(Warning|Exit)"
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE (should be 0)"
echo

echo "Testing REPORT mode (includes in output, exits 0)..."
cat > .tmp/modestbench-budgets-report.json << 'EOF'
{
  "pattern": ["bench/array-operations.bench.js"],
  "budgets": {
    "bench/array-operations.bench.js": {
      "Array Operations": {
        "Array.push()": {
          "absolute": { "maxTime": "1ns" }
        }
      }
    }
  },
  "budgetMode": "report"
}
EOF

npx modestbench run --config .tmp/modestbench-budgets-report.json --reporters simple
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE (should be 0)"
echo

echo "8. Test different reporters"
echo "==========================="

echo "Human reporter (colorful):"
npx modestbench run --config .tmp/modestbench-budgets-pass.json --reporters human

echo
echo "Simple reporter (plain text):"
npx modestbench run --config .tmp/modestbench-budgets-pass.json --reporters simple

echo
echo "JSON reporter (check budgetSummary):"
npx modestbench run --config .tmp/modestbench-budgets-pass.json --reporters json | \
  node -e "const data = JSON.parse(require('fs').readFileSync(0, 'utf8')); console.log('budgetSummary:', JSON.stringify(data.run.budgetSummary, null, 2));"

echo
echo "CSV reporter (check budgetPassed column):"
npx modestbench run --config .tmp/modestbench-budgets-pass.json --reporters csv --output .tmp/results.csv --quiet
echo "CSV headers:"
head -1 .tmp/results.csv
echo
echo "First result row:"
head -2 .tmp/results.csv | tail -1 | cut -d',' -f1-5
echo

echo "9. Test baseline analyze"
echo "========================"
# Run a few more times to build history
npx modestbench run "${PASSING_BENCHMARKS[@]}" --quiet
npx modestbench run "${PASSING_BENCHMARKS[@]}" --quiet
npx modestbench run "${PASSING_BENCHMARKS[@]}" --quiet

echo "Analyzing history for budget suggestions..."
npx modestbench baseline analyze --runs 5 --confidence 0.95
echo

echo "10. Cleanup"
echo "==========="
npx modestbench baseline delete my-baseline --cwd .tmp
npx modestbench baseline delete relative-test-baseline --cwd .tmp 2>/dev/null || true
rm -rf .tmp/*
echo "✓ Cleaned up test files and baselines"
echo

echo "========================================"
echo "✅ Manual Testing Complete!"
echo "========================================"
echo
echo "All features tested:"
echo "  ✓ Nested budget configuration structure"
echo "  ✓ Baseline management (create, list, show, delete)"
echo "  ✓ Absolute budgets"
echo "  ✓ Relative budgets"
echo "  ✓ Combined budgets"
echo "  ✓ Budget modes (fail, warn, report)"
echo "  ✓ All reporters (human, simple, json, csv)"
echo "  ✓ Budget analysis from history"
echo "  ✓ CSV numeric boolean for budgetPassed"
echo

