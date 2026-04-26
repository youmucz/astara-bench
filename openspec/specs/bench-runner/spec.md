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