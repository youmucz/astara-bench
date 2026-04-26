## ADDED Requirements

### Requirement: 修复反模式代码场景

系统 SHALL 包含一个基本基准场景 B08，测试 Agent 修复已有反模式代码的能力。场景 SHALL 引用 `fixtures/buggy-code/` fixture，prompt 给出带 bug 的代码要求 Agent 修复所有反模式。

#### Scenario: B08 场景完整性

- **WHEN** 运行 `bench --scenario B08`
- **THEN** 系统 SHALL 执行场景并输出分数，断言覆盖 6 种禁止模式

#### Scenario: fixture 引用

- **WHEN** B08 场景加载
- **THEN** 场景 SHALL 通过 `fixture` 字段引用 `fixtures/buggy-code/`
