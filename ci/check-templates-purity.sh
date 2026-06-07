#!/usr/bin/env bash
# ci/check-templates-purity.sh — Guarantee G4
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES="$ROOT/templates"
BLOCKLIST="$ROOT/config/blocklist.yaml"

[ -d "$TEMPLATES" ] || { echo "OK: templates/ not present yet"; exit 0; }
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
[ -n "$TERMS" ] || { echo "OK: blocklist is empty (G4 trivially passes)"; exit 0; }

LEAKED=$(find "$TEMPLATES" -type f -exec grep -lE "$TERMS" {} + 2>/dev/null || true)
if [ -n "$LEAKED" ]; then
  echo "FAIL: G4 violation. Blocklist terms found in templates/:"
  echo "$LEAKED"
  exit 1
fi
echo "OK: G4 passes — templates/ is pure"
