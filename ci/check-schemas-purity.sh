#!/usr/bin/env bash
# ci/check-schemas-purity.sh — Guarantee G2
# SPDX-License-Identifier: Apache-2.0
# Greps schemas/ for blocklist terms.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMAS="$ROOT/schemas"
BLOCKLIST="$ROOT/config/blocklist.yaml"

[ -d "$SCHEMAS" ] || { echo "OK: schemas/ not present yet"; exit 0; }
[ -f "$BLOCKLIST" ] || { echo "OK: no blocklist.yaml"; exit 0; }
PY="${PYTHON:-python3}"
TERMS=$("$PY" - "$BLOCKLIST" <<'PYEOF'
import sys, re
text = open(sys.argv[1], encoding="utf-8").read()
all_terms = []
for section in ("keywords","patterns"):
    m = re.search(rf"^{section}:\s*\[(.*?)\]", text, re.MULTILINE | re.DOTALL)
    if m:
        all_terms.extend(re.findall(r'"([^"]+)"', m.group(1)))
print("|".join(t for t in all_terms if t))
PYEOF
)
[ -n "$TERMS" ] || { echo "OK: blocklist is empty (G2 trivially passes)"; exit 0; }

LEAKED=$(find "$SCHEMAS" -type f -exec grep -lE "$TERMS" {} + 2>/dev/null || true)
if [ -n "$LEAKED" ]; then
  echo "FAIL: G2 violation. Blocklist terms found in schemas/:"
  echo "$LEAKED"
  exit 1
fi
echo "OK: G2 passes — schemas/ is pure"
