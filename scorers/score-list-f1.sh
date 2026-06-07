#!/usr/bin/env bash
# scorers/score-list-f1.sh — list precision/recall/F1 with threshold gating.
# SPDX-License-Identifier: Apache-2.0
# Usage: bash scorers/score-list-f1.sh <task-dir> <model-output-file>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_common.sh"

TASK_DIR="${1:-}"; OUTPUT_FILE="${2:-}"
[ -d "$TASK_DIR" ] && [ -f "$OUTPUT_FILE" ] || { echo "Usage: $0 <task-dir> <output-file>" >&2; exit 2; }

read -r PRECISION RECALL F1 PASS <<<"$(python3 - "$TASK_DIR" "$OUTPUT_FILE" <<'PYEOF'
import sys, json
td = sys.argv[1]
of = sys.argv[2]
import yaml
ans = yaml.safe_load(open(td + '/answer.yaml'))
exp = ans.get('ground_truth', {}).get('expected_list', [])
pc = ans.get('ground_truth', {}).get('pass_criteria', {})
min_p = float(pc.get('min_precision', 0.5))
min_r = float(pc.get('min_recall', 0.5))
min_f = float(pc.get('min_f1', 0.5))
raw_out = open(of, encoding='utf-8').read()
pred = [line.strip() for line in raw_out.splitlines() if line.strip()]
exp_s = set(exp); pred_s = set(pred)
tp = len(exp_s & pred_s)
fp = len(pred_s - exp_s)
fn = len(exp_s - pred_s)
p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
r = tp / (tp + fn) if (tp + fn) > 0 else 0.0
f = 2*p*r/(p+r) if (p+r) > 0 else 0.0
passed = (p >= min_p) and (r >= min_r) and (f >= min_f)
print(f"{p:.4f} {r:.4f} {f:.4f} {'true' if passed else 'false'}")
PYEOF
)"

output_json "$F1" '"precision": '"$PRECISION" ''"recall": '"$RECALL" ''"pass": '"$PASS"
