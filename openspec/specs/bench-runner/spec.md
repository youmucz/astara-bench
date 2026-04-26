## MODIFIED Requirements

### Requirement: 场景加权评分

Runner SHALL 在 category 总分聚合时应用 `scenarioWeights` 映射。每个场景的加权总分乘以其权重，category 总分 = Σ(score × weight) / Σ(weight)。未在 `scenarioWeights` 中配置的场景默认权重为 1.0。

#### Scenario: 加权聚合计算

- **WHEN** B01(权重1.0)=0.9, B02(权重1.5)=0.8
- **THEN** category_avg = (0.9×1.0 + 0.8×1.5) / (1.0+1.5) = 0.84

#### Scenario: 未配置权重的场景

- **WHEN** 某场景 ID 不在 scenarioWeights 映射中
- **THEN** 该场景权重 SHALL 默认为 1.0

### Requirement: 空断言评分策略

当某层断言数组为空时，评分 SHALL 根据以下规则处理：
- 如果场景 YAML 中该层未定义（`undefined` 或不存在），该层权重 SHALL 按比例重新分配给其他已定义层
- 如果显式定义为空数组（`[]`），该层得分 SHALL 记为 0

#### Scenario: 未定义层权重重分配

- **WHEN** 场景只定义了 `deterministic` 和 `structural` 断言，`hook_simulation` 未定义
- **THEN** 总分 = deterministic_score × (0.5/0.8) × 0.5 + structural_score × (0.3/0.8) × 0.5，其中 0.8 = 0.5+0.3

#### Scenario: 显式空数组

- **WHEN** 场景 YAML 中 `hook_simulation: []` 显式定义为空
- **THEN** hook_simulation_score SHALL 为 0，权重仍按原始比例计算

### Requirement: 错误处理与边界条件

Runner SHALL 在 `catch` 块中明确记录错误信息而非静默吞没。所有文件系统操作的 `catch` 块 SHALL 至少包含 `console.warn` 输出，包含操作上下文和错误详情。

#### Scenario: 文件读取失败记录

- **WHEN** `fs.readFileSync()` 在收集文件内容时失败
- **THEN** runner SHALL 输出 `console.warn` 包含文件路径和错误信息，而非静默跳过

### Requirement: 场景分类扩展

`Scenario.category` 类型 SHALL 扩展为 `"basic" | "domain" | "negative" | "general"`。Runner MUST 支持通过 `--category general` 筛选 general 场景。加载逻辑 SHALL 兼容新增 category，无需额外分支。

#### Scenario: general 场景加载

- **WHEN** 运行 `bench --category general`
- **THEN** Runner SHALL 仅加载 `scenarios/general/` 下且 `category: "general"` 的 YAML 场景

#### Scenario: all category 包含 general

- **WHEN** 运行 `bench --category all`
- **THEN** Runner SHALL 加载 basic、domain、negative 和 general 四类场景

#### Scenario: general 场景评分

- **WHEN** general 场景被评估
- **THEN** Runner SHALL 使用与 Godot 场景相同的三维加权评分体系（deterministic + structural + hook_simulation）

### Requirement: test_exec 确定性断言

`evalDeterministic` 函数 SHALL 支持 `type: "test_exec"` 断言类型。该断言 MUST：
- 在项目目录 (`projectDir`) 下执行 `assertion.command` 指定的 shell 命令
- 通过 `execSync` 同步执行，使用 `assertion.timeout_ms`（默认 30000ms）作为超时
- 将命令退出码与 `assertion.expected_exit`（默认 0）比较
- 命令执行失败（非零退出且非预期）时，SHALL 在消息中包含 stderr 的前 200 字符

#### Scenario: test_exec 通过

- **WHEN** `test_exec` 断言 command 为 `pytest tests/`，命令退出码为 0
- **THEN** 断言 SHALL PASS，消息为 "test_exec: passed"

#### Scenario: test_exec 失败

- **WHEN** `test_exec` 断言 command 为 `pytest tests/`，命令退出码为 1
- **THEN** 断言 SHALL FAIL，消息包含 exit code 和 stderr 前 200 字符

#### Scenario: test_exec 预期非零退出

- **WHEN** `test_exec` 断言 `expected_exit: 1` 且命令退出码为 1
- **THEN** 断言 SHALL PASS

#### Scenario: test_exec 超时

- **WHEN** `test_exec` 命令执行超过 `timeout_ms`
- **THEN** `execSync` SHALL 抛出超时异常，断言 SHALL FAIL 并包含超时信息

### Requirement: general 场景默认 fixture 策略

当 general 场景未定义 `fixture` 字段时，Runner SHALL 跳过 fixture 加载步骤。General 场景 MUST 不使用 Godot fixture（`fixtures/godot-project-bare/`），而是通过 `fixtures/python-project/` 子目录加载 Python 代码。

#### Scenario: general 场景无 fixture

- **WHEN** general 场景 YAML 中 `fixture` 字段缺失
- **THEN** Runner SHALL 跳过 fixture 加载，仅使用全局项目模板

#### Scenario: general 场景有 fixture

- **WHEN** general 场景 `fixture: "fixtures/python-project/G01-recursion-fix"`
- **THEN** Runner SHALL 将 fixture 子目录内容复制到项目目录