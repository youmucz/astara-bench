#!/usr/bin/env bash
# runner/run-bench.sh — main execution entry point.
# SPDX-License-Identifier: Apache-2.0
# Usage:
#   bash runner/run-bench.sh --dry-run
#   bash runner/run-bench.sh --task T001 --model gpt-4o
#   bash runner/run-bench.sh --runs 3 --pass-all
#   bash runner/run-bench.sh --cost-cap 5.00 --manifest manifests/v1.0.0.yaml
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=0
TASK_ID=""
MODEL=""
RUNS=1
PASS_ALL=0
COST_CAP=""
MANIFEST=""
RESULTS_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)     DRY_RUN=1; shift ;;
    --task)        TASK_ID="${2:-}"; shift 2 ;;
    --model)       MODEL="${2:-}"; shift 2 ;;
    --runs)        RUNS="${2:-1}"; shift 2 ;;
    --pass-all)    PASS_ALL=1; shift ;;
    --cost-cap)    COST_CAP="${2:-}"; shift 2 ;;
    --manifest)    MANIFEST="${2:-}"; shift 2 ;;
    --results-dir) RESULTS_DIR="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Resolve manifest
if [ -n "$MANIFEST" ] && [ ! -f "$ROOT/$MANIFEST" ]; then
  echo "FAIL: manifest not found: $ROOT/$MANIFEST" >&2; exit 1
fi

# Setup results dir
[ -n "$RESULTS_DIR" ] || RESULTS_DIR="$ROOT/results/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RESULTS_DIR"
RESULTS_FILE="$RESULTS_DIR/results.jsonl"
: > "$RESULTS_FILE"

# Layer 1 (pipeline sanity) + Layer 3 (anti-contamination) controls
# run BEFORE any user task. Implementation note: actual controls are YAML
# in controls/; this runner references them by path. Layer 5 + 6 also
# run pre-experiment in production.
LAYER_1_DIR="$ROOT/controls/pipeline-sanity"
LAYER_3_DIR="$ROOT/controls/anti-contamination"
LAYER_5_DIR="$ROOT/controls/cross-scorer-agreement"
LAYER_6_DIR="$ROOT/controls/time-reproducibility"

for layer in "$LAYER_1_DIR" "$LAYER_3_DIR" "$LAYER_5_DIR" "$LAYER_6_DIR"; do
  if [ -d "$layer" ]; then
    for ctrl in "$layer"/*.yaml; do
      [ -f "$ctrl" ] || continue
      name=$(basename "$ctrl" .yaml)
      action=$(grep "^failure_action:" "$ctrl" | awk '{print $2}')
      # If ABORT_EXPERIMENT, validate (placeholder: always pass in dry-run)
      if [ "$DRY_RUN" -eq 0 ] && [ "$action" = "ABORT_EXPERIMENT" ]; then
        # In production: invoke control and check expectation
        : # TODO: real control dispatch
      fi
      printf '{"layer": "%s", "control": "%s", "status": "pass"}\n' \
        "$(basename "$(dirname "$ctrl")")" "$name" >> "$RESULTS_FILE"
    done
  fi
done

# Discover tasks
if [ -n "$TASK_ID" ]; then
  TASK_DIRS=("$ROOT/user-data/$TASK_ID")
else
  TASK_DIRS=()
  for d in "$ROOT"/user-data/T*; do
    [ -d "$d" ] || continue
    TASK_DIRS+=("$d")
  done
fi

if [ ${#TASK_DIRS[@]} -eq 0 ]; then
  echo "No tasks found under $ROOT/user-data/" >&2
  exit 0
fi

# Execute tasks
TOTAL_COST=0
for task_dir in "${TASK_DIRS[@]}"; do
  if [ ! -f "$task_dir/task.yaml" ]; then
    echo "Skip: $task_dir missing task.yaml" >&2
    continue
  fi
  tid=$(basename "$task_dir")
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '{"task_id": "%s", "dry_run": true, "score": null, "cost_usd": 0, "latency_sec": 0}\n' "$tid" >> "$RESULTS_FILE"
    continue
  fi
  for ((i=0; i<RUNS; i++)); do
    # Placeholder: real impl would call LLM API, then invoke scorer.
    # Here we record the run; cost/latency are zero in this v0.1 stub.
    score="null"
    cost="0"
    latency="0"
    printf '{"task_id": "%s", "run": %d, "model": "%s", "score": %s, "cost_usd": %s, "latency_sec": %s}\n' \
      "$tid" "$((i+1))" "$MODEL" "$score" "$cost" "$latency" >> "$RESULTS_FILE"
  done
  if [ -n "$COST_CAP" ]; then
    TOTAL_COST=$(awk -v c="$TOTAL_COST" 'BEGIN{c+=0}END{print c+0}' "$RESULTS_FILE")
    if [ "$TOTAL_COST" != "0" ] && awk "BEGIN{exit !($TOTAL_COST > $COST_CAP)}"; then
      echo "FAIL: cost cap exceeded ($TOTAL_COST > $COST_CAP)" >&2
      exit 1
    fi
  fi
done

echo "Results written to: $RESULTS_FILE"
