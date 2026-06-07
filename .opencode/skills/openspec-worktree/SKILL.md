# Skill: openspec-worktree (bench-local)

Manage git worktrees for the `general-agent-bench` project.

**Note**: this project does NOT use a heavy worktree engine like keely.
This is a simple wrapper around `git worktree` for users who want to
work on multiple changes in parallel.

## Subcommands

- `create <name>` — Create a worktree at `.worktrees/<name>/` on branch
  `feature/<name>` from `main`
- `list` — List all worktrees with status
- `merge <name>` — Squash-merge `feature/<name>` into `main` and remove
  the worktree
- `remove <name>` — Remove the worktree (and the branch)
- `switch <name>` — Print the `cd` command to switch to the worktree
- `prune` — Remove orphaned worktree references

## Steps

1. **Parse** the subcommand from input.

2. **Run** the appropriate `git worktree` command:
   - `git worktree add -b feature/<name> .worktrees/<name> main`
   - `git worktree list`
   - `git merge --squash feature/<name>` (then `git worktree remove --force .worktrees/<name>`)
   - `git worktree remove --force .worktrees/<name>` and `git branch -D feature/<name>`
   - (print only)
   - `git worktree prune`

3. **Output** the result.

## When to use

- Working on multiple non-conflicting changes in parallel
- Reviewing a PR-style change before merging to main
- Experimenting with a refactor without disturbing the main branch

## When NOT to use

- For trivial single-file changes (just commit on main)
- If the change requires coordinated edits to `manifests/` (these are
  best done in serial)

## Output

A short status report. No fancy tables.

## Guardrails

- Validate name is kebab-case before creating
- Check worktree exists before merge/remove
- Use `--force` to override safety checks
- Always commit or stash changes in a worktree before removing it
