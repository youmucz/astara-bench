## ADDED Requirements

### Requirement: 分层 CI 执行

CI SHALL 分三层执行：Layer 0（Hook 单测，<1min）、Layer 1（结构验证，<30s）、Layer 2（基准回归，5-15min）。Layer 0 和 Layer 1 每次 PR 必须运行且阻断合并，Layer 2 仅在 PR 带有 `run-bench` label 时运行且不阻断合并。

#### Scenario: Layer 0 阻断 PR

- **WHEN** PR 修改了 `src/hooks/` 下的文件且 hook 单测失败
- **THEN** CI SHALL 阻断该 PR 合并

#### Scenario: Layer 1 阻断 PR

- **WHEN** PR 修改了 `.opencode/` 下的文件且结构验证失败（如 agent 引用了不存在的 context file）
- **THEN** CI SHALL 阻断该 PR 合并

#### Scenario: Layer 2 按需触发

- **WHEN** PR 带有 `run-bench` label
- **THEN** CI SHALL 执行基准回归测试并生成评论报告

#### Scenario: Layer 2 不阻断

- **WHEN** Layer 2 基准回归检测到统计显著退化（`(baseline - current) > 1.5 * std`）
- **THEN** CI SHALL 在 PR 中发布 WARNING 评论，但不阻断合并

### Requirement: Layer 2 CI 环境准备

Layer 2 运行前 SHALL 准备以下环境：安装 opencode、配置 LLM API key、准备 Godot 测试项目模板、启动双 opencode server。

#### Scenario: CI 环境准备

- **WHEN** Layer 2 workflow 开始执行
- **THEN** CI SHALL 执行以下步骤：
  1. `npm install -g opencode-ai` 安装 opencode
  2. 从 GitHub Secrets 读取 LLM API key 并配置环境变量
  3. 从 fixtures/godot-project-bare/ 复制两份项目
  4. 在 studios 副本中运行 `bunx astara-studios install` 部署 Studios
  5. 在两个项目目录中分别启动 `opencode serve`
  6. 验证两个 server 健康检查通过

#### Scenario: API key 配置

- **WHEN** Layer 2 需要调用 LLM API
- **THEN** API key SHALL 从 GitHub Secrets 读取，不硬编码在 workflow 文件中

### Requirement: Hook 单测生成

每个 Studios hook 实现 SHALL 有对应的 Bun 单测文件，覆盖该 hook 的核心输入/输出逻辑。每个 hook 至少包含 3 个测试用例（正面、负面、边界）。

#### Scenario: scene-file-guard 单测覆盖

- **WHEN** 运行 `bun test tests/unit/hooks/scene-file-guard.test.ts`
- **THEN** SHALL 包含至少 3 个 case：编辑 .gd 放行、编辑 .tscn 阻断、编辑 .tres 阻断

#### Scenario: comment-checker BDD 豁免测试

- **WHEN** comment-checker 输入包含 `# GIVEN some condition`
- **THEN** SHALL NOT 触发告警

### Requirement: 结构验证测试

CI SHALL 验证所有 agent 和 skill 定义的完整性：YAML frontmatter 格式正确、引用的 context files 存在、agent-roster.md 包含所有 agent、skills-reference.md 包含所有 skill、AGENTS.md 中的 @引用 文件存在。

#### Scenario: Agent 引用缺失检测

- **WHEN** agent A 的 context_files 引用了 `@.opencode/references/nonexistent.md`
- **THEN** 结构验证 SHALL 报告错误

#### Scenario: Agent roster 完整性

- **WHEN** `.opencode/agents/` 下有 39 个 agent 文件但 `agent-roster.md` 只列出 38 个
- **THEN** 结构验证 SHALL 报告缺失的 agent

### Requirement: 基准回归报告评论

当 Layer 2 运行完毕时，CI SHALL 在 PR 中发布结构化的基准回归评论，包含：分数汇总表格、退化场景列表（>5% 下降的标红）、Studios vs Baseline 对比数据。

#### Scenario: 报告评论发布

- **WHEN** Layer 2 执行完毕
- **THEN** CI SHALL 在 PR 中发布一条包含 Markdown 表格的评论

#### Scenario: CI 清理

- **WHEN** Layer 2 执行完毕（无论成功或失败）
- **THEN** CI SHALL 终止两个 opencode server 进程并清理临时项目目录

### Requirement: 断言与 Hook 实现一致性检查

CI Layer 1 结构验证 SHALL 包含一项额外检查：断言库中定义的命名规则（如 GDScript 文件名模式）SHALL 与 Studios 源码中对应 hook 实现（如 `asset-naming-enforcer.ts`）中的正则保持一致。发现不一致时 SHALL 报告 WARNING。

#### Scenario: 命名规则与 hook 一致性

- **WHEN** 断言库定义 GDScript 文件名为 `snake_case.gd`，而 `asset-naming-enforcer.ts` 的 `.gd` pattern 也匹配 `snake_case.gd`
- **THEN** 一致性检查 SHALL PASS

#### Scenario: 命名规则与 hook 不一致

- **WHEN** 断言库定义 GDScript 文件名为 `PascalCase.gd`，但 `asset-naming-enforcer.ts` 的 `.gd` pattern 匹配 `snake_case.gd`
- **THEN** 一致性检查 SHALL 报告 INCONSISTENT WARNING
