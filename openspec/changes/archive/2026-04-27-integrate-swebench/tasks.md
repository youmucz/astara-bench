## 1. Core Infrastructure

- [x] 1.1 Extend `Scenario.category` type to `"basic" | "domain" | "negative" | "general"` in `src/runners/bench-runner.ts`
- [x] 1.2 Add `command` / `expected_exit` / `timeout_ms` optional fields to `ScenarioAssertion` interface in `src/runners/bench-runner.ts`
- [x] 1.3 Implement `test_exec` case in `evalDeterministic` function using `execSync` with timeout and exit code comparison
- [x] 1.4 Verify `loadScenarios` filters `general` category correctly with existing category logic

## 2. Assertion Library — Python Patterns

- [x] 2.1 Add bare-except pattern detection (`except:` without exception type) to `src/assertions/patterns.ts`
- [x] 2.2 Add mutable-default-arg pattern detection (`def foo(items=[])` ) to `src/assertions/patterns.ts`
- [x] 2.3 Extend `function_exists` in `evalStructuralAssertions` with Python `def name(` fallback pattern (GDScript → C# → Python)
- [x] 2.4 Add PEP8 import order detection to `src/assertions/naming.ts` (stdlib → third-party → local)
- [x] 2.5 Add `--category general` specific dispatch in pattern/naming checks to apply Python rules only to .py files

## 3. Python Fixture Project

- [x] 3.1 Create `fixtures/python-project/` directory with `pyproject.toml` and `pytest.ini`
- [x] 3.2 Create `fixtures/python-project/G01-recursion-fix/` — `problem.py` (recursion without base case), `solution.py`, `test_factorial.py`
- [x] 3.3 Create `fixtures/python-project/G02-write-tests/` — `problem.py` (untested function), `solution.py` (same function), `test_discount.py` stub (no test functions)
- [x] 3.4 Create `fixtures/python-project/G03-extract-method/` — `problem.py` (100+ line unstructured function), `solution.py`, `test_processor.py`
- [x] 3.5 Create `fixtures/python-project/G04-error-handling/` — `problem.py` (file IO without try/except), `solution.py`, `test_file_io.py`
- [x] 3.6 Create `fixtures/python-project/G05-signature-fix/` — `problem.py` (mismatched types), `solution.py`, `test_signature.py`
- [x] 3.7 Create `fixtures/python-project/G06-input-validation/` — `problem.py` (no input validation), `solution.py`, `test_validation.py`
- [x] 3.8 Create `fixtures/python-project/G07-thread-safety/` — `problem.py` (unlocked counter), `solution.py`, `test_threading.py`
- [x] 3.9 Create `fixtures/python-project/G08-loop-mutation/` — `problem.py` (list modified during iteration), `solution.py`, `test_loop.py`
- [x] 3.10 Create `fixtures/python-project/G09-exception-swallow/` — `problem.py` (bare except pass), `solution.py`, `test_exceptions.py`
- [x] 3.11 Create `fixtures/python-project/G10-mutable-default/` — `problem.py` (mutable default args), `solution.py`, `test_defaults.py`

## 4. General Scenarios YAML

- [x] 4.1 Create `scenarios/general/G01-recursion-fix.yaml` — prompt to find and fix missing base case, test_exec assertion
- [x] 4.2 Create `scenarios/general/G02-write-tests.yaml` — prompt to write pytest for existing function, test_exec + structural assertions
- [x] 4.3 Create `scenarios/general/G03-extract-method.yaml` — prompt to refactor long function, test_exec + structural assertions
- [x] 4.4 Create `scenarios/general/G04-error-handling.yaml` — prompt to add try/except for file IO, test_exec + python pattern assertions
- [x] 4.5 Create `scenarios/general/G05-signature-fix.yaml` — prompt to fix mismatched function signature, test_exec assertion
- [x] 4.6 Create `scenarios/general/G06-input-validation.yaml` — prompt to add input validation, test_exec assertion
- [x] 4.7 Create `scenarios/general/G07-thread-safety.yaml` — prompt to add threading.Lock, test_exec assertion
- [x] 4.8 Create `scenarios/general/G08-loop-mutation.yaml` — prompt to fix list mutation in loop, test_exec + pattern assertions
- [x] 4.9 Create `scenarios/general/G09-exception-swallow.yaml` — prompt to fix bare except, test_exec + pattern assertions
- [x] 4.10 Create `scenarios/general/G10-mutable-default.yaml` — prompt to fix mutable default arg, test_exec + pattern assertions

## 5. Config & CLI

- [x] 5.1 Add `scenarios/general` to `scenario_dirs` in `bench.config.yaml`
- [x] 5.2 Add G01–G10 weights (1.0 each) to `scenario_weights` in `bench.config.yaml`
- [x] 5.3 Update `--category` option help text in `src/cli.ts` to include `general`

## 6. Verification

- [x] 6.1 Run `bun run typecheck` — zero new type errors
- [x] 6.2 Run `bun test` — all existing tests pass
- [ ] 6.3 Run `bun run bench --category basic --mode compare --runs 1` — verify 8 Godot basic scenarios intact
- [ ] 6.4 Run `bun run bench --category general --mode baseline --runs 1` — verify 10 general scenarios load and execute
- [ ] 6.5 Run `bun run bench --category all --mode baseline --runs 1` — verify 36 scenarios (26 + 10) load correctly
- [ ] 6.6 Verify `test_exec` assertion produces meaningful stderr output in reports when tests fail

## 7. SWE-bench — Instance Loading

- [x] 7.1 Create `src/swebench/loader.ts` — load and validate SWE-bench instances from JSON cache
- [x] 7.2 Create `swebench-instances/instances.json` — cached SWE-bench Lite instances (534 entries)
- [x] 7.3 Implement `filterInstances()` by repo / version / created_at range
- [x] 7.4 Add `swebench` config section to `bench.config.yaml` (dataset, instances_dir, repos_dir, max_instances, timeout_ms)

## 8. SWE-bench — Repo Management

- [x] 8.1 Create `src/swebench/repo-manager.ts` — bare clone + worktree checkout for GitHub repos
- [x] 8.2 Implement `checkoutInstance(repo, base_commit)` → returns working directory path
- [x] 8.3 Implement `applyPatch(workdir, patch)` using `git apply` 
- [x] 8.4 Add repo cache invalidation (re-fetch on stale cache)

## 9. SWE-bench — Test Execution

- [x] 9.1 Create `src/swebench/test-executor.ts` — run pytest in Docker or local venv
- [x] 9.2 Implement Docker-based test isolation (build image, run container, capture result)
- [x] 9.3 Implement local venv fallback (pip install deps, run pytest directly)
- [x] 9.4 Implement dry-run mode (skip test execution, mark as unverified)
- [x] 9.5 Parse pytest output to extract FAIL_TO_PASS / PASS_TO_PASS results

## 10. SWE-bench — Native Runner

- [x] 10.1 Create `src/runners/swebench-runner.ts` — main SWE-bench orchestration
- [x] 10.2 Implement `runSwebenchInstance(client, instance)` — full pipeline: checkout → prompt → collect patch → evaluate
- [x] 10.3 Calculate resolve_rate per instance and per repo
- [x] 10.4 Implement SWE-bench result type and scoring

## 11. SWE-bench — CLI Integration

- [x] 11.1 Add `--preset` option to `src/cli.ts` (values: godot / swebench / all)
- [x] 11.2 Route `--preset swebench` to swebench-runner.ts
- [x] 11.3 Route `--preset all` to both runners, merge reports
- [x] 11.4 Add SWE-bench section to reporter.ts (resolve_rate table)
- [x] 11.5 Add `--max-instances <n>` CLI option to limit SWE-bench instance count

## 12. Integration Verification

- [ ] 12.1 Run `bun run bench --preset swebench --max-instances 5 --mode baseline` — verify 5 instances run through
- [ ] 12.2 Run `bun run bench --preset all --category basic --max-instances 3 --mode baseline` — verify Godot + General + SWE-bench coexist
- [ ] 12.3 Verify SWE-bench report section displays resolve_rate per repo
- [ ] 12.4 Verify Docker → venv → dry-run fallback chain works
- [ ] 12.5 Run `bun run typecheck` — zero new type errors after all SWE-bench additions
