## Context

astara-bench 当前有一个两层项目初始化架构：

```
全局层: config.fixtureDir (godot-project-bare) → 复制到 baseline/studios 项目
场景层: Scenario.fixture 字段 → 已声明但从未被读取
```

B07 需要 `fixtures/partial-player/player_controller.gd` 预先存在于项目中以测试 "追加功能而不破坏现有代码"。B08 需要 `fixtures/buggy-code/buggy_enemy.gd` 预先存在以测试 "修复反模式代码"。当前两者都得不到 fixture 内容。

此外，`evaluateStructuralAssertions` 中的 `function_exists`（正则 `(?:func|function)\s+NAME\s*\(`）和 `extends_type`（正则 `\bextends\s+TYPE\b`）两个断言类型只匹配 GDScript 语法。D13/D14 是 C# 场景，断言必然失败。

## Goals / Non-Goals

**Goals:**
- 修复 `fixture` 字段被忽略的问题：runner 在每轮运行前将 fixture 内容合并到项目目录
- 修复 C# `function_exists` / `extends_type` 兼容性
- 统一文档与配置中的场景计数

**Non-Goals:**
- 不改变 `initProjects` 的全局 fixture 机制
- 不新增断言类型
- 不改变 `checkConsistencyWithHook` 算法（中等优先级，非致命）

## Decisions

### D1: Fixture 加载时机与方式

**选择**：在 `runScenario` 循环内，`for (const group of groups)` 之前，使用 `cpSync(fixtureDir, projectDir, { recursive: true })` 将 fixture 内容覆盖到项目目录。

**原因**：fixture 目录结构与项目目录兼容（都使用 `src/` 布局），`cpSync` 已有行为足够。B07 的 `partial-player/` 目录下是 `player_controller.gd`，复制到项目根后路径正确。

**备选方案**：
- 在 `initProjects` 中按场景分别配置 → 在 A/B 对比场景下需要两个不同 fixture 组合，复杂度高
- 在 git reset 后、executeScenario 前注入 → 当前已选方案

**复制位置**：由于 fixture 文件名中包含路径信息（如 `partial-player/player_controller.gd`），直接 `cpSync(fixtureDir, projectDir)` 会在项目中创建 `partial-player/player_controller.gd`。但 B07 提示词引用的是 `fixtures/partial-player/player_controller.gd`——agent 需要能实际读取到该文件。fixture 应复制到项目目录的结构匹配原始 fixture 子树。

**更准确的方案**：将 fixture 目录下所有内容递归复制到项目目录根，同时创建 git commit 将 fixture 内容纳入追踪（确保 reset 逻辑正常工作）。

### D2: C# `function_exists` 修复

**选择**：在 `evaluateStructuralAssertions` 的 `function_exists` case 中新增 C# 备用正则。当 GDScript 正则不匹配时，尝试 C# 方法签名模式：

```
GDScript:  /(?:func|function)\s+NAME\s*\(/
C#:        /(?:\bvoid\b|\b\w+\b)\s+NAME\s*\(/
```

更精确的 C# 匹配：`/[^\w]NAME\s*\(/` ——匹配前面非常规标识符字符的方法名后跟 `(`。

**实际决定**：使用宽松匹配 `new RegExp(\`\\b${escapeRegex(fn)}\\s*\\(\`)` 同时匹配 GDScript 的 `func name(` 和 C# 的 `void Name(`。`\b` 单词边界确保完整性，兼容两种语言。

**备选方案**：
- 根据文件扩展名分支 → 但 `function_exists` 不绑定特定文件，需要扫描全部内容
- 保留原逻辑不变 → D13/D14 断言永久失败，不可接受

### D3: C# `extends_type` 修复

**选择**：在原 GDScript 的 `\bextends\s+TYPE\b` 检测后追加 C# 继承检测 `class\s+\w+\s*:\s*TYPE\b`。两个模式之一匹配即通过。

**原因**：C# Godot 脚本中使用 `public partial class Foo : CharacterBody2D` 继承，与 GDScript 的 `extends CharacterBody2D` 完全不同。但两个模式应并行检测，因为场景可能同时包含 GDScript 和 C# 代码。

### D4: 场景计数统一

**选择**：更新 AGENTS.md 中场景数为 "8 基本"（含 B08），bench.config.yaml 保持不变。

**原因**：B08 已经存在于配置文件中，代码和测试都已适配 26 个场景。只需要文档更新。

## Risks / Trade-offs

- **[Risk] Fixture 文件覆盖项目已有文件**：如果 fixture 中的文件与项目模板文件名冲突，`cpSync` 会覆盖。→ Mitigation：fixture 文件命名与场景的 prompt 期望一致，不应有冲突。B07 和 B08 的 fixture 文件名是唯一的。
- **[Risk] git reset 未追踪 fixture 文件**：`resetProject` 使用 `git checkout .` 和 `git clean -fd`。如果 fixture 在 git reset 后重新应用，需确认 git 状态。→ Mitigation：在 `cpSync` fixture 后进行 `git add . && git commit` 将 fixture 纳入基准 commit。
- **[Trade-off] C# 方法名匹配更宽松**：使用 `\bNAME\s*\(` 可能误匹配注释或字符串中的内容。→ 接受此风险，因为场景控制 prompt 输出格式。

## Migration Plan

无需迁移——此变更修复现有 bug，不影响 API 或配置格式。

## Open Questions

- B08 目前位于 `scenarios/basic/` 目录（8个 basic），是否应移至 `scenarios/domain/`？保留在 basic 更简单。
