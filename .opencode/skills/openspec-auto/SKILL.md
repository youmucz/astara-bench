# Skill: openspec-auto (bench-local)

Run the full local OpenSpec-style workflow end-to-end for a non-trivial
change. Combines: explore → propose → apply → audit → drift-check → archive.

This is the **bench-local** equivalent of keely's `openspec-auto`, but
without spawning external subagents. All steps happen inline.

## When to use

The user says "implement X end-to-end" or "do everything for this
change" — when they want one command to drive the full workflow.

## Steps

1. **Explore** (`openspec-explore`): clarify the user's intent
2. **Propose** (`openspec-propose`): create `changes/<name>/` with 3 artifacts
3. **Apply** (`openspec-apply`): implement tasks one by one
4. **Audit** (`openspec-audit`): run anti-contamination checks
5. **Drift-check** (`openspec-drift-check`): verify manifest integrity
6. **Archive** (`openspec-archive`): move `changes/<name>/` to archive

## Pause points

The skill SHALL pause and ask the user for confirmation at:
- Before any destructive action (file deletion, manifest rewrite)
- After proposal, before apply
- After apply, before audit
- After audit, before archive
- Whenever a CI check fails

## Output

A summary of what was done at each stage. Format:
```
Stage 1 (Explore):   [summary]
Stage 2 (Propose):   [summary, files created]
Stage 3 (Apply):     [summary, tasks completed]
Stage 4 (Audit):     [8-dimension pass/fail report]
Stage 5 (Drift):     [5-check pass/fail report]
Stage 6 (Archive):   [archive location, commit hash]
```

## Guardrails

- Always run the full 5 CI checks before declaring complete.
- If any check fails, the skill pauses and reports; it does NOT
  auto-fix and proceed.
- For a non-trivial change (touches 5+ files), the user must approve
  at every stage. For a trivial change (1-2 files), the user can
  pre-approve the whole flow.
- This skill does NOT spawn external subagents (no keely connection).

## See also

- `openspec-explore` — start here for thinking
- `openspec-propose` — start here for writing artifacts
- `openspec-apply` — start here for implementing
- `openspec-archive` — finish here
