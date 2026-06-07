#!/usr/bin/env bash
# scorers/score-exact.sh — exact string match after normalization.
# SPDX-License-Identifier: Apache-2.0
# Usage: bash scorers/score-exact.sh <task-dir> <model-output-file>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_common.sh"

TASK_DIR="${1:-}"; OUTPUT_FILE="${2:-}"
[ -d "$TASK_DIR" ] && [ -f "$OUTPUT_FILE" ] || { echo "Usage: $0 <task-dir> <output-file>" >&2; exit 2; }

GT=$(read_yaml_scalar "$TASK_DIR/answer.yaml" "ground_truth.value" || true)
ACTUAL=$(cat "$OUTPUT_FILE")
GT_NORM=$(normalize_str "${GT:-}")
ACT_NORM=$(normalize_str "$ACTUAL")

if [ -n "$GT_NORM" ] && [ "$GT_NORM" = "$ACT_NORM" ]; then
  output_json 1.0 '"match": true'
  exit 0
fi

# Check alternative_accept (if present)
ALT=$(read_yaml_scalar "$TASK_DIR/answer.yaml" "ground_truth.alternative_accept" || true)
if [ -n "$ALT" ]; then
  IFS=',' read -ra ALTS <<< "$(printf "%s" "$ALT" | tr -d '[]' | tr -d '"' | tr -d "'")"
  for a in "${ALTS[@]}"; do
    a_norm=$(normalize_str "$a")
    if [ "$a_norm" = "$ACT_NORM" ]; then
      output_json 1.0 '"match": "alternative"'
      exit 0
    fi
  done
fi

# Default: fail
output_json 0.0 '"match": false' '"expected": "\"'"$GT"'\""' '"got": "\"'"$ACTUAL"'\""'
exit 0
