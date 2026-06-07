# general-agent-bench

Tool-agnostic LLM agent benchmark for general engineering tasks. This file
governs development in `D:\astara\astara-bench\` only.

## What this project is

A fillable benchmark surface with 12 task families, 4 difficulty levels,
4 scoring strategies, 22 controls across 6 layers, and 6 hard
anti-contamination guarantees (G1–G6). 50 hand-fillable test slots live
under `user-data/T001-T050/`.

## Repo structure

```
openspec/changes/      # not used here (this project does not use the keely
                       # OpenSpec workflow engine; see "OpenSpec flow" below)
schemas/                # 3 JSON Schema contracts
templates/              # 4 difficulty templates (easy/medium/hard/expert)
controls/               # 22 sanity/calibration/anti-contamination/adversarial/
                       # cross-scorer/reproducibility controls (6 layers)
scorers/                # 4 scoring strategies + blinding
validators/             # task/control/difficulty/blocklist checkers
ci/                     # G1–G5 anti-contamination guarantee scripts
runner/                 # run-bench.sh + aggregate-report.sh
manifests/              # frozen test-set manifests (SHA-256-pinned)
config/                 # blocklist.yaml, judges.yaml, blinding.yaml
user-data/              # 50 hand-fillable test case slots (currently all 50 filled)
docs/                   # manual-fill, anti-contamination, difficulty-criteria
scripts/                # gen-bulk-tests.py, regen-manifest.py
```

## Hard constraints (DO NOT VIOLATE)

1. **No tool-specific content in framework source.** The 6 anti-contamination
   guarantees (G1–G6) are enforced by `ci/check-*.sh`. Adding keely-specific,
   Godot-specific, or any other tool-specific code, names, or identifiers to
   this repo will fail the G1 / G2 / G3 / G4 / G5 checks. CI will block merge.

2. **All controls must have `framework_dependency: NONE`.** G3 checks this.
   A control that depends on a specific tool breaks the tool-agnostic claim.

3. **GT must live in a separate `answer.yaml`, NOT inside `task.yaml`.** G5
   checks this via the `gt_in_separate_file: true` field.

4. **Task IDs are 3-digit zero-padded**: `T001`–`T999`. No suffixes like
   `T019b`. If you need a paired task, renumber.

5. **Manifest SHA-256 checksums are pinned.** Any modification to
   `user-data/T*/task.yaml` or `user-data/T*/answer.yaml` invalidates
   `manifests/v1.0.0-frozen.yaml`. Re-run `python3 scripts/regen-manifest.py`
   to refresh.

## Development workflow (lightweight — not the keely OpenSpec flow)

This project does NOT use a separate OpenSpec change-management workflow.
Just edit files directly and commit:

```
1. Edit files
2. Run validators:
     bash validators/check-schema.sh user-data/T<NNN>-<slug>/
     bash validators/check-difficulty.sh user-data/T<NNN>-<slug>/
     bash validators/check-user-data-blocklist.sh
3. Run CI purity checks:
     bash ci/check-zero-tool-contamination.sh
     bash ci/check-schemas-purity.sh
     bash ci/check-controls-tool-agnostic.sh
     bash ci/check-templates-purity.sh
     bash ci/check-user-data.sh
4. Regenerate manifest if test data changed:
     python3 scripts/regen-manifest.py
5. Commit:
     git add -A
     git commit -m "feat(bench): <description>"
6. (Optional) tag release:
     git tag v0.2.0
```

## Common tasks

### Add a new test case

Follow `docs/manual-fill-workflow.md`. The 7-step SOP ensures your
test case passes all validators.

### Add a new control

Create `controls/<layer>/<ID>-<slug>.yaml` with these required fields:
`id`, `layer`, `type`, `name`, `description`, `expectation`, `failure_action`,
and `framework_dependency: NONE` (mandatory for G3). See
`controls/pipeline-sanity/PC001-print-hello.yaml` for a complete example.

### Update a score strategy

Edit `scorers/score-<strategy>.sh`. The 4 strategies are:
- `score-exact.sh` — exact string match after normalization
- `score-set.sh` — set F1
- `score-list-f1.sh` — list F1 with thresholds
- `score-expert-jury.sh` — multi-judge majority vote
- `score-blinding.sh` — wraps the above with model-name hashing

### Freeze a new test-set version

When `user-data/` reaches 50 validated tasks, run
`python3 scripts/regen-manifest.py`, update the version in the manifest
from `1.0.0-frozen` to `1.1.0-frozen` (or new minor), and tag the commit.

## Cross-platform

All scripts are POSIX-compatible bash with bash 4.0+ shebang. Tested
on Windows Git Bash; should work on Linux and macOS unchanged. Avoid
GNU-only extensions (use `awk` not `gawk`, `find -prune` not `find -maxdepth`).

## Language

Default: 中文 for questions, README, and contributor-facing docs.
Test cases and code comments: English (for tool-agnostic portability).

## License

Apache License 2.0. See [LICENSE](LICENSE).
