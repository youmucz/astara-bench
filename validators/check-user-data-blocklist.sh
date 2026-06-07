#!/usr/bin/env bash
# validators/check-user-data-blocklist.sh — Grep user-data/ against config/blocklist.yaml.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
USER_DATA="$ROOT/user-data"
BLOCKLIST="$ROOT/config/blocklist.yaml"

[ -d "$USER_DATA" ] || { echo "OK: user-data/ does not exist yet (no check needed)"; exit 0; }
[ -f "$BLOCKLIST" ] || { echo "OK: blocklist.yaml not present (default = no terms)"; exit 0; }

PY="${PYTHON:-python3}"
"$PY" - "$BLOCKLIST" "$USER_DATA" <<'PYEOF'
import sys, re, os
text = open(sys.argv[1], encoding="utf-8").read()
keywords = re.findall(r"^keywords:\s*\[(.*?)\]", text, re.MULTILINE | re.DOTALL)
patterns = re.findall(r"^patterns:\s*\[(.*?)\]", text, re.MULTILINE | re.DOTALL)
all_terms = []
if keywords:
    items = re.findall(r'"([^"]+)"', keywords[0])
    all_terms.extend(items)
if patterns:
    items = re.findall(r'"([^"]+)"', patterns[0])
    all_terms.extend(items)
all_terms = [t for t in all_terms if t]
if not all_terms:
    print("OK: blocklist is empty")
    sys.exit(0)
violations = 0
for root, dirs, files in os.walk(sys.argv[2]):
    for fn in files:
        if not (fn.endswith(".yaml") or fn.endswith(".yml")):
            continue
        p = os.path.join(root, fn)
        try:
            content = open(p, encoding="utf-8").read()
        except UnicodeDecodeError:
            continue
        for term in all_terms:
            if term in content:
                print(f"FAIL: {p} contains blocklist term '{term}'")
                violations += 1
if violations:
    print(f"FAIL: {violations} blocklist violation(s)")
    sys.exit(1)
print(f"OK: user-data/ passes blocklist check ({len(all_terms)} terms)")
PYEOF
