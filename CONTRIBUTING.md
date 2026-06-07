# Contributing

## Workflow

1. Fork the repo.
2. Create a feature branch.
3. Make changes (and add tests, where applicable).
4. Open a pull request.
5. Get 2 approvals from reviewers in different organizations.
6. CI must pass (G1-G5 anti-contamination guarantees).
7. A maintainer merges the PR.

## PR Dual-Approval Rule

Every PR requires approval from **at least 2 reviewers** from **different
organizations**. The author and the reviewers may not all be from the same
organization.

This is enforced at the Git level via `.github/CODEOWNERS` (which lists
reviewers per path) and at the review-policy level (branch protection rules).

## Coding Style

- Shell scripts: `set -euo pipefail` at the top; shebang `#!/usr/bin/env bash`.
- YAML: 2-space indent; UTF-8 (no BOM); LF line endings.
- All scripts: add a `# SPDX-License-Identifier: Apache-2.0` comment on line 2.
- All scripts SHALL be POSIX-portable to Git Bash on Windows.

## Test Cases

To add a new test case, follow `docs/manual-fill-workflow.md`. The 7-step
SOP ensures your test case passes all validators and anti-contamination
checks.

## Anti-Contamination

See `docs/anti-contamination-checklist.md`. The framework's 6 hard
guarantees (G1–G6) are enforced by CI; any violation blocks the PR.

## Code of Conduct

Be respectful. Be technical. The framework's value is its neutrality; do
not introduce bias toward any particular tool, harness, or LLM.

## License

By contributing, you agree that your contributions will be licensed under
the Apache License 2.0.
