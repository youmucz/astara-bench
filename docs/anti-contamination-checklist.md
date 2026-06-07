# Anti-Contamination Checklist

Before submitting a test case, walk through this 6-item checklist. Any
"FAIL" answer blocks merge.

## C1. No tool-internal references

**Question**: Does your `task.yaml` or `answer.yaml` contain identifiers
specific to a particular tool, harness, framework, or product?

Examples of FAIL:
- Specific audit gate names (e.g., `AG-A1`, `customRule`)
- Specific file paths internal to a tool
- Specific API names from a particular harness
- Specific product names (e.g., "the FooHarness tool")
- Specific function names from a particular library

If yes, rephrase the task in **tool-neutral** terms. Use generic concepts
("the audit system", "the configuration format", "the API endpoint").

## C2. No famous CVE patterns

**Question**: Does your task reference a specific known CVE by name
(Heartbleed, Shellshock, Log4Shell, etc.) or a specific vendor's
vulnerability disclosure?

If yes, abstract the example. Use a generic placeholder:
"This code resembles a known buffer-overread vulnerability; identify the
defect." (Do not name the CVE.)

## C3. Identifier randomized

**Question**: Are all variable names, function names, file paths in your
example code plausible but not taken from a real-world project?

If your example is from a real public repo, rename identifiers. Use a
`{{placeholder}}` style or randomized names.

## C4. GT in separate file

**Question**: Is the ground truth (answer) in a separate `answer.yaml` file
in the same directory, NOT inside `task.yaml`?

If you accidentally placed the answer in `task.yaml`, move it to
`answer.yaml` immediately.

## C5. Answer not in prompt

**Question**: Does the `task.input.prompt` text contain the expected answer
or a strong hint?

If yes, rewrite the prompt to NOT include the answer. The task should
test the LLM's ability to derive the answer, not regurgitate it.

## C6. PR dual-approval

**Question**: Will your PR get approval from 2 reviewers from different
organizations?

If you are the only contributor, recruit a second organization before
opening the PR. See `CONTRIBUTING.md`.

## Automated checks

The framework's CI runs the 6 hard guarantees (G1-G6) on every PR:

```
G1: ci/check-zero-tool-contamination.sh
G2: ci/check-schemas-purity.sh
G3: ci/check-controls-tool-agnostic.sh
G4: ci/check-templates-purity.sh
G5: ci/check-user-data.sh
G6: .github/workflows/zero-contamination.yml  (orchestrates G1-G5)
```

These automated checks complement the manual checklist above.
