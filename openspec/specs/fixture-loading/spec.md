## ADDED Requirements

### Requirement: 场景级 Fixture 加载

Runner SHALL 在执行场景前检查 `scenario.fixture` 字段。如果存在，系统 MUST 将 fixture 目录的全部内容递归复制到目标项目目录，然后创建 git commit 将 fixture 文件纳入版本追踪。

#### Scenario: B07 fixture 加载

- **WHEN** 运行 B07 场景（fixture = `fixtures/partial-player/`）
- **THEN** `partial-player/` 目录下的 `player_controller.gd` SHALL 被复制到 baseline 和 studios 项目目录根
- **THEN** git 中 SHALL 包含 fixture 文件的 commit，确保 `resetProject` 可以正确回退

#### Scenario: 无 fixture 的场景

- **WHEN** 场景未定义 `fixture` 字段或字段为空
- **THEN** Runner SHALL 跳过 fixture 加载步骤，仅使用全局项目模板

#### Scenario: B08 fixture 加载

- **WHEN** 运行 B08 场景（fixture = `fixtures/buggy-code/`）
- **THEN** `buggy_code.gd` SHALL 被复制到项目目录
- **THEN** Agent 可以读取并修复该文件中的反模式代码

### Requirement: Fixture 文件路径解析

`scenario.fixture` 路径 SHALL 相对于项目根目录（`process.cwd()`）解析。Must 支持绝对路径和相对路径。

#### Scenario: 相对路径 fixture

- **WHEN** `scenario.fixture` = `"fixtures/buggy-code/"`
- **THEN** 系统 SHALL 解析为 `{cwd}/fixtures/buggy-code/`

#### Scenario: fixture 目录不存在

- **WHEN** fixture 路径指向不存在的目录
- **THEN** Runner SHALL 输出 `console.warn` 并跳过 fixture 加载，不中断场景执行
