# Skill: openspec-apply (bench-local)

Implement tasks from a change in `changes/<name>/`. This is the
**bench-local** apply flow — it does NOT use keely's worktree engine.

## When to use

The user has approved a proposal in `changes/<name>/` and wants to
implement the tasks in `tasks.md`.

## Steps

1. **Read** `changes/<name>/proposal.md`, `design.md`, and `tasks.md`.

2. **Check** that all prerequisite files exist:
   - `templates/` referenced by templates
   - `user-data/` slots if the change adds tasks
   - `manifests/` if the change freezes a new version

3. **For each task** in `tasks.md`:
   - Make the change (edit files)
   - Mark the task as complete: `- [ ]` → `- [x]`
   - Run relevant validators: `bash validators/check-*.sh`

4. **Group commits**: commit after each logical group of tasks (use
   `feat(bench):`, `fix(bench):`, `chore(bench):` prefix per AGENTS.md).

5. **Final verification** before declaring the change done:
   - [ ] All tasks in `tasks.md` are `[x]`
   - [ ] `bash ci/check-*.sh` all pass (G1-G5)
   - [ ] `python3 scripts/regen-manifest.py` if test data changed
   - [ ] `git log --oneline` shows clean commits

## Output

Implementation done. Show the user:
- Which tasks completed
- Which validators passed
- What's left (if any)

Then suggest `openspec-archive` to formalize completion.

## Anti-contamination reminder

Before committing, run `bash ci/check-zero-tool-contamination.sh` to
ensure no tool-specific content leaked in. If it fails, the G1 guarantee
is broken and the change CANNOT be merged.

## Guardrails

- Do not skip the validator run before commit.
- Do not commit broken G1-G5 checks.
- Do not modify `manifests/v1.0.0-frozen.yaml` directly — always regenerate
  via `scripts/regen-manifest.py`.
