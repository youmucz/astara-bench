## MODIFIED Requirements

### Requirement: 断言类型 C# 兼容性

`function_exists` 和 `extends_type` 断言类型 SHALL 同时支持 GDScript 和 C# 语法。当 GDScript 模式不匹配时，系统 MUST 尝试 C# 备用模式。

#### Scenario: function_exists 匹配 GDScript 方法

- **WHEN** 代码包含 `func _physics_process(delta):` 且断言为 `function_exists: "_physics_process"`
- **THEN** 断言 SHALL PASS

#### Scenario: function_exists 匹配 C# 方法

- **WHEN** 代码包含 `public override void _PhysicsProcess(double delta)` 且断言为 `function_exists: "_PhysicsProcess"`
- **THEN** 断言 SHALL PASS（使用 `\b_PhysicsProcess\s*\(` 单词边界匹配）

#### Scenario: extends_type 匹配 GDScript extends

- **WHEN** 代码包含 `extends CharacterBody2D` 且断言为 `extends_type: "CharacterBody2D"`
- **THEN** 断言 SHALL PASS

#### Scenario: extends_type 匹配 C# 继承

- **WHEN** 代码包含 `public partial class PlayerController : CharacterBody2D` 且断言为 `extends_type: "CharacterBody2D"`
- **THEN** 断言 SHALL PASS（使用 `class\s+\w+\s*:\s*CharacterBody2D` 模式）

#### Scenario: function_exists 两种语言均不匹配

- **WHEN** 代码中不存在指定函数名（GDScript 和 C# 模式均不匹配）
- **THEN** 断言 SHALL FAIL，消息为 `"<name> not found"`
