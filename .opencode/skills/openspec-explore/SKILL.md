# Skill: openspec-explore (bench-local)

Enter explore mode for the `general-agent-bench` project. Think deeply
about a design idea, a tradeoff, or a refactor. **Do NOT write or modify
files** in this mode — only read, search, and discuss.

## Steps

1. **Read** the relevant files:
   - `AGENTS.md` — project conventions
   - `openspec/specs/general-agent-bench-*/spec.md` (6 capability specs)
   - The skill this question touches (e.g., `controls/` for control-design questions)
   - Existing examples in `user-data/T001-T050/`

2. **Discuss** with the user:
   - Ask clarifying questions
   - Surface tradeoffs and risks
   - Reference specific file:line where helpful

3. **DO NOT**:
   - Write or edit files
   - Create change proposals
   - Make commits

## When to use

- "How should I add a new scoring strategy?"
- "What if I want to add a new control layer?"
- "Should I use YAML or JSON for the new manifest?"
- "How does the 4-axis difficulty rubric interact with the 4 scorers?"

## Output

A thinking conversation. No artifacts. End with a summary of decisions
that the user could later formalize into a `proposal.md` if they want to.

## Guardrails

- Never reference or recommend using external project tools. This project
  is intentionally tool-agnostic; if the user asks "how do I use keely
  here?", explain that this project does not depend on keely.
- If the user proposes adding tool-specific content, redirect to
  `docs/USE_CASES.md` (the only file allowed to mention specific tools).
