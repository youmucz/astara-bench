## Why

astara-opencode (Studios) 拥有 21 个 hook 实现、39 个 agent、60+ 个 skill 和丰富的 Godot 开发规范文档，但目前 **零测试覆盖**（`package.json` 中 `"test": "echo \"No tests yet\" && exit 0"`）。没有任何手段验证：

1. **框架本身的正确性**：hook 逻辑变更是否会引入回归？agent/skill 定义是否结构完整？交叉引用是否断裂？
2. **部署后的实际效果**：部署了 Studios 的游戏项目是否真的比未部署时产出更高质量的代码？

同时，公开的 coding agent 基准（SWE-bench、Aider Polyglot、TerminalBench）全部面向 Python Web 项目或通用编程练习，**没有任何一个覆盖 Godot/GDScript/C# 游戏开发领域**，无法直接使用。

需要一套自建的基准测试套件，在真实 Godot 开发环境中（通过 opencode SDK 集成）运行，验证 Studios 框架对 Godot 游戏项目的实际增量价值。

## What Changes

- **新增独立仓库 `astara-bench`**：可一键部署到任意 Godot 游戏项目目录的基准测试 CLI 工具
- **新增 25 个测试场景**（YAML 声明式）：7 个基本基准 + 14 个 Godot 领域基准（含 2 个 C# 场景）+ 4 个负面场景，每个场景包含 prompt + 多层断言
- **新增断言库**：命名规范检查、架构规则验证、禁止模式检测、Godot 特有规则、hook 行为模拟
- **新增 opencode SDK 集成 Runner**：通过 `@opencode-ai/sdk` 在真实 Godot 项目中运行基准测试，覆盖 Studios 全三层能力（hooks + agents + MCP）
- **新增 Godot 测试项目模板**：bare 模板，运行时通过 `bunx astara-studios install` 或 `--studios-source` 部署 Studios
- **新增 A/B 对比**：部署 Studios vs 裸 opencode，量化 Studios 全栈增量价值
- **新增基线管理**：`baseline.json` 记录历史分数，CI 检测 >5% 退化时告警

## Capabilities

### New Capabilities

- `bench-scenarios`: 基准测试场景定义体系 —— YAML 声明式场景格式、25 个测试场景（7 基本 + 14 领域含 2 个 C# + 4 负面）、prompt + 三层断言结构
- `bench-assertions`: 自定义断言库 —— 命名规范断言、架构规则断言、禁止模式检测、Godot 特有规则检查、hook 行为模拟断言，所有断言直接检查文件系统中的实际文件
- `bench-runner`: 基准运行器 —— opencode SDK 集成、目标游戏项目管理、A/B 对比（Studios 部署 vs 裸 opencode）、多次运行取平均、基线回归检测、结构化报告输出、支持 `--project-dir` 指定任意游戏项目
- `bench-ci`: CI 集成 —— 分层执行策略（hook 单测 <1min / 结构验证 <30s / 基准回归 5-15min）、PR 阻断策略、退化告警

### Modified Capabilities

（无已有 capability 需要修改）

## Impact

- **新增仓库**：`astara-bench` 独立仓库，包含 TypeScript CLI + YAML 场景 + 断言库 + Godot 测试项目模板
- **依赖变更**：`@opencode-ai/sdk`、`yaml`、`astara-studios`（用于 Studios 部署）
- **使用方式**：`npx astara-bench --project-dir /path/to/game` 或 `npx astara-bench --fixture --mode compare`
- **不破坏现有功能**：基准套件完全独立于 Studios 运行时，不影响 plugin 加载和 agent 行为
