## Context

astara-opencode 当前拥有 21 个 TypeScript hook 实现、39 个 agent 定义（Markdown + YAML frontmatter）、60+ 个 skill 定义和 35 个 reference 文档。但这些资产目前完全没有自动化测试——`package.json` 的 test 脚本是一个空壳。

Studios 框架的两个核心价值主张无法被量化验证：
1. **框架质量**：hook 逻辑是否正确、agent 定义是否完整、文档引用是否断裂
2. **部署效果**：部署 Studios 后，AI agent 在 Godot 项目中是否真的产出更高质量的代码

现有公开基准（SWE-bench: Python Web、Aider Polyglot: 通用编程、TerminalBench: CLI 任务）均不覆盖 Godot/GDScript/C# 游戏开发领域，无法直接使用。

## Goals / Non-Goals

**Goals:**

- 建立一套自建的基准测试套件 (`astara-bench`)，在真实 Godot 开发环境中运行
- 覆盖 Studios 框架在 Godot 项目中的增量效果：部署 Studios vs 裸 opencode 对比
- 通过 25 个声明式场景覆盖从文件操作到游戏系统的完整链路（含 C# 场景和负面场景）
- 通过 opencode SDK/Server 集成，在真实的 opencode runtime 中运行测试（hooks、MCP、skills 全部生效）
- CI 分层执行：确定性测试阻断 PR，基准测试在真实 Godot 项目环境中运行

**Non-Goals:**

- 不做隔离的 API 直接调用测试（不在沙箱中模拟，而是用真实开发环境）
- 不替代 Godot 引擎的单元测试
- 不做性能基准（FPS、内存占用等运行时指标）
- 不覆盖多 Agent 协作场景（Phase 2 考虑）
- 不做跨引擎对比（Unity/Unreal）
- 不构建公开排行榜

## Decisions

### D1: 自建 Runner vs 使用 Promptfoo

```
┌──────────────────────┐  ┌──────────────────────┐
│ Option A: 自建       │  │ Option B: Promptfoo  │
│ Bun test + 自定义    │  │ 作为底层 runner      │
│ 断言库               │  │ 自定义 provider      │
├──────────────────────┤  ├──────────────────────┤
│ + 完全控制执行流程   │  │ + CI/报告开箱即用    │
│ + 可模拟 hook 行为   │  │ - hook 模拟需适配层  │
│ + SDK 集成灵活       │  │ - 无法集成 opencode  │
│ + 文件系统断言灵活   │  │   SDK 做环境测试     │
│ - 需要自建报告       │  │ + 声明式配置成熟     │
│ - 需要 @opencode-   │  │ - 依赖 promptfoo 更新│
│   ai/sdk 依赖       │  │                      │
└──────────────────────┘  └──────────────────────┘
```

**Decision: Option A（自建）+ 借鉴 Promptfoo 的 YAML 配置格式**

原因：astara-bench 需要通过 opencode SDK 在真实 Godot 项目环境中运行测试，这完全超出了 Promptfoo 的设计范围。Promptfoo 聚焦于 LLM 输出文本评估，而我们需要的是「在完整 opencode runtime 环境中验证 Studios 对文件系统的行为效果」。

但借鉴 Promptfoo 的声明式场景配置格式（YAML + assertions 数组），降低场景编写门槛。

### D2: 断言深度 — 正则 vs AST 解析

```
┌──────────────────────┐  ┌──────────────────────┐
│ Option A: 纯正则     │  │ Option B: AST 解析   │
│ 实现快、零依赖       │  │ 更精确、更健壮       │
├──────────────────────┤  ├──────────────────────┤
│ + 简单直接           │  │ + 精确匹配语法结构   │
│ + 无需 parser 依赖   │  │ + 不受格式变化影响   │
│ - 误报率高           │  │ - 需要 GDScript/C#   │
│ - 难以处理嵌套结构   │  │   parser 依赖        │
└──────────────────────┘  │ - 实现复杂度高       │
                          └──────────────────────┘
```

**Decision: 分层策略 — Layer 0 纯正则 + Layer 1 结构化正则 + Layer 2 可选 AST**

- Layer 0（确定性）：纯正则匹配文件名、class_name、extends、信号声明等
- Layer 1（结构化）：使用缩进感知的多行正则提取函数定义、变量声明、嵌套结构
- Layer 2（可选增强）：对 GDScript 使用 Tree-sitter（已有 `tree-sitter-gdscript` 可用），对 C# 使用正则（C# 语法更规整）

### D3: 场景分类 — 基本基准 + 领域基准 + 负面场景

```
基本基准 (7 个)                     领域基准 (14 个)
├── B01 文件命名规范               ├── D01 玩家控制器 (GDScript)
├── B02 安全编辑                    ├── D02 敌人 AI
├── B03 代码质量                    ├── D03 生命值组件
├── B04 目录结构                    ├── D04 信号通信
├── B05 禁止模式                    ├── D05 状态机
├── B06 跨文件引用                  ├── D06 全局事件总线
└── B07 已有代码尊重                ├── D07 UI/HUD
                                    ├── D08 场景组合
负面场景 (4 个)                     ├── D09 Resource 数据类
├── N01 场景文件编辑拒绝            ├── D10 背包系统
├── N02 文件覆盖拒绝                ├── D11 音频管理器
├── N03 BDD 注释保留                ├── D12 存档系统
└── N04 硬编码路径拒绝              ├── D13 C# 玩家控制器
                                    └── D14 C# 信号模式
```

**Decision: 三类设计**

基本基准验证 Studios 的通用能力（hook 防护、命名约束、代码质量），不依赖 Godot 领域知识。领域基准验证 Godot 特有的模式（信号、组件、状态机、Autoload 等）。负面场景验证 hook 拦截和安全防护行为。三类可独立运行（`--category basic/domain/negative/all`）。

### D4: Runner 架构 — opencode SDK 集成 + 双 Server

```
┌──────────────────────────────────────────────────────────────┐
│                    Runner 执行流程                             │
│                                                              │
│  bench.config.yaml                                           │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐                                                │
│  │ 环境准备 │─── 从 fixtures 复制两份 Godot 测试项目           │
│  │          │    baseline/ (裸) + studios/ (Studios 部署)     │
│  └──────────┘                                                │
│       │                                                      │
│       ├─────────────────────┬───────────────────────┐        │
│       ▼                     ▼                       │        │
│  ┌──────────────┐   ┌──────────────┐                │        │
│  │ Server A     │   │ Server B     │                │        │
│  │ port 4097    │   │ port 4098    │                │        │
│  │ cwd: baseline│   │ cwd: studios │                │        │
│  │ 无 Studios   │   │ 含 Studios   │                │        │
│  └──────┬───────┘   └──────┬───────┘                │        │
│         │                  │                         │        │
│         │  SDK clients     │                         │        │
│         ▼                  ▼                         │        │
│  ┌──────────────────────────────────────────┐        │        │
│  │           bench-runner.ts                 │        │        │
│  │  for each scenario:                       │        │        │
│  │    1. 在两个 server 各创建 session        │        │        │
│  │    2. 发送相同 prompt                     │        │        │
│  │    3. 等待完成                            │        │        │
│  │    4. 通过 SDK diff + fs 读取收集结果     │        │        │
│  │    5. 评估断言                            │        │        │
│  │    6. git 重置两个项目                    │        │        │
│  │    7. 聚合分数                            │        │        │
│  └──────────────────────────────────────────┘        │        │
│                       │                                │        │
│                       ▼                                │        │
│               ┌──────────────┐                         │        │
│               │ 报告生成     │                         │        │
│               └──────────────┘                         │        │
└──────────────────────────────────────────────────────────────┘
```

**Decision: 双 opencode Server 并行 + SDK 集成**

原因：
1. 用户要求必须在真实开发环境中测试，不使用隔离模式
2. opencode 提供 SDK (`@opencode-ai/sdk`) + Server (`opencode serve`) 的完整可编程接口
3. 通过 SDK 可以：创建 session、发送 prompt、获取响应、检查文件状态、监听事件
4. 真实环境中 hooks、MCP、skills 全部生效，测试覆盖 Studios 的所有三层能力
5. 双 Server 并行可实现 A/B 对比，互不干扰

实现方式：
1. 从 fixtures 复制 Godot 测试项目到临时目录（或使用 `--project-dir` 指定已有游戏项目）
2. 在 baseline 项目目录启动 `opencode serve --port 4097`（无 Studios 配置）
3. 在 studios 项目目录启动 `opencode serve --port 4098`（含 Studios 全套）
4. Runner 通过两个 `createOpencodeClient({ baseUrl })` 分别连接两个 server
5. 场景逐一执行：在两个 server 各创建 session、发送相同 prompt、收集结果
6. 每个场景执行后通过 `git checkout .` + `git clean -fd` 重置两个项目
7. 断言库直接通过 Node.js `fs` 读取项目目录中的实际文件（比 SDK file.read 更快更简单）

**关键约束**：`opencode serve` 没有 `--dir` 参数，必须在目标项目目录中启动。Runner 使用 `child_process.spawn` 在对应目录中启动 server 进程。

**Studios 部署来源**（通过 `--studios-source` 参数控制）：
- `npm`（默认）：`bunx astara-studios install`，安装最新发布版
- 本地路径：`--studios-source /path/to/astara-opencode`，直接从本地源码部署，用于测试未发布的改动
- 省略：`--project-dir` 指定的项目可能已部署 Studios，直接使用

### D5: A/B 对比 — Studios 部署 vs 裸 opencode

```
┌─────────────────────────────────────────────────────────┐
│ Baseline 组 (裸 opencode)                                │
│ ├── Godot 测试项目 (无 AGENTS.md)                        │
│ ├── opencode.json (无 hooks、无 MCP)                     │
│ └── Agent 使用默认行为                                   │
│                                                         │
│ Studios 组 (完整 Studios 部署)                           │
│ ├── Godot 测试项目 (含 AGENTS.md)                        │
│ ├── .opencode/ (hooks + agents + skills + references)   │
│ ├── opencode.json (含 MCP 配置)                         │
│ └── Agent 遵循 Studios 规范                              │
│                                                         │
│ 差值 = Studios 全栈的增量价值 (Layer A+B+C)              │
└─────────────────────────────────────────────────────────┘
```

**Decision: 通过 Studios 部署/不部署切换实现 A/B 对比（覆盖全部三层）**

对比方式：
- **Baseline 组**：Godot 测试项目中无 Studios 配置（无 AGENTS.md、无 .opencode/、无 MCP）
- **Studios 组**：Godot 测试项目通过 Studios 部署 Studios 配置

Studios 部署方式取决于 `--studios-source` 参数：
- `--studios-source npm`（默认）：`bunx astara-studios install`
- `--studios-source /path/to/astara-opencode`：从本地源码部署
- 使用 `--project-dir` 时跳过部署，使用项目已有配置

这覆盖了 Studios 的全部三层能力：
```
Layer A: System Prompt 注入（AGENTS.md + references）  ← 覆盖
Layer B: Hook 运行时拦截（hooks runtime）              ← 覆盖
Layer C: Skills + MCP 工具                             ← 覆盖
```

**hook_simulation 断言的双组语义差异**：

| 断言类型           | Baseline 组（无 hooks）                    | Studios 组（hooks 实际运行）               |
|--------------------|--------------------------------------------|--------------------------------------------|
| scene-file-guard   | 模拟检查：agent 是否创建了 .tscn/.tres    | 实际验证：hooks 是否成功拦截了 .tscn/.tres |
| write-existing-guard | 模拟检查：agent 是否用 Write 覆盖文件   | 实际验证：hooks 是否成功阻止了覆盖         |
| comment-checker    | 模拟检查：代码是否含 AI 注释              | 实际验证：hooks 是否成功拦截了 AI 注释     |

在 Studios 组中，hook_simulation 断言验证的是 **hook 的实际拦截效果**（检查 agent 是否成功绕过了 hooks）。在 Baseline 组中，它验证的是 **agent 是否主动遵循了规范**（没有 hooks 帮助的情况下）。

### D6: CI 分层策略

```
┌─────────────────────────────────────────────────────────┐
│ Layer 0: Hook 单测                                      │
│ 触发: 每次 PR                                           │
│ 耗时: <1 min                                            │
│ 行为: 阻断 PR（任何测试失败）                            │
│ 覆盖: 21 个 hook 的输入/输出逻辑                        │
├─────────────────────────────────────────────────────────┤
│ Layer 1: 结构验证                                       │
│ 触发: 每次 PR                                           │
│ 耗时: <30 sec                                           │
│ 行为: 阻断 PR                                           │
│ 覆盖: agent/skill 定义 schema、交叉引用完整性            │
├─────────────────────────────────────────────────────────┤
│ Layer 2: 基准回归                                       │
│ 触发: 带 `run-bench` label 的 PR                        │
│ 耗时: 5-15 min                                         │
│ 行为: 生成报告，统计显著性退化告警（不阻断）            │
│ 阈值: (baseline - current) > 1.5 * std                  │
│ 覆盖: 25 个场景的完整 A/B 对比                          │
│ 环境: 需要 opencode + LLM API key + Godot 项目模板      │
└─────────────────────────────────────────────────────────┘
```

**Decision: 三层分离**

Layer 0 和 Layer 1 是确定性的（无 LLM 调用），每次 PR 都跑且阻断。Layer 2 需要在真实 opencode 环境中运行 LLM，只在需要时手动触发，生成报告不阻断。

Layer 2 的 CI 环境需求：
1. 安装 opencode（`npm install -g opencode-ai`）
2. 配置 LLM API key（从 GitHub Secrets 读取）
3. 准备 Godot 测试项目模板（从 fixtures 复制）
4. 启动两个 opencode server 实例（baseline + studios）
5. 执行场景后生成 PR 评论

### D7: 结果获取策略 — 直接文件系统检查

opencode SDK 返回结构化的 session 数据，但 Runner 主要通过 Node.js `fs` 直接读取测试项目目录中的文件来评估断言。

```
结果获取流程:
├── Step 1: 等待 session 完成
│   → SDK session.prompt() 返回 AssistantMessage
│
├── Step 2: 获取文件变更列表
│   → client.session.diff() 获取 FileDiff[]
│   → 确定哪些文件被创建、修改、删除
│
├── Step 3: 直接读取文件内容（主路径）
│   → Node.js fs.readFileSync() 直接读取项目目录中的文件
│   → 比 SDK file.read() 更快更简单，无网络开销
│   → SDK file.read() 仅在需要时作为备选
│
├── Step 4: 获取操作类型（判断 Write vs Edit）
│   → 通过 session messages 中的 tool call parts 判断
│   → SDK 返回的 Part[] 包含 tool_use 信息
│   → 用于 uses_edit_not_write 等断言
│
└── Step 5: 断言评估
    → 断言库直接检查文件内容
    → 支持 regex/AST 检查实际 .gd/.cs 文件
```

**Decision: 直接文件系统读取为主，SDK 辅助获取元数据**

原因：
1. 测试项目在本地磁盘上，直接 `fs` 读取最快最简单
2. `session.diff()` 提供文件变更列表，不需要逐个 `client.file.read()`
3. SDK 的 message parts 提供 tool call 记录，可判断操作类型（Write/Edit）
4. 场景执行后立即 `git checkout` 重置，需要在重置前读取

统一的数据结构：
```typescript
interface BenchResult {
  scenarioId: string;
  sessionId: string;
  group: "baseline" | "studios";
  files: {
    created: string[];
    modified: string[];
    deleted: string[];
    contents: Map<string, string>;
  };
  toolCalls: {
    type: "Write" | "Edit" | "Bash" | string;
    filePath?: string;
  }[];
  diff: FileDiff[];
  duration: number;
}
```

### D8: 两层权重体系

```
场景内权重 (intra-scenario)           场景间权重 (inter-scenario)
───────────────────────────────      ───────────────────────────────
每场景有三层断言，各自有权重:         场景之间有不同重要性:
  deterministic_weight: 0.5            B01=1.0, B02=1.5, ...
  structural_weight: 0.3               D01=1.0, D04=1.5, ...
  hook_simulation_weight: 0.2
                                       用于 category 总分聚合:
场景总分 = Σ(层分数 × 层权重)          category_avg = Σ(score × weight) / Σ(weight)
                                       overall = (basic_avg + domain_avg) / 2
```

**Decision: 分离两层权重**

场景 YAML 中定义 `weights` 段（场景内三层权重），`bench.config.yaml` 中定义 `scenario_weights` 映射（场景间权重）。两层独立配置、独立使用。

## Risks / Trade-offs

**[R1: LLM 输出不确定性] → 多次运行取平均**

LLM 对同一 prompt 的输出不一致。缓解：每个场景运行 N 次（默认 5），报告平均值 ± 标准差。使用 `baseline.json` 存储历史基线，CI 对比退化幅度而非绝对分数。

**[R2: 正则断言误报] → 白名单 + BDD 模式豁免**

纯正则可能将合法代码误判为违规。缓解：comment-checker 已有 BDD 模式豁免逻辑（`GIVEN/WHEN/THEN` 注释不被判定为 AI 风格）。每个断言支持 `whitelist` 配置。

**[R3: 场景覆盖不够] → 渐进式扩充**

25 个场景不可能覆盖所有 Godot 开发场景。缓解：场景设计为独立的 YAML 文件，可随时新增。

**[R4: 模型 API 成本] → 按需触发 + 缓存**

Layer 2 每次运行需在两个 opencode server 中各执行 ~25 场景 × N 次。缓解：CI 默认不运行 Layer 2，需手动加 label。结果按 model + prompt hash 缓存。

**[R5: opencode Server 稳定性] → 健康检查 + 超时重试**

opencode serve 进程可能崩溃或挂起。缓解：Runner 在启动 server 后通过 `client.global.health()` 验证可用性，设置合理的超时时间（单场景 5 分钟上限），server 崩溃时自动重启。

**[R6: 项目状态重置] → git-based 重置**

每个场景执行后会修改文件系统。缓解：使用 `git init` + `git add .` + `git commit` 在场景前快照，场景后 `git checkout .` + `git clean -fd` 重置。这比文件复制更快更可靠。

**[R7: Godot 测试项目维护] → 模板化 + 自动生成**

测试项目需要与 Godot 版本保持兼容。缓解：project.godot 保持最小化（仅包含必要配置），Godot 版本在 bench.config.yaml 中指定。

**[R8: 双 Server 端口冲突] → 动态端口分配**

两个 opencode server 需要不同端口。缓解：Runner 动态分配可用端口（从 4097 开始尝试），或在 bench.config.yaml 中明确配置两个端口。

**[R9: Studios 版本一致性] → --studios-source 参数控制**

Studios 效果可能因版本不同而异。缓解：`--studios-source` 参数让用户明确指定 Studios 来源。默认用 npm 最新发布版，开发测试时可指定本地源码路径。CI 中可根据需要选择。

## Open Questions

1. **N 值选择**：Layer 2 每场景默认运行 5 次是否足够？对于高方差场景是否需要自适应增加？
2. **Tree-sitter 依赖**：Phase 1 先用纯正则，Phase 2 是否引入 `tree-sitter-gdscript` 做 AST 级断言？
3. **多模型基准**：当前只测 Studios 配置的模型（glm-5.1 / MiniMax-M2.7），是否需要覆盖更多模型？
4. **opencode 版本锁定**：SDK API 是否稳定？是否需要锁定 opencode 版本？
5. **并行 vs 串行**：两组 opencode server 是否可以同时跑不同场景？还是需要串行避免资源竞争？

## Architecture Diagram

```
astara-bench/                          # 独立仓库
│
├── bench.config.yaml                  # 全局配置
│
├── scenarios/                          # 25 测试场景 (YAML)
│   ├── basic/                          #   基本基准 (7)
│   │   ├── B01-file-naming.yaml
│   │   ├── B02-safe-edit.yaml
│   │   ├── B03-code-quality.yaml
│   │   ├── B04-directory-structure.yaml
│   │   ├── B05-prohibited-patterns.yaml
│   │   ├── B06-cross-file-ref.yaml
│   │   └── B07-existing-code-respect.yaml
│   ├── domain/                         #   领域基准 (14, 含 2 C#)
│   │   ├── D01-player-controller.yaml
│   │   ├── D02-enemy-ai.yaml
│   │   ├── D03-health-component.yaml
│   │   ├── D04-signal-communication.yaml
│   │   ├── D05-state-machine.yaml
│   │   ├── D06-autoload-eventbus.yaml
│   │   ├── D07-ui-hud.yaml
│   │   ├── D08-scene-composition.yaml
│   │   ├── D09-resource-data.yaml
│   │   ├── D10-inventory-system.yaml
│   │   ├── D11-audio-manager.yaml
│   │   ├── D12-save-load.yaml
│   │   ├── D13-csharp-player-controller.yaml
│   │   └── D14-csharp-signal-pattern.yaml
│   └── negative/                       #   负面场景 (4)
│       ├── N01-scene-edit-reject.yaml
│       ├── N02-overwrite-reject.yaml
│       ├── N03-bdd-comment-preserve.yaml
│       └── N04-hardcoded-path-reject.yaml
│
├── src/                                # 源代码 (TypeScript)
│   ├── cli.ts                          #   CLI 入口
│   ├── assertions/                     #   断言库
│   │   ├── naming.ts                   #     命名规范
│   │   ├── architecture.ts             #     架构规则
│   │   ├── patterns.ts                 #     禁止模式
│   │   ├── godot-specific.ts           #     Godot 特有规则
│   │   └── hook-simulation.ts          #     Hook 行为验证
│   └── runners/                        #   运行器
│       ├── bench-runner.ts             #     主运行器
│       ├── opencode-client.ts          #     opencode SDK 封装（双 client）
│       ├── project-manager.ts          #     Godot 项目管理
│       └── reporter.ts                 #     报告生成
│
├── fixtures/                           # Godot 测试项目模板
│   ├── godot-project-bare/             #   空白项目（Baseline + Studios 副本的基础）
│   │   ├── project.godot
│   │   └── src/
│   ├── partial-player/                 #   B07 用的部分代码
│   └── buggy-code/                     #   反模式代码
│
├── baseline.json                       # 历史基线分数
└── reports/                            # 输出目录
    ├── latest.json
    └── latest.md
```

### 执行流程详解

```
Step 1: 环境准备
┌─────────────────────────────────────────────────────────┐
│ project-manager.ts                                       │
│                                                          │
│ 1. 复制 godot-project-bare/ → /tmp/bench-baseline/      │
│ 2. 复制 godot-project-bare/ → /tmp/bench-studios/       │
│ 3. 在 studios 副本中部署 Studios:                        │
│    - npm 模式: bunx astara-studios install               │
│    - 本地模式: --studios-source /path/to/astara-opencode │
│ 4. 两个项目均 git init + git add . + git commit          │
│                                                          │
│ 或者使用 --project-dir 指定已有游戏项目:                  │
│ 1. 复制已有项目 → /tmp/bench-baseline/ (移除 Studios)    │
│ 2. 复制已有项目 → /tmp/bench-studios/ (保留 Studios)     │
│ 3. 两个项目均 git init + git add . + git commit          │
└─────────────────────────────────────────────────────────┘

Step 2: 启动双 opencode server
┌──────────────────────────┐  ┌──────────────────────────┐
│ Baseline Server          │  │ Studios Server           │
│ cd /tmp/bench-baseline/  │  │ cd /tmp/bench-studios/   │
│ opencode serve --port    │  │ opencode serve --port    │
│   4097                   │  │   4098                   │
│ (无 Studios 配置)        │  │ (含 Studios 全套)        │
└──────────────────────────┘  └──────────────────────────┘
     ↑ child_process.spawn        ↑ child_process.spawn
     │ cwd: baseline dir          │ cwd: studios dir

Step 3: 逐场景执行
┌─────────────────────────────────────────────────────────┐
│ bench-runner.ts                                          │
│                                                          │
│ for each scenario in scenarios:                          │
│   1. 在两个 server 各创建 session                        │
│   2. 发送相同 prompt                                     │
│   3. 等待完成（超时 5min）                                │
│   4. session.diff() 获取变更列表                          │
│   5. fs.readFileSync() 读取文件内容                       │
│   6. 解析 message parts 获取 tool call 类型              │
│   7. 评估断言                                            │
│   8. git 重置两个项目                                     │
│   9. 删除 sessions                                       │
│  10. 聚合分数                                            │
└─────────────────────────────────────────────────────────┘

Step 4: 清理与报告
┌─────────────────────────────────────────────────────────┐
│ reporter.ts                                               │
│                                                           │
│ ├── reports/latest.json  (完整断言详情 + diff)            │
│ ├── reports/latest.md    (分数表格 + A/B 对比)            │
│ ├── baseline.json        (更新基线)                       │
│ └── 终止两个 opencode server 进程                         │
└─────────────────────────────────────────────────────────┘
```
