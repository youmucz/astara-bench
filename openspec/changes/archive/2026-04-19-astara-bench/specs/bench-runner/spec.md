## ADDED Requirements

### Requirement: opencode SDK 集成

Runner SHALL 通过 `@opencode-ai/sdk` 与两个 opencode server 交互。Baseline server 运行在裸 Godot 项目中，Studios server 运行在 Studios 部署的 Godot 项目中。支持两种启动方式：通过 `child_process.spawn` 在项目目录中启动 `opencode serve`，或通过 `createOpencodeClient()` 连接已运行的 server。

#### Scenario: 自动启动双 server

- **WHEN** runner 配置 `server_mode: auto`
- **THEN** runner SHALL 在 baseline 项目目录中 spawn `opencode serve --port 4097`，在 studios 项目目录中 spawn `opencode serve --port 4098`

#### Scenario: 连接已有 server

- **WHEN** runner 配置 `server_mode: connect` 和 `baseline_url` / `studios_url`
- **THEN** runner SHALL 通过 `createOpencodeClient({ baseUrl })` 分别连接两个已有 server

#### Scenario: Server 健康检查

- **WHEN** server 启动或连接后
- **THEN** runner SHALL 调用 `client.global.health()` 验证两个 server 均可用

### Requirement: Godot 测试项目管理

Runner SHALL 管理两份 Godot 测试项目：baseline（无 Studios 配置）和 studios（含 Studios 全套配置）。每个场景执行前 SHALL 重置项目到初始状态。

#### Scenario: 项目初始化（fixture 模式）

- **WHEN** runner 使用 `--fixture` 参数（或默认模式，无 `--project-dir`）
- **THEN** runner SHALL 从 fixtures/godot-project-bare/ 复制两份项目，在 studios 副本中部署 Studios（方式由 `--studios-source` 决定）

#### Scenario: 项目初始化（指定游戏项目模式）

- **WHEN** runner 使用 `--project-dir /path/to/game`
- **THEN** runner SHALL 复制该游戏项目为两份，从 baseline 副本中移除 Studios 配置（AGENTS.md、.opencode/），studios 副本保留原有配置

#### Scenario: 项目重置

- **WHEN** 一个场景执行完毕
- **THEN** runner SHALL 通过 `git checkout .` + `git clean -fd` 重置两个项目到初始 commit 状态

#### Scenario: Baseline 项目无 Studios

- **WHEN** runner 初始化 baseline 项目
- **THEN** baseline 项目 SHALL 不包含 AGENTS.md、.opencode/、opencode.json 中的 hooks 和 MCP 配置

#### Scenario: Studios 项目含完整 Studios

- **WHEN** runner 初始化 studios 项目
- **THEN** studios 项目 SHALL 包含 Studios 配置。部署方式由 `--studios-source` 参数决定：
  - `npm`（默认）：通过 `bunx astara-studios install` 从 npm 安装
  - 本地路径：从指定路径的 astara-opencode 源码直接部署（.opencode/ symlink + AGENTS.md copy + opencode.json copy）
  - `--project-dir` 模式：保留项目原有 Studios 配置

### Requirement: Session 管理

Runner SHALL 为每个场景创建独立的 opencode session，发送 prompt，等待响应完成，然后收集文件变更。场景评估完毕后 SHALL 删除 session。

#### Scenario: 创建 session 并发送 prompt

- **WHEN** runner 执行一个场景
- **THEN** runner SHALL 在两个 server 各调用 `client.session.create()` 创建 session，然后 `client.session.prompt()` 发送场景 prompt

#### Scenario: 等待响应完成

- **WHEN** prompt 发送后
- **THEN** runner SHALL 等待 `session.prompt()` 返回完整的 `AssistantMessage`

#### Scenario: 收集文件变更

- **WHEN** session 完成后
- **THEN** runner SHALL 调用 `client.session.diff()` 获取所有文件变更列表，然后通过 Node.js `fs.readFileSync()` 直接读取项目目录中的文件内容

#### Scenario: Session 清理

- **WHEN** 场景评估完毕后
- **THEN** runner SHALL 调用 `client.session.delete()` 删除 session，避免数据积累

### Requirement: A/B 对比运行

Runner SHALL 支持两组对比运行：Baseline（裸 opencode，无 Studios 配置）和 Studios（完整 Studios 部署）。两组使用相同的用户 prompt，但在不同的 Godot 项目副本中运行。

#### Scenario: Baseline 组执行

- **WHEN** 运行 `bench --mode baseline`
- **THEN** runner SHALL 仅在 baseline Godot 项目中通过 opencode 发送 prompt（无 Studios 配置）

#### Scenario: Studios 组执行

- **WHEN** 运行 `bench --mode studios`
- **THEN** runner SHALL 仅在 studios Godot 项目中通过 opencode 发送 prompt（含 Studios 全套）

#### Scenario: A/B 对比输出

- **WHEN** 运行 `bench --mode compare`
- **THEN** runner SHALL 在 baseline 和 studios 项目中分别执行相同场景，输出差值报告

### Requirement: 多次运行取平均

Runner SHALL 支持对每个场景运行 N 次（默认 N=5），报告每个场景的平均分数和标准差。每次运行前 SHALL 重置项目状态。

#### Scenario: 多次运行聚合

- **WHEN** 配置 `runs: 5` 且某场景 5 次分数为 [0.8, 0.9, 0.7, 0.85, 0.8]
- **THEN** 报告 SHALL 显示 avg=0.81, std=0.07

### Requirement: 结果获取

Runner SHALL 通过 opencode SDK 获取文件变更列表，通过 Node.js `fs` 直接读取文件内容。统一为 `BenchResult` 结构。

#### Scenario: 通过 SDK diff 获取变更列表

- **WHEN** session 执行完毕
- **THEN** runner SHALL 调用 `client.session.diff()` 获取 `FileDiff[]`，确定新建、修改、删除的文件

#### Scenario: 通过 fs 直接读取文件内容

- **WHEN** 断言需要检查文件内容
- **THEN** runner SHALL 优先使用 `fs.readFileSync()` 直接读取测试项目目录中的文件（快速、无网络开销）。`client.file.read()` 仅在特殊情况下作为备选

#### Scenario: 获取 tool call 类型

- **WHEN** 断言需要判断操作类型（Write vs Edit）
- **THEN** runner SHALL 从 session message parts 中的 tool call 信息提取操作类型

#### Scenario: 空响应处理

- **WHEN** opencode session 完成但未产生任何文件变更
- **THEN** runner SHALL 标记该场景为 EMPTY_RESPONSE，分数记为 0

### Requirement: 基线管理

Runner SHALL 维护 `baseline.json` 文件记录历史基线分数，包含每个场景的平均分、标准差、最小值、最大值。支持 `--update-baseline` 命令更新基线。

#### Scenario: 基线对比

- **WHEN** 运行 `bench --compare baseline.json` 且某场景当前分数低于基线 5% 以上
- **THEN** 报告 SHALL 标记该场景为 REGRESSED

#### Scenario: 基线更新

- **WHEN** 运行 `bench --update-baseline`
- **THEN** baseline.json SHALL 被当前运行结果覆盖

### Requirement: 结构化报告输出

Runner SHALL 生成两种格式的报告：JSON（机器可读，包含完整断言详情）和 Markdown（人类可读，包含分数表格和 A/B 对比摘要）。

#### Scenario: JSON 报告生成

- **WHEN** bench 执行完毕
- **THEN** `reports/latest.json` SHALL 包含每个场景的详细分数、通过/失败断言列表、文件变更摘要

#### Scenario: Markdown 报告生成

- **WHEN** bench 执行完毕
- **THEN** `reports/latest.md` SHALL 包含分数汇总表格、退化场景列表、Studios vs Baseline 差值

### Requirement: CLI 入口

Runner SHALL 提供 `bench` CLI 命令，支持以下参数：`--category`（basic/domain/negative/all）、`--mode`（baseline/studios/compare）、`--runs`（次数）、`--compare`（基线文件路径）、`--update-baseline`、`--scenario`（指定场景 ID）、`--project-dir`（指定已有 Godot 游戏项目目录，默认使用 fixture）、`--studios-source`（Studios 来源：`npm` 或本地路径，默认 `npm`）、`--baseline-url`（baseline opencode server 地址）、`--studios-url`（studios opencode server 地址）。

#### Scenario: 运行所有场景

- **WHEN** 执行 `bench --category all --mode compare --runs 3`
- **THEN** runner SHALL 执行全部 25 个场景，每个 3 次，输出 A/B 对比报告

#### Scenario: 运行单个场景

- **WHEN** 执行 `bench --scenario B01`
- **THEN** runner SHALL 仅执行 B01 场景

### Requirement: 错误处理与边界条件

Runner SHALL 优雅处理以下边界情况：opencode server 无法启动（终止并报错）、session 超时（默认 5 分钟，标记 TIMEOUT）、文件读取失败（标记 READ_ERROR）、断言类型不存在（WARNING 并跳过）、Godot 项目重置失败（终止该场景）、端口冲突（自动尝试下一个可用端口）。

#### Scenario: Session 超时

- **WHEN** opencode session 执行超过 5 分钟未完成
- **THEN** runner SHALL 调用 `client.session.abort()` 中止 session，标记该场景为 TIMEOUT

#### Scenario: 断言类型不存在

- **WHEN** 场景 YAML 引用了 `type: nonexistent_check` 断言
- **THEN** runner SHALL 报告 WARNING 并跳过该断言，其余断言正常评估

#### Scenario: 端口冲突

- **WHEN** 指定的端口已被占用
- **THEN** runner SHALL 自动尝试下一个可用端口（+1），并在配置中记录实际使用的端口

### Requirement: 统计显著性退化检测

退化检测 SHALL 基于标准差而非固定百分比：当 `(baseline_avg - current_avg) > 1.5 * baseline_std` 时标记为 REGRESSED。当 baseline_std 为 0 或极小时，回退到固定 5% 阈值。

#### Scenario: 统计显著退化

- **WHEN** baseline_avg=0.85, baseline_std=0.06, current_avg=0.70
- **THEN** 退化量 0.15 > 1.5 * 0.06 = 0.09，SHALL 标记为 REGRESSED

#### Scenario: 噪声范围内波动不标记

- **WHEN** baseline_avg=0.85, baseline_std=0.06, current_avg=0.80
- **THEN** 退化量 0.05 < 1.5 * 0.06 = 0.09，SHALL NOT 标记为 REGRESSED
