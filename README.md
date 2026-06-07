# general-agent-bench

Tool-agnostic benchmark for evaluating LLM agents on general engineering tasks.

## What it is

A fillable benchmark surface that:

- defines 12 general task families (code-review, bug-detection, design-evaluation, …)
- has 4 difficulty levels (easy / medium / hard / expert) graded on a 4-axis rubric
- provides 4 scoring strategies (exact / set / list-F1 / expert-jury) with blinding
- ships 22 controls across 6 layers for pipeline sanity, difficulty calibration, anti-contamination, adversarial robustness, cross-scorer agreement, and time reproducibility
- enforces 6 hard anti-contamination guarantees (G1–G6) via CI

## What it is NOT

- not a tool, harness, or framework
- not coupled to any specific LLM, harness, or domain
- not pre-populated with test data — the 50 test slots are filled by users
- not a hosted leaderboard

## Quick start

```bash
# Pick a template
cp templates/template-easy.yaml user-data/T001-my-task/task.yaml
# Edit the placeholders
# Place the ground truth in user-data/T001-my-task/answer.yaml

# Validate the new task
bash validators/check-schema.sh user-data/T001-my-task/

# Dry-run the benchmark
bash runner/run-bench.sh --dry-run

# Run on a specific task with a model
bash runner/run-bench.sh --task T001 --model gpt-4o
```

## Repository layout

```
schemas/      # JSON schema contracts (task, scoring, difficulty-rubric)
templates/    # 4 difficulty templates (easy/medium/hard/expert)
controls/     # 22 sanity/calibration/anti-contamination/adversarial/cross-scorer/reproducibility controls
scorers/      # 4 scoring strategies + blinding helper
validators/   # task/control/difficulty/blocklist checkers
ci/           # G1-G6 anti-contamination guarantee scripts
runner/       # run-bench.sh + aggregate-report.sh
manifests/    # frozen test-set manifests (SHA-256-pinned)
config/       # blocklist.yaml, judges.yaml, blinding.yaml
user-data/    # 50 hand-fillable test case slots (currently 5 examples)
docs/         # manual-fill workflow, anti-contamination checklist, etc.
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs require 2 reviewers from
different organizations.

## Governance

See [GOVERNANCE.md](GOVERNANCE.md). The framework is intentionally
tool-agnostic, harness-agnostic, and LLM-agnostic. Only `docs/USE_CASES.md`
is permitted to mention specific tools by name.

## License

Apache License 2.0. See [LICENSE](LICENSE).
