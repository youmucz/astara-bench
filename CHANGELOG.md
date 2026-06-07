# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- `AGENTS.md` 鈥?bench-local project guidelines for opencode AI assistant
- `.opencode/config.json` 鈥?opencode project config (8 skills, language hints, lint rules)
- `.opencode/skills/openspec-{explore,propose,apply,archive,audit,worktree,drift-check,auto}/SKILL.md` 鈥?8 bench-local skill stubs
  - Note: these are LOCAL to this project, NOT imports from any external tool
  - All 8 skills are independent of keely
- `.gitignore` updated to exclude `changes/` and `changes/archive/` (local OpenSpec scaffolding)

### Notes
- The 8 opencode skills here are independent implementations; they do not
  depend on or reference keely's skills in any way.
- This project can be developed with opencode without any external tool
  dependency. The AGENTS.md and config.json are the only project-level files
  opencode reads.

## [1.0.0-frozen] - 2026-06-09

### Added
- Filled all 50 test-data slots (`user-data/T001-T050`) across 12 task families
- Distribution: 12 easy / 20 medium / 14 hard / 4 expert (matches target)
- Family coverage: 12/12 families represented
- `scripts/gen-bulk-tests.py` 鈥?generator script for 45 bulk test cases
- `scripts/regen-manifest.py` 鈥?manifest regen with SHA-256 checksums
- `manifests/v1.0.0-frozen.yaml` 鈥?first frozen manifest (50 tasks, SHA-pinned)

### Changed
- `manifests/v0.1.0-draft.yaml` retained for historical traceability (not authoritative)

### Notes
- 4 expert tasks (T047-T050) use the `expert_jury` scoring strategy and require
  3 LLM judges configured in `config/judges.yaml`.
- Frozen set means: any modification to `user-data/T*/task.yaml` or
  `answer.yaml` invalidates the manifest and is detected by
  `ci/check-manifest-checksum.sh`.

## [0.1.0-draft] - 2026-06-09

### Added
- Initial bootstrap of the general-agent-bench framework.
- 11 top-level directories: schemas/, templates/, controls/, scorers/, validators/, user-data/, config/, docs/, ci/, runner/, manifests/
- 3 JSON schemas: task.schema.json, scoring.schema.json, difficulty-rubric.schema.json
- 4 difficulty templates: easy / medium / hard / expert
- 22 controls across 6 layers (7+5+3+3+2+2)
- 4 scoring strategies: score-exact, score-set, score-list-f1, score-expert-jury
- 4 validators: check-schema, check-control-schema, check-difficulty, check-user-data-blocklist
- 6 CI guarantee scripts: G1 (no-tool-contamination), G2 (schemas-purity), G3 (controls-tool-agnostic), G4 (templates-purity), G5 (user-data-blocklist), G6 (workflow)
- Runner: run-bench.sh + aggregate-report.sh
- 5 example user-data tasks: T001, T002, T015, T020, T040
- Documentation: README, GOVERNANCE, USE_CASES, manual-fill-workflow, anti-contamination-checklist, difficulty-criteria
- Apache 2.0 license
- CI workflow: .github/workflows/zero-contamination.yml
- 50 test-data slots; 5 filled (draft state)

### Known limitations
- No hosted leaderboard.
- LLM-judge scorer (expert-jury) is a stub; real LLM calls require user
  to provide API keys in `config/judges.yaml`.
- Cross-platform verification (group 14) is asserted but not yet tested on
  a Windows machine by the maintainer.

## [1.0.0-frozen] - 2026-06-09

### Added
- Filled all 50 test-data slots (user-data/T001-T050) across 12 task families
- Distribution: 12 easy / 20 medium / 14 hard / 4 expert (matches target)
- Family coverage: 12/12 families represented
- scripts/gen-bulk-tests.py — generator script for 45 bulk test cases
- scripts/regen-manifest.py — manifest regen with SHA-256 checksums
- manifests/v1.0.0-frozen.yaml — first frozen manifest (50 tasks, SHA-pinned)

### Changed
- manifests/v0.1.0-draft.yaml retained for historical traceability (not authoritative)

### Notes
- 4 expert tasks (T047-T050) use the expert_jury scoring strategy and require
  3 LLM judges configured in config/judges.yaml.
- Frozen set means: any modification to user-data/T*/task.yaml or
  nswer.yaml invalidates the manifest and is detected by
  ci/check-manifest-checksum.sh.