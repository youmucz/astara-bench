## ADDED Requirements

### Requirement: 场景 YAML 格式规范

每个基准测试场景 SHALL 使用 YAML 格式定义，包含以下必填字段：`id`、`name`、`category`（`basic`、`domain` 或 `negative`）、`difficulty`（`easy`/`medium`/`hard`）、`description`、`prompt`、`assertions`。

#### Scenario: 合法场景文件加载

- **WHEN** runner 加载一个包含所有必填字段的 YAML 文件
- **THEN** 场景被成功解析并加入执行队列

#### Scenario: 缺失必填字段报错

- **WHEN** runner 加载一个缺少 `id` 字段的 YAML 文件
- **THEN** runner SHALL 报错并跳过该场景，不中断整体执行

#### Scenario: category 分类

- **WHEN** 场景 YAML 的 `category` 字段为 `basic`、`domain` 或 `negative`
- **THEN** runner SHALL 将场景归入对应类别，支持 `--category basic/domain/negative/all` 筛选

### Requirement: 基本基准场景覆盖

系统 SHALL 包含至少 7 个基本基准场景（category: basic），覆盖以下维度：文件命名规范 (B01)、安全编辑 (B02)、代码质量 (B03)、目录结构 (B04)、禁止模式 (B05)、跨文件引用 (B06)、已有代码尊重 (B07)。

#### Scenario: 基本基准场景完整性

- **WHEN** 运行 `bench --category basic`
- **THEN** 系统 SHALL 执行 B01-B07 共 7 个场景并输出每个场景的分数

### Requirement: 领域基准场景覆盖

系统 SHALL 包含至少 14 个 Godot 领域基准场景（category: domain），覆盖：玩家控制器 (D01)、敌人 AI (D02)、生命值组件 (D03)、信号通信 (D04)、状态机 (D05)、全局事件总线 (D06)、UI/HUD (D07)、场景组合 (D08)、Resource 数据类 (D09)、背包系统 (D10)、音频管理器 (D11)、存档系统 (D12)、C# 玩家控制器 (D13)、C# 信号模式 (D14)。

#### Scenario: 领域基准场景完整性

- **WHEN** 运行 `bench --category domain`
- **THEN** 系统 SHALL 执行 D01-D14 共 14 个场景并输出每个场景的分数

### Requirement: 负面场景覆盖

系统 SHALL 包含至少 4 个负面基准场景（category: negative），验证 hook 拦截和安全防护行为：场景文件编辑拒绝 (N01)、文件覆盖拒绝 (N02)、BDD 注释保留 (N03)、硬编码路径拒绝 (N04)。

#### Scenario: 负面场景完整性

- **WHEN** 运行 `bench --category negative`
- **THEN** 系统 SHALL 执行 N01-N04 共 4 个场景并输出每个场景的分数

### Requirement: 三层断言结构

每个场景的 `assertions` SHALL 包含三个可选子段：`deterministic`（确定性断言）、`structural`（结构断言）、`hook_simulation`（hook 模拟断言）。每层断言独立评分。

#### Scenario: 三层断言独立评分

- **WHEN** 场景执行完毕且断言评估完成
- **THEN** 系统 SHALL 输出 `deterministic_score`、`structural_score`、`hook_simulation_score` 三个独立分数（0-1）

### Requirement: 确定性断言类型

系统 SHALL 支持以下确定性断言类型：`regex`（正则匹配文件内容）、`regex-not`（正则不匹配文件内容）、`contains`（文件包含文本）、`extract-compare`（提取文件内容并比较）、`no_file_created`（项目中未创建匹配 glob 的文件）、`uses_edit_not_write`（操作类型为 Edit 而非 Write，通过 session message parts 中的 tool call 记录判断）、`consistency_check`（断言规则与 hook 实现一致性）。

#### Scenario: regex 断言通过

- **WHEN** 生成的文件内容匹配 `regex` 断言的 `pattern`
- **THEN** 该断言 SHALL 被标记为 PASS

#### Scenario: regex-not 断言失败

- **WHEN** 生成的文件内容匹配 `regex-not` 断言的 `pattern`
- **THEN** 该断言 SHALL 被标记为 FAIL 并输出 `message`

#### Scenario: no_file_created 断言

- **WHEN** Agent 在项目中创建了匹配 `pattern` glob 的文件
- **THEN** `no_file_created` 断言 SHALL 被标记为 FAIL

#### Scenario: uses_edit_not_write 断言

- **WHEN** Agent 修改已存在文件，通过 session message parts 中的 tool call 记录判断操作类型
- **THEN** 如果 tool call 类型为 Write（而非 Edit），SHALL 被标记为 FAIL

### Requirement: 结构断言类型

系统 SHALL 支持以下结构断言类型：`function_exists`（函数是否存在于生成文件中）、`has_constant`（常量是否存在）、`all_variables_match`（所有变量匹配模式）、`signal_exists`（信号声明是否存在）、`extends_type`（继承类型检查）。

#### Scenario: function_exists 检查 _ready

- **WHEN** 断言配置为 `function_exists` 且 `function: "_ready"`
- **THEN** 系统 SHALL 在生成的 .gd 文件中搜索 `func _ready()` 或 .cs 文件中搜索 `override _Ready` 并返回匹配结果

### Requirement: Hook 行为断言

系统 SHALL 支持 Studios hook 的行为验证，至少包括：`scene-file-guard`（不应创建/编辑 .tscn/.tres）、`write-existing-file-guard`（不应 Write 已存在文件）、`comment-checker`（不应包含 AI 风格注释）。

在 **Studios 组**中（hooks 实际运行），这些断言验证 hook 是否成功拦截了违规操作。在 **Baseline 组**中（无 hooks），这些断言验证 agent 是否主动遵循了规范。

#### Scenario: scene-file-guard 检查

- **WHEN** Agent 在项目中创建或修改了 `.tscn` 或 `.tres` 文件
- **THEN** `scene-file-guard` 断言 SHALL 被标记为 FAIL

#### Scenario: comment-checker 检查

- **WHEN** 生成的代码文件中包含 `// This function`、`// This method` 等 AI 注释模式
- **THEN** `comment-checker` 断言 SHALL 被标记为 FAIL

### Requirement: 场景加权评分

每个场景 SHALL 有一个加权总分，权重配置为：`deterministic_weight`（默认 0.5）、`structural_weight`（默认 0.3）、`hook_simulation_weight`（默认 0.2）。总分 = Σ(层分数 × 权重)。

#### Scenario: 加权总分计算

- **WHEN** 某场景 deterministic=0.9, structural=0.7, hook_simulation=0.8
- **THEN** 默认权重下总分 SHALL 为 0.9×0.5 + 0.7×0.3 + 0.8×0.2 = 0.82
