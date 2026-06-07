#!/usr/bin/env bash
# runner/aggregate-report.sh — summarize results.jsonl into Markdown.
# SPDX-License-Identifier: Apache-2.0
# Usage: bash runner/aggregate-report.sh <results-dir>
set -euo pipefail
RESULTS_DIR="${1:-}"
[ -d "$RESULTS_DIR" ] || { echo "Usage: $0 <results-dir>" >&2; exit 2; }
RESULTS_FILE="$RESULTS_DIR/results.jsonl"
[ -f "$RESULTS_FILE" ] || { echo "FAIL: no results.jsonl in $RESULTS_DIR" >&2; exit 1; }

REPORT="$RESULTS_DIR/report.md"
{
  echo "# Benchmark Report"
  echo
  echo "- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Results file: \`$RESULTS_FILE\`"
  echo
  echo "## Summary"
  echo
  python3 - "$RESULTS_FILE" <<'PYEOF'
import sys, json, collections
counts = collections.Counter()
total = 0
for line in open(sys.argv[1], encoding="utf-8"):
    line = line.strip()
    if not line: continue
    try:
        d = json.loads(line)
    except json.JSONDecodeError:
        continue
    total += 1
    if "control" in d:
        counts[("control", d.get("layer","?"))] += 1
    elif "task_id" in d:
        counts[("task", d.get("task_id","?"))] += 1
print(f"- Total records: {total}")
for (kind, name), n in sorted(counts.items()):
    print(f"- {kind} `{name}`: {n} records")
PYEOF
  echo
  echo "## Per-task detail"
  echo
  echo "| Task | Run | Model | Score | Cost USD | Latency (s) |"
  echo "|------|-----|-------|-------|----------|-------------|"
  grep -E '"task_id":' "$RESULTS_FILE" | python3 -c "
import sys, json
for line in sys.stdin:
    d = json.loads(line)
    print(f\"| {d.get('task_id','')} | {d.get('run','')} | {d.get('model','')} | {d.get('score','null')} | {d.get('cost_usd',0)} | {d.get('latency_sec',0)} |\")
"
} > "$REPORT"

echo "Report written: $REPORT"
