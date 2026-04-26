## MODIFIED Requirements

### Requirement: 架构方向断言

断言库 SHALL 检查代码依赖是否遵循 UI → Gameplay → Framework → Engine 的单向依赖规则。支持 GDScript 和 C# 两种语言的依赖检测。

#### Scenario: C# using 语句依赖检测

- **WHEN** C# 文件包含 `using Gameplay;` 且位于 `src/ui/` 目录
- **THEN** 架构方向断言 SHALL PASS（UI → Gameplay 正向依赖）

#### Scenario: C# 继承反向依赖

- **WHEN** C# 文件在 `src/gameplay/` 中继承 `UI.Hud` 类（位于 `src/ui/`）
- **THEN** 架构方向断言 SHALL FAIL（Gameplay → UI 反向依赖）

#### Scenario: GDScript 正向依赖通过

- **WHEN** UI 层代码引用 Gameplay 层的 class_name
- **THEN** 架构方向断言 SHALL PASS

## ADDED Requirements

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

### Requirement: Python bare-except 检测

断言库 SHALL 检测 Python 代码中的 bare except 模式（`except:` 未指定异常类型）。检测 MUST 匹配 `.py` 文件内容中的 `except\s*:` 模式（不包含 `except\s+\w` 即指定具体异常的情况）。General 场景中 SHOULD 通过 `pattern_check` 断言触发。

#### Scenario: bare except 检测 PASS

- **WHEN** Python 代码使用 `except ValueError:` 指定具体异常
- **THEN** bare-except 检测 SHALL PASS

#### Scenario: bare except 检测 FAIL

- **WHEN** Python 代码包含 `except:` 无类型限定
- **THEN** bare-except 检测 SHALL FAIL

### Requirement: Python mutable-default-arg 检测

断言库 SHALL 检测 Python 函数签名中的可变默认参数陷阱。检测 MUST 匹配 `def \w+\(.*=\s*(\[\s*\]|\{\s*\}|set\(\))` 模式。General 场景中 SHOULD 通过 `pattern_check` 断言触发。

#### Scenario: mutable default list 检测

- **WHEN** Python 函数包含 `def add_item(item, items=[])`
- **THEN** mutable-default-arg 检测 SHALL FAIL

#### Scenario: immutable default 通过

- **WHEN** Python 函数包含 `def add_item(item, items=None)`
- **THEN** mutable-default-arg 检测 SHALL PASS

### Requirement: function_exists Python 兼容性

`function_exists` 断言 SHALL 扩展支持 Python `def` 语法。当 GDScript（`func\s+name\(`）和 C#（`\bname\s*\(`）模式均不匹配时，系统 MUST 尝试 Python 模式（`def\s+name\(`）。匹配顺序 SHALL 为 GDScript → C# → Python。

#### Scenario: function_exists 匹配 Python def

- **WHEN** 代码包含 `def factorial(n):` 且断言为 `function_exists: "factorial"`
- **THEN** 断言 SHALL PASS

#### Scenario: function_exists 三种语言均不匹配

- **WHEN** 代码中不存在 GDScript `func`、C# 方法或 Python `def` 定义
- **THEN** 断言 SHALL FAIL，消息为 `"<name> not found"`

### Requirement: PEP8 导入顺序检测

断言库 SHALL 检测 Python 文件的 import 顺序是否符合 PEP8 标准。标准库导入 MUST 在最前，第三方库导入 MUST 在中间，本地导入 MUST 在最后。每个导入组之间 SHOULD 有空行分隔。

#### Scenario: PEP8 导入顺序正确

- **WHEN** Python 文件按 stdlib → third-party → local 顺序排列 import
- **THEN** PEP8 导入检测 SHALL PASS

#### Scenario: PEP8 导入顺序错误

- **WHEN** Python 文件的 `from .utils import ...` 出现在 `import os` 之前
- **THEN** PEP8 导入检测 SHALL FAIL