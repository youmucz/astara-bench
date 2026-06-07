# Governance

## Independence Guarantee

`general-agent-bench` is intentionally **tool-agnostic**, **harness-agnostic**,
and **LLM-agnostic**. The benchmark explicitly does NOT:

1. **Endorse or rank any specific tool, harness, or product.** Test cases may
   measure the capability of any LLM agent, but the framework itself does not
   recommend, prefer, or rank any particular tool.
2. **Use any tool's internal data as a test source.** All 50 test slots are
   hand-filled or synthetic. No archived audit reports, internal logs, or
   tool-specific scenarios are imported.
3. **Favor any workflow style.** The 6 anti-contamination guarantees (G1–G6)
   apply uniformly to all tools.
4. **Rank any LLM.** Pass@k and F1 are reported per-task; the framework
   publishes per-model results, not leaderboards.

## Adding Tool-Specific Content

If a contributor wants to add a test case, control, or documentation that
references a specific tool (e.g., a particular harness), they must:

1. Add the tool's identifiers to `config/blocklist.yaml` (so the tool's own
   audit data cannot leak into test cases).
2. Justify in the PR why tool-specific content is needed.
3. Get approval from a maintainer whose organization is **not** the tool's
   author organization.
4. Document the rationale in `docs/USE_CASES.md`.

By default, the framework expects ALL test content to be **tool-independent**.

## PR Review Requirements

- All PRs require approval from at least 2 reviewers.
- The 2 reviewers MUST be from different organizations.
- Bot/CI approvals do not count toward the 2-reviewer requirement.
- CODEOWNERS (`.github/CODEOWNERS`) enforces these rules at the Git level.

## Test Set Freezing

Once a test set is published in `manifests/v1.0.0.yaml`, that set is
**frozen**. Subsequent changes are published as `v1.1.0`, `v2.0.0`, etc.
The frozen set includes a SHA-256 checksum; any modification to a task
invalidates the checksum and the manifest is rejected by
`ci/check-manifest-checksum.sh`.

## Anti-Contamination Guarantees

The framework enforces 6 hard guarantees via CI:

- **G1** Zero tool-specific strings in framework source (excluding
  `docs/USE_CASES.md`, `CHANGELOG.md`, `.github/CODEOWNERS`).
- **G2** Zero tool-specific terms in `schemas/`.
- **G3** All controls have `framework_dependency: NONE` and no tool names.
- **G4** `templates/` is pure (no tool names).
- **G5** `user-data/` passes the user-maintained blocklist check.
- **G6** CI runs all 5 checks in sequence on every PR; any failure blocks merge.

## License

Apache License 2.0.
