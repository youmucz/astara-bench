# Skill: openspec-propose (bench-local)

Create a lightweight change proposal for the `general-agent-bench` project.
This is **NOT** the keely OpenSpec change engine — this is a simple
4-artifact scaffold the project uses for non-trivial changes.

## When to use

- Adding a new scoring strategy
- Adding a new control layer
- Changing the difficulty rubric
- Updating the manifest versioning scheme
- Any change that touches 3+ files

## Steps

1. **Create** the change directory under `changes/` (note: this is the
   project's LOCAL `changes/` subdir, NOT a sibling to the framework):

   ```bash
   mkdir -p changes/<name>
   ```

   Choose a kebab-case name, e.g. `add-list-f1-soft-match`, `bump-difficulty-rubric`.

2. **Write** 3 artifacts in `changes/<name>/`:

   a. `proposal.md` — Why, What Changes, Non-Goals, Impact (~1 page)
   b. `design.md` — Context, Decisions (D1, D2, ... with Rigor: L1/L2), Tradeoffs
   c. `tasks.md` — Numbered checklist grouped by module

   Use the templates in `templates/` if helpful.

3. **Optionally** add a `notes.md` for open questions.

## Schema (per artifact)

### proposal.md

```markdown
## Why
1-2 sentences on the problem or opportunity.

## What Changes
Bullet list. Mark breaking changes with **BREAKING**.

## Non-Goals
What this change explicitly does NOT do.

## Impact
Affected code, files, tests, manifests.

## Anti-Contamination Check
Will this introduce any tool-specific content?
[ ] No (safe)
[ ] Yes (must add to config/blocklist.yaml and re-validate G1-G5)
```

### design.md

```markdown
## Context
Background, current state, constraints.

## Decisions

### D1: <Title> [Rigor: L1]
**Decision**: ...
**Rationale**: ...

### D2: <Title> [Rigor: L2]
**Decision**: ...
**Rationale**: ...
**Rejected alternatives**:
| Option | Pros | Cons | Rejected because |
```

## Risks / Trade-offs
[Risk] → Mitigation
```

### tasks.md

```markdown
- [ ] 1.1 [WL-##] [D#] Task description
- [ ] 1.2 [WL-##] [D#] Task description
- [ ] 2.1 Verify: test on Windows + Linux
- [ ] 2.2 Verify: re-run G1-G5 CI
```

## Output

3-4 files in `changes/<name>/`. When the user is satisfied, they call
`openspec-apply` to start implementing.

## Guardrails

- No tool-specific content allowed in the proposal (would fail G1).
- Mark breaking changes with **BREAKING** in proposal.md.
- Reference existing specs (e.g., `[WL-19]`) when the change extends them.
