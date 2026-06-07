# Skill: openspec-drift-check (bench-local)

Detect drift between `user-data/`, `templates/`, `docs/`, and the
canonical manifest. This is the **bench-local** drift check — it does
NOT use keely's drift-check subagent (which is a separate, more thorough
process tied to keely's wiki/ infrastructure).

## When to use

- Before archiving a change
- After a batch of test-case additions
- Periodically (e.g., weekly) to catch silent inconsistencies

## What it checks

1. **Schema compliance**: every `user-data/T*/task.yaml` validates against
   `schemas/task.schema.json`. (Run `bash validators/check-schema.sh`.)

2. **Difficulty axis sum**: every task's 4-axis sum matches its
   `self_assessed` level. (Run `bash validators/check-difficulty.sh`.)

3. **Manifest integrity**: `manifests/v1.0.0-frozen.yaml` SHA-256 checksums
   match actual file contents. (Run
   `bash ci/check-manifest-checksum.sh manifests/v1.0.0-frozen.yaml`.)

4. **Blocklist**: `user-data/` passes `config/blocklist.yaml` check.
   (Run `bash validators/check-user-data-blocklist.sh`.)

5. **Distribution**: tasks are distributed across all 12 families and the
   4 difficulty levels in the target ratios. (Manual check; see
   `docs/difficulty-criteria.md` for the target distribution.)

## Steps

1. **Run** the 4 automated checks (1-4 above).

2. **Manual check** the family × difficulty distribution:
   ```bash
   python3 -c "
   import os, re
   families = {}
   for d in os.listdir('user-data'):
       t = open(f'user-data/{d}/task.yaml').read()
       f = re.search(r'family:\s*(\S+)', t).group(1)
       lvl = re.search(r'self_assessed:\s*(\S+)', t).group(1)
       families.setdefault(f, {}).setdefault(lvl, 0)
       families[f][lvl] += 1
   for f, lvls in sorted(families.items()):
       print(f, lvls)
   "
   ```

3. **Report** all findings. Anything failing is blocking for archive.

## Output

A drift report listing all 5 categories with pass/warning/fail status
and specific file:line evidence for any issue.

## When to update the manifest

If you change any `user-data/T*/task.yaml` or `answer.yaml`, you MUST
regenerate the manifest:
```bash
python3 scripts/regen-manifest.py
git add manifests/
git commit -m "chore(bench): regenerate manifest after drift fix"
```

## Guardrails

- Never silently fix a drift — the user must approve the change.
- The frozen manifest's SHA-256 is the source of truth; if reality
  diverges, either the manifest or the file is wrong.
- If G1 (anti-contamination) drift is detected, the change MUST be
  reverted or the offending content removed.
