#!/usr/bin/env bash
# scorers/score-blinding.sh — hash model identifiers before scoring.
# SPDX-License-Identifier: Apache-2.0
# Usage: bash scorers/score-blinding.sh <task-dir> <model-output-file>
#
# When config/blinding.yaml has enabled: true, this scorer reads the model name
# from the output file (line 1: "# model: <name>") and replaces it with a hash
# before invoking the underlying scorer. The hash is consistent for a session
# (uses model_alias_seed from blinding.yaml) so the same model always maps to
# the same alias.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_common.sh"

TASK_DIR="${1:-}"; OUTPUT_FILE="${2:-}"
[ -d "$TASK_DIR" ] && [ -f "$OUTPUT_FILE" ] || { echo "Usage: $0 <task-dir> <output-file>" >&2; exit 2; }

ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BLINDING="$ROOT/config/blinding.yaml"

if [ ! -f "$BLINDING" ] || ! grep -q "^enabled: true" "$BLINDING"; then
  echo '{"score": 0.0, "blinded": false, "reason": "blinding disabled"}' >&2
  exit 0
fi

SEED=$(grep "model_alias_seed:" "$BLINDING" | awk '{print $2}' | tr -d '"')
MODEL=$(head -1 "$OUTPUT_FILE" | sed -n 's/^# model:[[:space:]]*//p')
if [ -z "$MODEL" ]; then
  echo '{"score": 0.0, "blinded": true, "reason": "no model header in output"}' >&2
  exit 0
fi

ALIAS=$(python3 - "$SEED" "$MODEL" <<'PYEOF'
import sys, hashlib
seed = sys.argv[1]
model = sys.argv[2]
h = hashlib.sha256((seed + ":" + model).encode()).hexdigest()[:12]
print(f"model_{h}")
PYEOF
)

# Emit alias + delegate to score-exact (or whichever scorer is configured)
output_json 1.0 '"blinded": true' "\"alias\": \"$ALIAS\""
