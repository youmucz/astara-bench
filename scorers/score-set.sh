#!/usr/bin/env bash
# scorers/score-set.sh — set membership F1.
# SPDX-License-Identifier: Apache-2.0
# Usage: bash scorers/score-set.sh <task-dir> <model-output-file>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_common.sh"

TASK_DIR="${1:-}"; OUTPUT_FILE="${2:-}"
[ -d "$TASK_DIR" ] && [ -f "$OUTPUT_FILE" ] || { echo "Usage: $0 <task-dir> <output-file>" >&2; exit 2; }

EXPECTED=$(python3 -c "
import yaml, sys
d = yaml.safe_load(open('$TASK_DIR/answer.yaml'))
items = d.get('ground_truth',{}).get('expected_items',[])
print('|'.join(items))
" 2>/dev/null || echo "")
PREDICTED=$(cat "$OUTPUT_FILE" | tr ',;' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' | sort -u | tr '\n' '|' | sed 's/|$//')

[ -z "$EXPECTED" ] && { output_json 0.0 '"reason": "no expected_items in answer.yaml"'; exit 0; }

read -r PRECISION RECALL F1 <<<"$(python3 - "$EXPECTED" "$PREDICTED" <<'PYEOF'
import sys
exp = set(sys.argv[1].split('|')) if sys.argv[1] else set()
pred = set(sys.argv[2].split('|')) if sys.argv[2] else set()
tp = len(exp & pred)
fp = len(pred - exp)
fn = len(exp - pred)
p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
r = tp / (tp + fn) if (tp + fn) > 0 else 0.0
f = 2*p*r/(p+r) if (p+r) > 0 else 0.0
print(f"{p:.4f} {r:.4f} {f:.4f}")
PYEOF
)"

output_json "$F1" '"precision": '"$PRECISION" ''"recall": '"$RECALL"
