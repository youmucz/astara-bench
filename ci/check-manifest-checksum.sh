#!/usr/bin/env bash
# ci/check-manifest-checksum.sh — verify SHA-256 of frozen manifest entries.
# SPDX-License-Identifier: Apache-2.0
# Cross-platform: uses sha256sum (Git Bash) or shasum -a 256 (macOS).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="${1:-}"

[ -f "$MANIFEST" ] || { echo "Usage: $0 <manifest.yaml>"; exit 2; }

if command -v sha256sum >/dev/null 2>&1; then
  SHA=sha256sum
elif command -v shasum >/dev/null 2>&1; then
  SHA="shasum -a 256"
else
  echo "FAIL: neither sha256sum nor shasum available" >&2
  exit 1
fi

PY="${PYTHON:-python3}"
"$PY" - "$MANIFEST" "$ROOT" <<PYEOF
import sys, re, subprocess, os
manifest_path = sys.argv[1]
root = sys.argv[2]
text = open(manifest_path, encoding="utf-8").read()
sha_cmd = "$SHA"
failures = 0
for m in re.finditer(r"^-\s+id:\s*(\S+)\s*\n\s+task_yaml_sha256:\s*(\S+)\s*\n\s+answer_yaml_sha256:\s*(\S+)", text, re.MULTILINE):
    tid, t_sha, a_sha = m.group(1), m.group(2), m.group(3)
    task_p = os.path.join(root, "user-data", tid, "task.yaml")
    ans_p = os.path.join(root, "user-data", tid, "answer.yaml")
    for path, expected in ((task_p, t_sha), (ans_p, a_sha)):
        if not os.path.exists(path):
            print(f"FAIL: {tid} missing {path}"); failures += 1; continue
        actual = subprocess.run(sha_cmd.split() + [path], capture_output=True, text=True).stdout.split()[0]
        if actual != expected:
            print(f"FAIL: {tid} {os.path.basename(path)} sha256 mismatch (expected {expected[:8]}..., got {actual[:8]}...)")
            failures += 1
        else:
            print(f"OK: {tid} {os.path.basename(path)} sha256 matches")
if failures:
    sys.exit(1)
PYEOF
