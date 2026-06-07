#!/usr/bin/env bash
# validators/check-schema.sh — Validate a task.yaml against schemas/task.schema.json
# SPDX-License-Identifier: Apache-2.0
# POSIX-compatible; uses python3 for JSON Schema validation (jq/yq do not support draft-07).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASK_DIR="${1:-}"
[ -d "$TASK_DIR" ] || { echo "Usage: $0 <task-dir>" >&2; exit 2; }

TASK_YAML="$TASK_DIR/task.yaml"
ANSWER_YAML="$TASK_DIR/answer.yaml"
[ -f "$TASK_YAML" ] || { echo "FAIL: missing $TASK_YAML" >&2; exit 1; }
[ -f "$ANSWER_YAML" ] || { echo "FAIL: missing $ANSWER_YAML (GT must be in separate file)" >&2; exit 1; }

PY="${PYTHON:-python3}"
command -v "$PY" >/dev/null 2>&1 || { echo "FAIL: python3 required for JSON Schema validation" >&2; exit 1; }
"$PY" -c "import jsonschema" 2>/dev/null || {
  echo "FAIL: python 'jsonschema' module required. Install via: pip install jsonschema" >&2
  exit 1
}

TMP="$(mktemp -t gabschema.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

# Convert YAML to JSON using a minimal embedded parser (no external dep beyond Python).
# Supports: scalar strings, integers, booleans, null, lists, and one level of nested maps.
"$PY" - "$TASK_YAML" >"$TMP" <<'PYEOF'
import sys, json, re
text = open(sys.argv[1], encoding="utf-8").read()
def parse_scalar(v):
    v = v.strip()
    if v in ("true","True","yes"): return True
    if v in ("false","False","no"): return False
    if v in ("null","Null","~",""): return None
    if re.match(r"^-?\d+$", v): return int(v)
    if re.match(r"^-?\d+\.\d+$", v): return float(v)
    if v.startswith('"') and v.endswith('"'): return v[1:-1]
    if v.startswith("'") and v.endswith("'"): return v[1:-1]
    return v
def parse(s, indent=0):
    lines = s.splitlines()
    i = 0
    out = {}
    stack = [(-1, out)]
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.strip().startswith("#"):
            i += 1; continue
        m = re.match(r"^(\s*)(- )?(.*?):\s*(.*)$", line)
        if not m:
            i += 1; continue
        sp, islist, key, val = m.group(1), bool(m.group(2)), m.group(3), m.group(4)
        lvl = len(sp)
        while stack and stack[-1][0] >= lvl:
            stack.pop()
        parent = stack[-1][1] if stack else out
        if islist:
            if isinstance(parent, list):
                if val:
                    parent.append(parse_scalar(val))
                else:
                    new = {}
                    parent.append(new)
                    stack.append((lvl+2, new))
            i += 1; continue
        if val == "" or val is None:
            new = {}
            parent[key] = new
            stack.append((lvl+2, new))
        else:
            parent[key] = parse_scalar(val)
        i += 1
    return out
print(json.dumps(parse(text)))
PYEOF

SCHEMA="$SCRIPT_DIR/../schemas/task.schema.json"
[ -f "$SCHEMA" ] || { echo "FAIL: schema not found at $SCHEMA" >&2; exit 1; }

"$PY" - "$TMP" "$SCHEMA" <<'PYEOF'
import sys, json
data = json.load(open(sys.argv[1]))
schema = json.load(open(sys.argv[2]))
try:
    import jsonschema
    jsonschema.validate(data, schema)
    print("OK")
except jsonschema.ValidationError as e:
    print(f"FAIL: {e.message} at {list(e.absolute_path)}")
    sys.exit(1)
PYEOF
