# Manual Fill Workflow — 7 Steps

This is the SOP for adding a new test case to `user-data/`.

## Step 1: Pick a template

Choose the difficulty level that matches your task's complexity:

```bash
ls templates/
# template-easy.yaml       # sum 4-6
# template-medium.yaml     # sum 7-10
# template-hard.yaml       # sum 11-13
# template-expert.yaml     # sum 14-16
```

## Step 2: Copy the template

```bash
cp templates/template-medium.yaml user-data/T015-my-task/task.yaml
```

## Step 3: Fill in fields

Open `task.yaml` and replace the placeholders:

- `task.id` → next sequential ID (T015, T016, ...)
- `task.difficulty.axis_scores` → scores 1-4 on each of 4 axes
- `task.difficulty.self_assessed` → must match sum 4-6/7-10/11-13/14-16
- `task.family` → one of 12 (code-review, bug-detection, ...)
- `task.input.prompt` → your actual prompt
- `task.evaluation.pass_criteria` → one of 4 types

## Step 4: Write `answer.yaml`

Create a sibling file with the ground truth:

```bash
vim user-data/T015-my-task/answer.yaml
```

Example:
```yaml
answer:
  task_id: T015
  ground_truth:
    type: set
    expected_items: ["no zero check", "division by zero"]
  rationale: |
    The function has no input validation.
```

The `answer.yaml` file MUST be in a separate file from `task.yaml`
to prevent GT leakage. The `gt_in_separate_file: true` field in
`task.yaml` records this.

## Step 5: Run validators

```bash
bash validators/check-schema.sh user-data/T015-my-task/
bash validators/check-difficulty.sh user-data/T015-my-task/
bash validators/check-user-data-blocklist.sh
```

If any validator fails, fix the task before submitting.

## Step 6: Dry-run the benchmark

```bash
bash runner/run-bench.sh --task T015 --dry-run
```

This confirms the runner can find and parse your task.

## Step 7: Open a PR

```bash
git checkout -b add-task-T015-my-task
git add user-data/T015-my-task/
git commit -m "feat(bench): add T015 my-task (medium, code-review)"
git push origin add-task-T015-my-task
# Open PR via GitHub UI
```

The PR review requires approval from 2 reviewers from different
organizations. See `CONTRIBUTING.md`.

## Common pitfalls

- **Forgetting `answer.yaml`**: The runner will skip tasks without an
  answer file.
- **GT in the prompt**: If the answer text appears in `task.input.prompt`,
  set `contamination.answer_not_in_prompt: false` (which is invalid) or
  rephrase. The contamination checker will reject it.
- **Wrong family**: The 12 family names are case-sensitive. `code-Review`
  is invalid; use `code-review`.
- **Axis sum mismatch**: If `axis_scores` sum to 9 but `self_assessed` is
  `hard` (which expects 11-13), the difficulty validator will warn.
