#!/usr/bin/env bash
# validators/check-difficulty.sh — Verify axis_scores sum matches self_assessed level.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
TASK_DIR="${1:-}"
[ -d "$TASK_DIR" ] || { echo "Usage: $0 <task-dir>" >&2; exit 2; }
TASK_YAML="$TASK_DIR/task.yaml"
[ -f "$TASK_YAML" ] || { echo "FAIL: missing $TASK_YAML" >&2; exit 1; }

PY="${PYTHON:-python3}"
"$PY" - "$TASK_YAML" <<'PYEOF'
import sys, re
text = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r"self_assessed:\s*(\S+)", text)
if not m:
    print("FAIL: missing self_assessed"); sys.exit(1)
self = m.group(1)
axes = {}
for axis in ("cognitive_complexity","information_availability","gt_clarity","domain_breadth"):
    mm = re.search(rf"{axis}:\s*(\d+)", text)
    if not mm:
        print(f"FAIL: missing axis {axis}"); sys.exit(1)
    axes[axis] = int(mm.group(1))
total = sum(axes.values())
expected = {"easy":(4,6),"medium":(7,10),"hard":(11,13),"expert":(14,16)}.get(self)
if expected is None:
    print(f"FAIL: unknown self_assessed={self}"); sys.exit(1)
if not (expected[0] <= total <= expected[1]):
    print(f"FAIL: sum={total} (axes={axes}) does not match self_assessed={self} (expected range {expected})")
    sys.exit(1)
print(f"OK: sum={total} matches {self}")
PYEOF
