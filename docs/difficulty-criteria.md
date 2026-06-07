# Difficulty Criteria — 4-Axis Rubric

The framework rates each task on 4 axes, each 1-4. The sum (range 4-16)
maps to a difficulty level.

## The 4 Axes

### Axis 1: Cognitive Complexity

How many reasoning steps are required?

| Score | Definition                                | Example                                  |
|-------|-------------------------------------------|------------------------------------------|
| 1     | Single fact lookup                        | "What is 2+2?"                           |
| 2     | 2-3 step reasoning                        | "Reverse the string 'abc'"               |
| 3     | Multi-step with implicit premises         | "Find the bug in this 20-line script"    |
| 4     | Cross-domain synthesis + creative         | "Refactor this 30-line function with constraints" |

### Axis 2: Information Availability

Where is the answer?

| Score | Definition                                | Example                                  |
|-------|-------------------------------------------|------------------------------------------|
| 1     | Answer given in input                     | "Parse this YAML and report name=alpha"  |
| 2     | Simple extraction                         | "Extract the 5th field"                  |
| 3     | Synthesis from input                      | "Identify 3 issues across this function" |
| 4     | Requires external world knowledge         | "Use SOLID principles to evaluate"      |

### Axis 3: GT Clarity

How unambiguous is the ground truth?

| Score | Definition                                | Example                                  |
|-------|-------------------------------------------|------------------------------------------|
| 1     | Unique string answer                      | "8080"                                   |
| 2     | Finite set match                          | Must include "no zero check"             |
| 3     | Multiple correct (fuzzy)                  | List of issues, any reasonable framing OK|
| 4     | Multi-dimensional subjective              | Expert jury required                     |

### Axis 4: Domain Breadth

How general or specific is the knowledge required?

| Score | Definition                                | Example                                  |
|-------|-------------------------------------------|------------------------------------------|
| 1     | General programming                       | Basic Python                              |
| 2     | Standard CS                               | Data structures, algorithms               |
| 3     | Specific subdomain                       | Concurrency, security, DB                |
| 4     | Highly specialized                        | Compilers, distributed consensus          |

## Level Mapping

| Sum   | Level   | Expected top-model pass rate |
|-------|---------|------------------------------|
| 4-6  | easy    | > 85%                        |
| 7-10 | medium  | 60-85%                       |
| 11-13| hard    | 35-60%                       |
| 14-16| expert  | < 35%                        |

## Worked Examples

### Example 1: "Print HELLO" → easy (4)

- Cognitive: 1 (single fact)
- Info: 1 (answer in input: "print HELLO")
- GT: 1 (unique string)
- Domain: 1 (general)

Sum = 4 → **easy**

### Example 2: "Find the bug in 20-line bash script" → medium (8)

- Cognitive: 3 (multi-step, implicit)
- Info: 2 (extract from code)
- GT: 2 (finite set: "no files matched", "f is literal")
- Domain: 1 (general shell)

Sum = 8 → **medium**

### Example 3: "Refactor 30-line function with 5 constraints" → hard (12)

- Cognitive: 4 (multi-step with creative constraints)
- Info: 3 (synthesize the refactor from input + constraints)
- GT: 3 (multiple correct refactorings)
- Domain: 2 (standard CS, design patterns)

Sum = 12 → **hard**

### Example 4: "Choose best of 3 architectures for a chat app" → expert (16)

- Cognitive: 4 (cross-domain: performance, ops, cost, future evolution)
- Info: 4 (requires external knowledge of Kafka, Elasticsearch, LSM-trees)
- GT: 4 (multi-dimensional subjective, requires expert jury)
- Domain: 3 (distributed systems)

Sum = 16 → **expert**

## Validation

The framework's `validators/check-difficulty.sh` recomputes the sum and
flags any mismatch with `self_assessed`. This is a soft warning, not a
blocker — the rubric is meant to be calibrated over time, not enforced
strictly.
