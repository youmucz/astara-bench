# Skill: openspec-archive (bench-local)

Mark a change as completed and move it from `changes/<name>/` to
`changes/archive/`. This is the **bench-local** archive — no keely
OpenSpec engine required.

## When to use

All tasks in `changes/<name>/tasks.md` are `[x]`, all validators pass,
and the change is ready to be marked as complete.

## Steps

1. **Verify** the change is complete:
   - [ ] All tasks in `tasks.md` are checked
   - [ ] `bash ci/check-*.sh` all pass
   - [ ] All changes committed to git

2. **Generate date** in YYYY-MM-DD format:
   ```bash
   date +%Y-%m-%d
   ```

3. **Move** the change directory:
   ```bash
   mv changes/<name> changes/archive/<DATE>-<name>
   ```

4. **If the change updated a manifest**:
   - Edit `manifests/README.md` to record the new version
   - Commit the move + README update together:
     ```
     chore(archive): <name> -> <DATE>
     ```

5. **Optional: tag** a release if the change adds user-visible capability:
   ```bash
   git tag v0.2.0
   ```

## Archive naming convention

| Suffix        | Meaning                                            |
|---------------|----------------------------------------------------|
| `-draft`      | Under 50 tasks; not yet frozen.                   |
| `-frozen`     | Exactly 50 tasks. Authoritative; SHA-256-pinned.  |
| `-stable`     | Passed review; recommended for use.               |
| `-archived`   | Superseded; preserved for reproducibility.        |

The current `v1.0.0-frozen` manifest is the active frozen set. Do not
use `v1.0.0` (without suffix) until you've completed a full review cycle.

## Output

Confirmation that the change is archived. Show the user:
- Archive location
- Commit hash
- Whether a tag was created

## Guardrails

- Never archive a change with incomplete tasks.
- Never archive without re-running G1-G5.
- If the change includes a manifest update, verify the SHA-256 pin still
  matches the actual file contents via `bash ci/check-manifest-checksum.sh`.
