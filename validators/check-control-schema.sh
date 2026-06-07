#!/usr/bin/env bash
# validators/check-control-schema.sh — Validate a control YAML file.
# SPDX-License-Identifier: Apache-2.0
# Required fields: id, layer, type, name, description, expectation, failure_action
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CTRL="${1:-}"
[ -f "$CTRL" ] || { echo "Usage: $0 <control.yaml>" >&2; exit 2; }

PY="${PYTHON:-python3}"
"$PY" - "$CTRL" <<'PYEOF'
import sys, re
text = open(sys.argv[1], encoding="utf-8").read()
required = ["id:", "layer:", "type:", "name:", "description:", "expectation:", "failure_action:"]
missing = [r for r in required if r not in text]
if missing:
    print(f"FAIL: missing fields: {missing}")
    sys.exit(1)
valid_failure = {"ABORT_EXPERIMENT", "WARN", "LOG_ONLY"}
m = re.search(r"^failure_action:\s*(\S+)", text, re.MULTILINE)
if m and m.group(1) not in valid_failure:
    print(f"FAIL: failure_action must be one of {valid_failure}, got {m.group(1)}")
    sys.exit(1)
print("OK")
PYEOF
