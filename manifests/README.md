# Manifests

This directory contains frozen test-set manifests. Each manifest lists the
tasks included in a benchmark version, with SHA-256 checksums of each
`task.yaml` and `answer.yaml` to detect any tampering.

## Versioning Convention

| Suffix        | Meaning                                            |
|---------------|----------------------------------------------------|
| `-draft`      | Under 50 tasks; not yet frozen. Running but not authoritative. |
| `-frozen`     | Exactly 50 tasks. Authoritative; SHA-256-pinned.    |
| `-stable`     | Has passed review and is recommended for use.       |
| `-archived`   | Superseded; preserved for reproducibility of historical results. |

Do NOT use `v1.0.0` (without suffix) until the test set has exactly 50
tasks and is frozen. `v1.0.0-draft` is OK; `v1.0.0` is reserved.

## Current manifests

- `v0.1.0-draft.yaml` — initial bootstrap, 5 example tasks. Not yet frozen.
  See `runner/run-bench.sh --manifest manifests/v0.1.0-draft.yaml` to run.

## Adding a new task

1. Follow `docs/manual-fill-workflow.md` to add the task under `user-data/`.
2. Update the active manifest (`manifests/vX.Y.Z-<suffix>.yaml`) by:
   - adding the new task's ID and SHA-256 checksums
   - incrementing `current_count`
3. Re-run `bash ci/check-manifest-checksum.sh manifests/vX.Y.Z-<suffix>.yaml`
   to verify all checksums match.

## Freezing a manifest

When `current_count` reaches 50:

1. Remove the `-draft` suffix from the manifest filename.
2. Update `frozen: true`.
3. Compute `manifest_sha256` of the manifest file itself; commit it.
4. Tag the git commit with the version, e.g., `git tag v0.1.0`.
5. Announce in `CHANGELOG.md`.

After freeze, the SHA-256s in the manifest MUST match the actual file
contents. Any modification to a `task.yaml` or `answer.yaml` invalidates
the manifest and is detected by `ci/check-manifest-checksum.sh`.
