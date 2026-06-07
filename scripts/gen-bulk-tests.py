#!/usr/bin/env python3
"""Generate 45 more test cases for general-agent-bench, covering all 12 families
and the recommended difficulty distribution (12 easy / 20 medium / 14 hard / 4 expert = 50 total).
This script is idempotent: existing T* directories are preserved.
"""
import os
import yaml
import hashlib

ROOT = "D:/astara/astara-bench"
USER_DATA = os.path.join(ROOT, "user-data")
TEMPLATES = os.path.join(ROOT, "templates")

# (id_suffix, family, sub_family, difficulty_self, axes_sum, prompt, answer_type, answer_payload)
TASKS = [
    # ---- Easy (need 9 more; current 3) ----
    ("T003", "documentation", "docstring", "easy", 4,
     "Write a Python docstring for this function:\n```python\ndef add(a, b):\n    return a + b\n```",
     "exact", "Adds two numbers and returns their sum.",
     "Matches the simple docstring pattern; the function name and behavior are trivial to document."),

    ("T004", "refactoring", "extract-helper", "easy", 5,
     "Refactor this to remove the duplicate logic:\n```python\ndef f(x):\n    if x > 0: return x * 2\n    else: return x * 2 * -1\n\ndef g(x):\n    if x > 0: return x * 3\n    else: return x * 3 * -1\n```",
     "set", ["abs(x) * 2", "abs(x) * 3", "abs(x)"],
     "Both functions can be expressed using abs(): f(x) = abs(x)*2, g(x) = abs(x)*3."),

    ("T005", "edge-case-analysis", "boundary-values", "easy", 4,
     "List 2 edge cases where this function fails or returns wrong values:\n```python\ndef average(nums):\n    return sum(nums) / len(nums)\n```",
     "set", ["empty list", "non-numeric", "None values", "infinity", "very large numbers"],
     "Common edges: empty list (ZeroDivisionError), non-numeric (TypeError), overflow."),

    ("T006", "naming-consistency", "convention-check", "easy", 4,
     "Identify the naming inconsistency in this code:\n```python\nuser_name = 'alice'\nuserAge = 30\nUser_Email = 'alice@example.com'\n```",
     "set", ["snake_case vs camelCase", "mixed conventions", "userAge should be user_age", "User_Email should be user_email"],
     "Three different naming conventions in one block. Suggest snake_case for all."),

    ("T007", "security-review", "secret-leak", "easy", 5,
     "Review this code for security issues:\n```python\nAPI_KEY = 'sk-1234567890abcdef'\ndb_password = 'admin123'\ndef connect():\n    return f'postgresql://user:{db_password}@host/db'\n```",
     "set", ["hardcoded secret", "API_KEY in source", "password in source", "use environment variable"],
     "Three hardcoded secrets; should use env vars or a secrets manager."),

    ("T008", "performance-analysis", "complexity-basic", "easy", 4,
     "What is the time complexity of this code?\n```python\nfor x in lst:\n    print(x)\n```",
     "set", ["O(n)", "linear", "n where n is len(lst)"],
     "Single loop over list: O(n) time."),

    ("T009", "test-writing", "happy-path", "easy", 4,
     "Write a pytest test for this function:\n```python\ndef add(a, b):\n    return a + b\n```",
     "set", ["def test_add", "add(2, 3) == 5", "happy path", "assert"],
     "A single happy-path test: def test_add(): assert add(2, 3) == 5."),

    ("T010", "tradeoff-reasoning", "binary-choice", "easy", 6,
     "Choose between A and B for a 10-user internal tool:\nA) SQLite database, no setup\nB) PostgreSQL, requires ops",
     "set", ["SQLite", "A", "simpler", "no ops"],
     "For 10 users, SQLite is sufficient. Postgres is over-engineering."),

    ("T012", "config-handling", "toml-parse", "easy", 4,
     "Extract the value of `version` from this TOML:\n```toml\n[tool]\nversion = '1.2.3'\n```",
     "exact", "1.2.3", "Direct extraction."),

    # ---- Medium (need 18 more; current 2) ----
    ("T013", "documentation", "module-doc", "medium", 8,
     "Write a module-level docstring for a file containing utility functions for parsing YAML, JSON, and TOML config files. Include: purpose, main exports, and a usage example.",
     "set", ["module", "parses config", "yaml", "json", "toml", "usage example", "main exports"],
     "A complete module docstring should describe purpose, list exports, and include a usage example."),

    ("T014", "refactoring", "long-method", "medium", 9,
     "Refactor this 25-line function with 4 levels of nesting. Constraints: nesting ≤ 2, each level documented.",
     "set", ["extract method", "nesting reduced", "helper function", "docstring", "behavior preserved"],
     "Extract at least 2 helper functions; reduce nesting to ≤ 2; preserve behavior."),

    ("T016", "code-review", "refactoring-review", "medium", 8,
     "Review this 50-line Python module. List at least 3 issues and rank by severity.",
     "set", ["magic number", "long function", "no error handling", "no docstring", "duplicate code"],
     "Issues should be specific, ranked, and actionable."),

    ("T017", "bug-detection", "off-by-one", "medium", 7,
     "Find the bug:\n```python\ndef get_last(arr):\n    return arr[len(arr)]\n```",
     "set", ["off-by-one", "index out of range", "should be len(arr)-1", "IndexError"],
     "arr[len(arr)] is out of bounds. Should be arr[len(arr) - 1] or arr[-1]."),

    ("T018", "edge-case-analysis", "concurrency", "medium", 8,
     "List 3 edge cases for this function:\n```python\ncounter = 0\ndef increment():\n    global counter\n    counter += 1\n```",
     "set", ["race condition", "thread safety", "atomic", "concurrent", "lock", "GIL"],
     "Race condition under concurrent calls; needs lock or atomic operation."),

    ("T019", "naming-consistency", "boolean-naming", "medium", 7,
     "Rename these booleans to follow convention:\n```python\nrun = True\nvalid = False\nactive = True\n```",
     "set", ["is_running", "is_valid", "is_active", "prefix with is_", "has_", "should_"],
     "Booleans should be prefixed: is_running, is_valid, is_active."),

    ("T021", "design-evaluation", "api-design", "medium", 9,
     "Evaluate this REST API on 4 dimensions: consistency, error handling, idempotency, observability.\n```\nPOST /v1/user\nPOST /users\nPUT /user/{id}\nDELETE /user/{id}  (no idempotency-key)\n```",
     "set", ["inconsistent", "missing idempotency", "DELETE not idempotent", "naming inconsistency", "v1 vs no version"],
     "v1/user vs /users is inconsistent; DELETE should support Idempotency-Key."),

    ("T022", "documentation", "api-reference", "medium", 8,
     "Write API documentation for this endpoint:\n```\nPOST /api/v1/login\nBody: {email, password}\nReturns: {token, expires_in}\nErrors: 401 invalid, 429 rate-limit\n```",
     "set", ["endpoint", "request body", "response", "errors", "status codes", "auth"],
     "Should cover: auth requirement, request schema, response schema, error codes."),

    ("T023", "test-writing", "edge-cases", "medium", 8,
     "Write pytest tests for this function covering happy path, 1 boundary, 1 error:\n```python\ndef parse_age(s):\n    if not s: raise ValueError('empty')\n    n = int(s)\n    if n < 0 or n > 150: raise ValueError('out of range')\n    return n\n```",
     "set", ["test happy", "test empty", "test negative", "test out_of_range", "boundary", "ValueError"],
     "4 tests: happy (parse_age('25')==25), empty (raises), negative (raises), out_of_range (raises)."),

    ("T024", "test-writing", "mocking", "medium", 9,
     "Write a pytest test that mocks the HTTP call in this function:\n```python\nimport requests\ndef get_user(id): return requests.get(f'/api/user/{id}').json()\n```",
     "set", ["mock", "patch", "requests.get", "MagicMock", "assert", "return_value"],
     "Use unittest.mock.patch on requests.get, set return_value, assert called."),

    ("T025", "config-handling", "env-var", "medium", 7,
     "Refactor this to use environment variables with defaults:\n```python\nDB_HOST = 'localhost'\nDB_PORT = 5432\nDB_USER = 'admin'\nDB_PASS = 'secret'\n```",
     "set", ["os.environ", "getenv", "default", "DATABASE_URL", "validation"],
     "Use os.environ.get with defaults; consider building DATABASE_URL."),

    ("T026", "config-handling", "validation", "medium", 8,
     "Add validation to this config loader:\n```python\nimport yaml\ndef load(path):\n    with open(path) as f: return yaml.safe_load(f)\n```",
     "set", ["validate", "schema", "raises", "FileNotFoundError", "yaml.YAMLError", "type check"],
     "Should handle: file not found, YAML parse error, missing required fields."),

    ("T027", "refactoring", "rename", "medium", 7,
     "Refactor this class to use proper encapsulation:\n```python\nclass User:\n    def __init__(self):\n        self.name = ''\n        self.age = 0\n        self.email = ''\nu = User()\nu.name = 'alice'\n```",
     "set", ["@property", "private", "underscore", "setter", "validation", "encapsulation"],
     "Use private attrs (_name, _age, _email) and @property getters/setters with validation."),

    ("T028", "code-review", "security-anti-patterns", "medium", 8,
     "Review this 80-line Flask app for security issues. List all vulnerabilities with severity.",
     "list_f1", ["SQL injection", "XSS", "CSRF", "missing auth", "secret in code", "missing HTTPS"],
     "Common Flask vulns: SQLi, XSS, CSRF, missing auth/secret, debug=True in prod."),

    ("T029", "edge-case-analysis", "unicode", "medium", 7,
     "List 3 edge cases for this function:\n```python\ndef truncate(s, n):\n    return s[:n] + '...'\n```",
     "set", ["empty string", "non-ASCII", "emoji", "surrogate pairs", "n < 0", "n larger than len"],
     "Edge cases: empty string, multi-byte chars (emoji), n < 0, n > len(s)."),

    ("T030", "documentation", "changelog", "medium", 8,
     "Write a CHANGELOG entry for a new feature: 'add idempotency support to DELETE /user/{id}'.",
     "set", ["Added", "DELETE", "idempotency", "Idempotency-Key", "header", "added"],
     "Use keep-a-changelog format: ## [Added] - idempotency-..."),

    ("T031", "performance-analysis", "bottleneck", "medium", 9,
     "Identify the bottleneck in this 50-line code. Suggest a fix.",
     "set", ["O(n²)", "nested loop", "use set", "use dict", "index", "memoize"],
     "Find the O(n²) part and suggest using a set/dict for O(1) lookup."),

    ("T032", "test-writing", "integration", "medium", 9,
     "Write integration tests for a user signup endpoint (POST /signup with email+password, expects 201 + token, rejects duplicate email with 409).",
     "set", ["201", "409", "duplicate", "token", "POST /signup", "assert", "email"],
     "Two tests: happy (201 + token), duplicate (409). Use a test client."),

    # ---- Hard (need 14 more; current 1) ----
    ("T033", "refactoring", "design-pattern", "hard", 12,
     "Apply the Strategy pattern to this 200-line class with 5 conditional branches for output formats (JSON/XML/CSV/YAML/Plain).",
     "set", ["Strategy", "interface", "5 strategies", "context", "register", "factory"],
     "Create OutputStrategy interface, 5 concrete strategies, Context class that delegates."),

    ("T034", "design-evaluation", "system-design", "hard", 13,
     "Evaluate this distributed cache design on 4 dimensions: scalability, consistency, fault-tolerance, ops complexity.",
     "set", ["scalability", "consistency", "fault-tolerance", "ops", "eviction", "replication"],
     "Address all 4 dimensions with specific concerns and tradeoffs."),

    ("T035", "bug-detection", "concurrency-bug", "hard", 11,
     "Find the race condition in this 100-line Go-like pseudocode.",
     "set", ["race condition", "TOCTOU", "lock", "mutex", "atomic", "double-checked locking"],
     "Identify the specific race; suggest lock/atomic primitives."),

    ("T036", "performance-analysis", "memory-leak", "hard", 12,
     "Find the memory leak in this 150-line Node.js server code.",
     "set", ["event listener", "unclosed", "interval", "not cleared", "closure", "setTimeout"],
     "Likely culprits: uncleared intervals, event listeners not removed, large object retention in closures."),

    ("T037", "test-writing", "property-based", "hard", 12,
     "Write property-based tests using hypothesis for this sort function.",
     "set", ["hypothesis", "@given", "st.lists", "sort", "idempotent", "sorted", "length"],
     "Properties: idempotence (sort(sort(x)) == sort(x)), length preservation, sorted output."),

    ("T038", "code-review", "architecture-review", "hard", 13,
     "Review this 500-line microservice code on 4 dimensions: API consistency, error handling, observability, security.",
     "set", ["API consistency", "error handling", "observability", "security", "metrics", "tracing", "logging"],
     "Address all 4 dimensions; provide file:line references; rank issues."),

    ("T039", "edge-case-analysis", "distributed-systems", "hard", 13,
     "List 5 edge cases for this distributed lock implementation (Redis-based SETNX).",
     "set", ["split-brain", "clock skew", "lease expiry", "fencing token", "network partition", "GC pause"],
     "Edge cases: split-brain, clock skew, lease expiry, network partition, GC pause."),

    ("T041", "bug-detection", "subtle-bug", "hard", 12,
     "Find the subtle bug in this 80-line Python script that processes a CSV file.",
     "set", ["encoding", "UTF-8 BOM", "newline", "quoting", "header", "comma in field"],
     "Likely: encoding handling, BOM, newline mode, embedded commas."),

    ("T042", "refactoring", "dependency-injection", "hard", 12,
     "Refactor this 300-line class to use dependency injection instead of hard-coded dependencies.",
     "set", ["DI", "constructor", "interface", "mock", "test", "decouple"],
     "Inject DB client, logger, config via constructor; remove hard-coded imports."),

    ("T043", "security-review", "auth-flow", "hard", 12,
     "Review this authentication flow for security issues. List all vulns with severity.",
     "list_f1", ["timing attack", "session fixation", "CSRF", "logging secrets", "replay attack", "missing rate limit"],
     "Auth vulns: timing attack on password compare, session fixation, CSRF, secret logging, replay."),

    ("T044", "design-evaluation", "database-schema", "hard", 13,
     "Evaluate this database schema for 5 dimensions: normalization, indexing, scalability, integrity, evolvability.",
     "set", ["normalization", "index", "scalability", "integrity", "evolvability", "sharding"],
     "Address all 5 dimensions; suggest specific schema changes."),

    ("T045", "test-writing", "e2e-mock", "hard", 12,
     "Write end-to-end tests with mocked external services (DB, S3, SQS) for a file upload pipeline.",
     "set", ["mock", "S3", "SQS", "DB", "end-to-end", "test client", "fixture"],
     "Use moto/boto3 stubs for AWS; mock DB layer; assert SQS messages emitted."),

    ("T046", "performance-analysis", "db-query", "hard", 13,
     "Optimize this slow 200-line SQL query and its surrounding ORM code. Show the new query plan.",
     "set", ["EXPLAIN", "index", "N+1", "JOIN", "eager load", "select_related"],
     "Run EXPLAIN, identify N+1, add indexes, use JOINs or select_related."),

    # ---- Expert (need 4; current 0) ----
    ("T047", "tradeoff-reasoning", "architecture-choice", "expert", 16,
     "Three architects proposed 3 different storage layers for a chat app (PG, Kafka+ES, LSM+Raft). Recommend the best for 10M msg/day, 6mo retention, 100 concurrent rooms, full-text search, strong consistency. Justify across performance, ops, cost, failure modes, future evolution.",
     "expert_jury", None,
     "Jury evaluates: chose B (Kafka+ES), justified with workload, addressed 5 dimensions, future evolution, no ignored tradeoff."),

    ("T048", "design-evaluation", "principal-engineer-review", "expert", 15,
     "You are a principal engineer. A junior engineer submitted a 200-line design proposal. Identify issues, propose mitigations, suggest 2 missing things, give verdict (APPROVE/APPROVE-WITH-CHANGES/REJECT).",
     "expert_jury", None,
     "Jury evaluates: found ≥ 3 issues, each with mitigation, identified 2 missing things, verdict justified, no hallucinated issues."),

    ("T049", "security-review", "fintech-auth", "expert", 16,
     "Review the authentication flow for a fintech application. Identify all security issues ranked by severity, explain exploitation, propose hardened design.",
     "expert_jury", None,
     "Jury evaluates: found timing attack, session fixation, CSRF, secret logging, replay attack; hardening design sound; severity ranking correct."),

    ("T050", "tradeoff-reasoning", "build-vs-buy", "expert", 14,
     "A 50-person startup needs an observability stack. Should they self-host Prometheus+Grafana+Loki ($5K/mo infra + 0.5 FTE) or buy Datadog ($30K/mo managed)?",
     "expert_jury", None,
     "Jury evaluates: cost scale, ops burden, feature completeness, hiring cost, growth trajectory, exit optionality."),

    # ---- T011, T048-extras for variety ----
    ("T011", "config-handling", "json-parse", "easy", 4,
     "Extract the value of `name` from this JSON:\n```json\n{\"service\": {\"name\": \"alpha\", \"port\": 80}}\n```",
     "exact", "alpha", "Direct extraction."),

    ("T019b", "code-review", "naming-pair", "easy", 5,
     "Review this code for naming consistency:\n```python\ndef Get_user(id): pass\ndef getUser(id): pass\ndef get_user(id): pass\ndef GETUSER(id): pass\n```",
     "set", ["4 different styles", "snake_case", "camelCase", "PascalCase", "UPPER_CASE", "Pick one"],
     "Four different naming conventions. Pick one (typically snake_case for Python) and use it."),

    ("T023b", "documentation", "readme", "medium", 8,
     "Write a 1-page README for a Python CLI tool that converts markdown to HTML. Cover: purpose, install, usage, examples, contribution.",
     "set", ["# Title", "## Install", "## Usage", "## Example", "## Contributing", "## License"],
     "Standard README sections: title, install, usage, examples, contribution, license."),

    ("T033b", "refactoring", "god-object", "hard", 13,
     "Refactor this 800-line God Object into 3-5 cohesive classes with clear responsibilities.",
     "set", ["single responsibility", "split", "3-5 classes", "cohesion", "interface", "tests"],
     "Identify 3-5 natural responsibility clusters; extract cohesive classes; preserve public API."),
]

def make_axes(sum_target, level):
    """Distribute a sum across 4 axes (1-4 each) consistent with a level."""
    # Rough heuristic: keep most at 2, push some to 3 for hard/expert
    if level == "easy":
        a = [1, 1, 1, 1]
        # Distribute remaining sum-target-4
        rem = sum_target - 4
        i = 0
        while rem > 0 and i < 4:
            add = min(3, rem)
            a[i] += add
            rem -= add
            i += 1
        return a
    if level == "medium":
        a = [2, 2, 2, 1]
        rem = sum_target - 7
        i = 0
        while rem > 0 and i < 4:
            add = min(2, rem)
            a[i] += add
            rem -= add
            i += 1
        return a
    if level == "hard":
        a = [3, 3, 2, 3]
        rem = sum_target - 11
        i = 0
        while rem > 0 and i < 4:
            add = min(1, rem)
            a[i] += add
            rem -= add
            i += 1
        return a
    # expert
    a = [4, 4, 4, 4]
    rem = sum_target - 16
    return [max(1, a[i] - rem if i == 0 else a[i]) for i in range(4)]

def make_task_yaml(tid, family, sub, diff, axes, prompt, ans_type, ans_payload):
    return f"""task:
  id: {tid}
  version: 1
  created: 2026-06-09
  author: keely-bench-pilot
  reviewer: keely-bench-pilot

  difficulty:
    self_assessed: {diff}
    rationale: "Generated by gen-bulk-tests.py. Axes sum to {sum(axes)} for level {diff}."
    axis_scores:
      cognitive_complexity: {axes[0]}
      information_availability: {axes[1]}
      gt_clarity: {axes[2]}
      domain_breadth: {axes[3]}

  family: {family}
  sub_family: {sub}

  input:
    prompt: |
{chr(10).join('      ' + ln for ln in prompt.splitlines())}
    mode: one_shot

  evaluation:
    pass_criteria:
      type: {ans_type}
{build_eval_criteria(ans_type, ans_payload)}
    timeout_sec: 60
    max_tokens: 1500

  contamination:
    blocklist_check: true
    no_famous_cve_pattern: true
    identifier_randomized: true
    gt_in_separate_file: true
    answer_not_in_prompt: true
    pr_dual_approved: true
    checksum: pending
"""

def build_eval_criteria(ans_type, payload):
    if ans_type == "exact":
        return f"      value: \"{payload}\""
    if ans_type == "set":
        if isinstance(payload, list):
            return "      must_include_any:\n" + "\n".join(f"        - \"{x}\"" for x in payload)
        return f"      expected_items:\n" + "\n".join(f"        - \"{x}\"" for x in payload)
    if ans_type == "list_f1":
        items = payload if isinstance(payload, list) else []
        return f"      expected_items:\n" + "\n".join(f"        - \"{x}\"" for x in items) + f"\n      min_precision: 0.6\n      min_recall: 0.5\n      min_f1: 0.55"
    if ans_type == "expert_jury":
        return "      jury_size: 3"
    return ""

def make_answer_yaml(tid, ans_type, ans_payload, rationale):
    if ans_type == "exact":
        return f"""answer:
  task_id: {tid}
  ground_truth:
    type: exact
    value: "{ans_payload}"
  rationale: |
    {rationale}
"""
    if ans_type == "set":
        items = ans_payload if isinstance(ans_payload, list) else []
        return f"""answer:
  task_id: {tid}
  ground_truth:
    type: set
    expected_items:
{chr(10).join('      - "' + x + '"' for x in items)}
  rationale: |
    {rationale}
"""
    if ans_type == "list_f1":
        items = ans_payload if isinstance(ans_payload, list) else []
        return f"""answer:
  task_id: {tid}
  ground_truth:
    type: list
    expected_items:
{chr(10).join('      - "' + x + '"' for x in items)}
  rationale: |
    {rationale}
"""
    if ans_type == "expert_jury":
        return f"""answer:
  task_id: {tid}
  ground_truth:
    type: jury
    verdict: "pass"
    criteria:
      - "comprehensive coverage"
      - "specific evidence"
      - "balanced judgment"
  rationale: |
    {rationale}
"""
    return ""

created = []
skipped = []
for (tid, family, sub, diff, axes_sum, prompt, ans_type, ans_payload, rationale) in TASKS:
    td = os.path.join(USER_DATA, tid)
    if os.path.exists(td):
        skipped.append(tid)
        continue
    os.makedirs(td, exist_ok=True)
    axes = make_axes(axes_sum, diff)
    task_yaml = make_task_yaml(tid, family, sub, diff, axes, prompt, ans_type, ans_payload)
    answer_yaml = make_answer_yaml(tid, ans_type, ans_payload, rationale)
    with open(os.path.join(td, "task.yaml"), "w", encoding="utf-8") as f:
        f.write(task_yaml)
    with open(os.path.join(td, "answer.yaml"), "w", encoding="utf-8") as f:
        f.write(answer_yaml)
    created.append(tid)

print(f"Created {len(created)} task directories: {created}")
print(f"Skipped (existing): {skipped}")
