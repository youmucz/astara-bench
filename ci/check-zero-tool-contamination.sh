#!/usr/bin/env bash
# ci/check-zero-tool-contamination.sh — Guarantee G1
# SPDX-License-Identifier: Apache-2.0
# Greps framework source (excluding USE_CASES.md, CHANGELOG.md, CODEOWNERS) for blocklist terms.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BLOCKLIST="$ROOT/config/blocklist.yaml"

EXCLUDE_FILES=(
  "docs/USE_CASES.md"
  "CHANGELOG.md"
  ".github/CODEOWNERS"
  "audit-A-report.yaml"
  "audit-A-report-round1.yaml"
  "audit-A-report-round2.yaml"
)

# Only run if blocklist is populated
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
[ -n "$TERMS" ] || { echo "OK: blocklist is empty (G1 trivially passes)"; exit 0; }

EXCLUDES=()
for f in "${EXCLUDE_FILES[@]}"; do
  EXCLUDES+=("-not" "-path" "*/$f")
done

# Find text files and grep for blocklist terms
LEAKED=$(find "$ROOT" -type f \
  \( -name "*.sh" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json" -o -name "*.md" -o -name "*.py" \) \
  -not -path "*/.git/*" \
  "${EXCLUDES[@]}" \
  -exec grep -lE "$TERMS" {} + 2>/dev/null || true)

if [ -n "$LEAKED" ]; then
  echo "FAIL: G1 violation. Blocklist terms found in:"
  echo "$LEAKED"
  exit 1
fi
echo "OK: G1 passes — no blocklist terms in framework source"
