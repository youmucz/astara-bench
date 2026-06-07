# Skill: openspec-audit (bench-local)

Run anti-contamination quality audits on a change or the whole project.
This is the **bench-local** audit — it does NOT spawn external subagents
(keely's deep audit subagent system is NOT used here).

## When to use

- Before merging a change
- After a batch of test-case additions
- Periodically as a self-check
- Whenever you suspect a contamination regression

## Audit dimensions (6 + 2 = 8)

### 1. AG-A1 Scope Alignment
For each `changes/<name>/`, the proposal's "What Changes" list matches
the file additions in the change.

### 2. AG-A2 Spec Traceability
Every spec requirement `[WL-##]` referenced in `tasks.md` exists in the
referenced `specs/general-agent-bench-*/spec.md`.

### 3. AG-A3 Artifact Completeness
For each change, `proposal.md`, `design.md`, and `tasks.md` exist and are
non-empty. Each task in `tasks.md` has either `[x]` or `[ ]`.

### 4. AG-A4 Decision Rigor (L1/L2)
Each decision in `design.md` has a rigor level. L2+ decisions have
rejected alternatives.

### 5. AG-A5 Dependency Compliance
Tasks reference specs/decisions that exist.

### 6. AG-A6 Breaking Change Declaration
Breaking changes are marked with `**BREAKING**` in `proposal.md`.

### 7. AG-A7 Cross-platform Coverage
Shell-touching tasks have Windows Git Bash scenarios mentioned in
verification tasks.

### 8. Anti-Contamination (bench-specific)
- No tool-specific content in `schemas/`, `templates/`, `controls/`
- All controls have `framework_dependency: NONE`
- `user-data/` passes `config/blocklist.yaml` check
- Only `docs/USE_CASES.md` mentions specific tools

## Steps

1. **Run the automated checks**:
   ```bash
   bash ci/check-zero-tool-contamination.sh    # G1
   bash ci/check-schemas-purity.sh             # G2
   bash ci/check-controls-tool-agnostic.sh     # G3
   bash ci/check-templates-purity.sh           # G4
   bash ci/check-user-data.sh                  # G5
   ```

2. **Read** the change artifacts and walk through dimensions 1-7.

3. **For dimension 8** (anti-contamination), run the manual checklist in
   `docs/anti-contamination-checklist.md`.

4. **Report** findings:
   - `pass` for each dimension
   - `warning` for soft issues
   - `fail` for blocking issues

5. **If any dimension fails**:
   - Block the change from being archived/merged
   - Document the failing items in the report
   - Suggest concrete fixes

## Output

A report (in chat, not a file) with:
- Per-dimension pass/warning/fail
- Concrete evidence (file:line)
- Suggested fixes for any non-pass

## Guardrails

- Always run the 5 CI checks first; don't audit manually what can be checked.
- If G1 fails, ALL other dimensions are auto-warning (the change is contaminated).
- Don't auto-fix findings; report and let the user decide.
