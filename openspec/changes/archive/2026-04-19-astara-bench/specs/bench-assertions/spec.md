## ADDED Requirements

### Requirement: GDScript 命名规范断言

断言库 SHALL 检查 GDScript 代码是否符合以下命名规则（遵循 Godot 官方规范）：文件名 snake_case.gd、class_name PascalCase（与文件名不必匹配）、变量 snake_case、私有变量 _snake_case、常量 SCREAMING_SNAKE_CASE、函数 snake_case、信号 snake_case、枚举 PascalCase、枚举值 SCREAMING_SNAKE_CASE。

#### Scenario: GDScript 文件命名通过

- **WHEN** Agent 创建文件 `player_controller.gd` 且包含 `class_name PlayerController`
- **THEN** 命名断言 SHALL 全部 PASS

#### Scenario: GDScript 文件命名失败

- **WHEN** Agent 创建文件 `PlayerController.gd`
- **THEN** 文件名断言 SHALL FAIL 并报告"GDScript 文件名必须是 snake_case.gd（Godot 官方规范）"

#### Scenario: GDScript 文件命名与 asset-naming-enforcer 一致性

- **WHEN** 断言库检测 GDScript 文件名
- **THEN** 命名规则 SHALL 与 Studios 源码中 `src/hooks/implementations/asset-naming-enforcer.ts` 的 NAMING_CONVENTIONS[".gd"].pattern 保持一致，若发现不一致 SHALL 标记为 INCONSISTENT

### Requirement: C# 命名规范断言

断言库 SHALL 检查 C# 代码是否符合以下命名规则：文件名 PascalCase.cs、类名 PascalCase、公共字段 PascalCase、私有字段 _camelCase、常量 PascalCase、方法 PascalCase、参数 camelCase、委托 PascalCase + Delegate 后缀。

#### Scenario: C# 方法命名通过

- **WHEN** Agent 生成代码包含 `public void TakeDamage(int amount)`
- **THEN** 方法命名断言 SHALL PASS

#### Scenario: C# 私有字段命名失败

- **WHEN** Agent 生成代码包含 `private int currentState;`（缺少下划线前缀）
- **THEN** 私有字段断言 SHALL FAIL

### Requirement: 架构方向断言

断言库 SHALL 检查代码依赖是否遵循 UI → Gameplay → Framework → Engine 的单向依赖规则。跨层反向依赖 SHALL 被标记为违规。

#### Scenario: 正向依赖通过

- **WHEN** UI 层代码引用 Gameplay 层的 class_name
- **THEN** 架构方向断言 SHALL PASS

#### Scenario: 反向依赖失败

- **WHEN** Framework 层代码 import/extends Gameplay 层的 class_name
- **THEN** 架构方向断言 SHALL FAIL

### Requirement: 禁止模式检测断言

断言库 SHALL 检测以下 Godot 禁止模式：硬编码节点路径 (`get_node("/root/...")`)、使用 `free()` 而非 `queue_free()`、`_process` 中 `load()`、魔法数字（无 const 定义的数值字面量在物理计算中）、空 `_process` 函数体、`find_child()` 在循环中使用。

#### Scenario: 硬编码路径检测

- **WHEN** Agent 生成代码包含 `get_node("/root/Main/Player")`
- **THEN** 禁止模式断言 SHALL FAIL 并报告"应使用 groups 或相对路径"

#### Scenario: load in _process 检测

- **WHEN** Agent 在 `_process` 函数内调用 `load("res://...")`
- **THEN** 禁止模式断言 SHALL FAIL 并报告"不应在 _process 中加载资源"

### Requirement: Godot 特有规则断言

断言库 SHALL 检查 Godot 特有的最佳实践：`_ready` 中获取子节点而非 `_init`、物理逻辑在 `_physics_process` 而非 `_process`、`move_and_slide()` 使用 `velocity` 属性、信号在 `_exit_tree` 中断开连接、使用 `@export` 标记可配置属性、使用 `@onready` 缓存节点引用。

#### Scenario: _init 访问子节点检测

- **WHEN** Agent 在 `_init` 函数中使用 `$Sprite2D`
- **THEN** Godot 特有规则断言 SHALL FAIL

#### Scenario: 物理在 _process 检测

- **WHEN** Agent 在 `_process` 中调用 `move_and_slide()`
- **THEN** Godot 特有规则断言 SHALL FAIL 并建议使用 `_physics_process`

### Requirement: Hook 行为模拟断言

断言库 SHALL 模拟 Studios hook 的核心检查逻辑，验证 Agent 输出是否触发了 hook 应阻止或警告的行为。至少覆盖：scene-file-guard（.tscn/.tres 文件操作）、write-existing-file-guard（Write 覆盖已有文件）、comment-checker（AI 风格注释检测）、hashline-edit-validator（Edit 哈希匹配）。

#### Scenario: comment-checker BDD 豁免

- **WHEN** 生成的代码文件中包含 `# GIVEN some condition` 的 BDD 注释
- **THEN** comment-checker 断言 SHALL PASS（BDD 模式豁免）

#### Scenario: comment-checker AI 注释检测

- **WHEN** 生成的代码文件中包含 `// This function handles player movement`
- **THEN** comment-checker 断言 SHALL FAIL

#### Scenario: scene-file-guard 检查

- **WHEN** Agent 在测试项目中创建或编辑 `.tscn` 或 `.tres` 文件
- **THEN** scene-file-guard 断言 SHALL FAIL

#### Scenario: write-existing-file-guard 检查

- **WHEN** Agent 使用 Write 工具覆盖测试项目中已存在的文件
- **THEN** write-existing-file-guard 断言 SHALL FAIL

#### Scenario: hashline-edit-validator 检查 — 哈希匹配

- **WHEN** Agent 使用 Edit 工具且 oldString 中的行哈希与测试项目文件当前内容匹配
- **THEN** hashline-edit-validator 断言 SHALL PASS

#### Scenario: hashline-edit-validator 检查 — 哈希不匹配

- **WHEN** Agent 使用 Edit 工具且 oldString 中的行哈希与测试项目文件当前内容不匹配（文件已被修改）
- **THEN** hashline-edit-validator 断言 SHALL FAIL
