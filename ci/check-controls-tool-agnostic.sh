#!/usr/bin/env bash
# ci/check-controls-tool-agnostic.sh — Guarantee G3
# SPDX-License-Identifier: Apache-2.0
# Verifies that each control YAML has framework_dependency: NONE and no tool names.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTROLS="$ROOT/controls"
BLOCKLIST="$ROOT/config/blocklist.yaml"

[ -d "$CONTROLS" ] || { echo "OK: controls/ not present yet"; exit 0; }

# Always check framework_dependency: NONE (independent of blocklist state).
MISSING_DEP=0
while IFS= read -r -d '' ctrl; do
  if ! grep -qE "^[[:space:]]*framework_dependency:[[:space:]]*NONE[[:space:]]*$" "$ctrl"; then
    echo "FAIL: $ctrl missing 'framework_dependency: NONE'"
    MISSING_DEP=1
  fi
done < <(find "$CONTROLS" -type f -name "*.yaml" -print0 2>/dev/null)

# Blocklist check (skipped if blocklist is empty/unavailable).
if [ -f "$BLOCKLIST" ]; then
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
  if [ -n "$TERMS" ]; then
    LEAKED=$(find "$CONTROLS" -type f -exec grep -lE "$TERMS" {} + 2>/dev/null || true)
    if [ -n "$LEAKED" ]; then
      echo "FAIL: G3 violation. Blocklist terms found in controls/:"
      echo "$LEAKED"
      exit 1
    fi
  fi
fi

if [ "$MISSING_DEP" -ne 0 ]; then
  exit 1
fi
echo "OK: G3 passes — controls are tool-agnostic (all have framework_dependency: NONE)"
