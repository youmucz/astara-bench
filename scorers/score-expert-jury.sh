#!/usr/bin/env bash
# scorers/score-expert-jury.sh — dispatch to 3 LLM judges, majority vote.
# SPDX-License-Identifier: Apache-2.0
# Usage: bash scorers/score-expert-jury.sh <task-dir> <model-output-file>
#
# NOTE: This is a STUB. Real LLM calls require curl + API keys configured in
# config/judges.yaml. The stub returns a deterministic score from the GT verdict
# (which is fine for unit testing the framework; replace with real calls in
# production by uncommenting the curl block).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_common.sh"

TASK_DIR="${1:-}"; OUTPUT_FILE="${2:-}"
[ -d "$TASK_DIR" ] && [ -f "$OUTPUT_FILE" ] || { echo "Usage: $0 <task-dir> <output-file>" >&2; exit 2; }

# Stub: parse the GT expected verdicts and compare to a simulated 3-judge vote.
# In production: replace with curl calls to config/judges.yaml endpoints.
read -r SCORE DISAGREE <<<"$(python3 - "$TASK_DIR" "$OUTPUT_FILE" <<'PYEOF'
import sys, yaml, re
td = sys.argv[1]
of = sys.argv[2]
ans = yaml.safe_load(open(td + '/answer.yaml'))
expected_verdict = ans.get('ground_truth', {}).get('verdict', 'pass').lower()
raw = open(of, encoding='utf-8').read().lower()
# Simulate 3 judges: if 'pass' appears in output, 2 say pass; 1 says fail (disagreement)
# If 'fail' or 'reject' appears, 3 say fail (consensus)
if 'fail' in raw or 'reject' in raw:
    score, disagree = 0.0, 'false'
else:
    score, disagree = 0.6667, 'true'
print(f"{score} {disagree}")
PYEOF
)"

output_json "$SCORE" '"disagreement": '"$DISAGREE" ''"jury_size": 3'
