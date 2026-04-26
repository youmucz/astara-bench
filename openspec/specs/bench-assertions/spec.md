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