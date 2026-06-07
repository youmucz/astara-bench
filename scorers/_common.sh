#!/usr/bin/env bash
# scorers/_common.sh — shared helpers for all scorers
# SPDX-License-Identifier: Apache-2.0
# Sourced by other scorers. Not executable directly.
set -euo pipefail

# read_yaml_scalar <file> <key-path>
# Tiny YAML scalar reader (1-level dotted path). Returns 1 if not found.
read_yaml_scalar() {
  local file="$1" path="$2"
  local key="${path##*.}" cur="$path"
  while [[ "$cur" == *.* ]]; do
    local prefix="${cur%.*}"
    local k="${prefix##*.}"
    if ! grep -q "^[[:space:]]*${k}:" "$file" 2>/dev/null; then
      return 1
    fi
    cur="$prefix"
  done
  local k="$cur"
  python3 - "$file" "$k" <<'PYEOF' 2>/dev/null
import sys, re
text = open(sys.argv[1], encoding="utf-8").read()
key = sys.argv[2]
m = re.search(rf"^{re.escape(key)}:\s*(.+?)\s*$", text, re.MULTILINE)
if not m:
    sys.exit(1)
v = m.group(1)
if v.startswith('"') and v.endswith('"'): v = v[1:-1]
if v.startswith("'") and v.endswith("'"): v = v[1:-1]
print(v)
PYEOF
}

# normalize_str <input>
# Lowercase, trim, collapse whitespace.
normalize_str() {
  printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/[[:space:]]\+/ /g'
}

# output_json <score> <key:value...>
# Emits a single JSON object on stdout: {"score": <float>, ...}
output_json() {
  local score="$1"; shift
  printf '{"score": %s' "$score"
  while [ $# -gt 0 ]; do
    local k="$1" v="$2"
    printf ', "%s": %s' "$k" "$v"
    shift 2
  done
  printf '}\n'
}
