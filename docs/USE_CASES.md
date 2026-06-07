# Use Cases

> **The only document in this framework permitted to mention specific tools
> by name.** If you add or modify any tool references elsewhere, the G1
> anti-contamination check (`ci/check-zero-tool-contamination.sh`) will fail.

The framework is intentionally tool-agnostic. This file documents how to
**use** the framework to compare different harnesses, without modifying the
framework itself.

## Use Case: Harness Uplift Study

Researchers may want to measure how much a particular harness improves an
LLM's score on this benchmark. The standard 4-condition experiment:

```
Condition 0 (control):     LLM only, no harness
Condition 1 (raw agent):   LLM + minimal agent loop (e.g., LangChain)
Condition 2 (harness A):   LLM + your specific harness A
Condition 3 (harness B):   LLM + your specific harness B
```

This pattern lets you measure the uplift of any harness, including but not
limited to those in the [ETCLOVG] framework-engineering taxonomy. The
benchmark itself does not endorse, recommend, or evaluate any particular
harness — it only provides the test surface.

[ETCLOVG]: https://openreview.net/forum?id=eONq7FdiHa (Stanford / OpenReview
2026 survey: "Agent Harness Engineering: A Survey")

### Setup

1. Create an external experiment directory (NOT inside the framework repo):
   ```
   D:\experiments\harness-uplift-2026q3\
   ├── keel/                  # git clone of your harness A
   ├── bench/                 # git clone of general-agent-bench
   ├── other-harness/         # git clone of your harness B
   └── run.sh                 # your experiment driver
   ```

2. For each condition, run the benchmark:
   ```bash
   cd D:\experiments\harness-uplift-2026q3\bench
   bash runner/run-bench.sh --manifest manifests/v1.0.0.yaml --model gpt-4o
   ```

3. Compare per-condition F1 / pass@k / cost.

### Anti-Contamination Caveat

When you add tool names to `config/blocklist.yaml`, you commit those terms
to your **fork** of the framework. The original `general-agent-bench` repo
remains tool-agnostic. This separation is intentional.

## Use Case: New Test Case Authoring

If you want to add a new test case:

1. Pick a template from `templates/`.
2. Copy it to `user-data/T<NNN>-<slug>/task.yaml`.
3. Place the ground truth in `user-data/T<NNN>-<slug>/answer.yaml`.
4. Run `bash validators/check-schema.sh user-data/T<NNN>-<slug>/`.
5. Open a PR. Two reviewers from different organizations must approve.

See `docs/manual-fill-workflow.md` for the full 7-step workflow.

## Use Case: Difficulty Calibration

The 4-axis rubric (cognitive_complexity, information_availability,
gt_clarity, domain_breadth) is objective. To re-calibrate the rubric against
your model pool:

1. Run all 50 tasks against a baseline model.
2. Compute per-task pass rate.
3. Compare empirical pass rate against the rubric's predicted level:
   - `easy` → expected pass rate > 85%
   - `medium` → expected 60-85%
   - `hard` → expected 35-60%
   - `expert` → expected < 35%

If the empirical distribution does not match, file a calibration issue.

## Use Case: Cross-Scorer Reproducibility

The framework supports 4 scorers. To test cross-scorer agreement:

1. Score 50 tasks with all 4 scorers.
2. Compute pair-wise correlation of per-task scores.
3. If correlation is < 0.7 for any pair, the framework flags it via
   `controls/cross-scorer-agreement/SA001-3-judge-agree.yaml`.
