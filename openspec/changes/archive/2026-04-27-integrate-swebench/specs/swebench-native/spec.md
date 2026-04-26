## ADDED Requirements

### Requirement: SWE-bench 实例缓存

系统 SHALL 支持从 `swebench-instances/instances.json` 加载 SWE-bench 实例元数据。每个实例 MUST 包含 `instance_id`、`repo`、`base_commit`、`problem_statement`、`patch`、`test_patch` 字段。

#### Scenario: 加载 SWE-bench Lite 实例

- **WHEN** 系统启动 `--preset swebench`
- **THEN** SHALL 加载 `swebench-instances/instances.json` 中的全部实例

#### Scenario: 实例格式验证

- **WHEN** 实例 JSON 缺少 `instance_id` 或 `repo` 字段
- **THEN** 系统 SHALL 跳过该实例并输出 warning

### Requirement: SWE-bench Repo 管理

系统 SHALL 在 `swebench-repos/` 目录下缓存已 checkout 的 repo。每个 repo SHALL 以 `owner__repo` 命名目录。Repo 初始化 MUST 使用 `git clone --bare` + `git worktree` 模式以节省磁盘空间。

#### Scenario: 首次 checkout

- **WHEN** 目标 repo 未在 `swebench-repos/` 中缓存
- **THEN** 系统 SHALL clone 对应 GitHub repo 到缓存目录

#### Scenario: 已缓存 repo

- **WHEN** `swebench-repos/django__django` 已存在
- **THEN** 系统 SHALL 跳过重新 clone，直接 `git fetch` 更新

### Requirement: SWE-bench 评估流程

评估单个 SWE-bench 实例的流程 SHALL 为：
1. checkout base_commit
2. apply test_patch
3. 运行测试确认 FAIL_TO_PASS 测试 fail
4. checkout base_commit（重置）
5. 将 problem_statement 发送至 opencode agent
6. 收集 agent 产生的 patch/diff
7. apply agent 的 patch
8. 运行测试套件
9. 计算 resolve_rate = passed_F2P / total_F2P × PASS_TO_PASS 保留率

#### Scenario: 完全解决

- **WHEN** Agent patch 使全部 FAIL_TO_PASS 测试通过且全部 PASS_TO_PASS 测试保持通过
- **THEN** 该实例 resolve_rate SHALL 为 1.0

#### Scenario: 部分解决

- **WHEN** Agent patch 使 3/5 FAIL_TO_PASS 测试通过
- **THEN** 该实例 resolve_rate SHALL 为 0.6

### Requirement: Docker 测试隔离

SWE-bench 测试执行 SHALL 在 Docker 容器中进行。每个 repo 使用其预定义的 Dockerfile。容器 MUST 在测试完成后自动销毁。

#### Scenario: Docker 不可用

- **WHEN** 宿主机未安装 Docker
- **THEN** 系统 SHALL 输出错误信息并跳过 Docker 隔离测试，降级为本地直接测试执行（若可用）

### Requirement: SWE-bench 报告

SWE-bench 评估结果 SHALL 在报告中使用独立 section `## SWE-bench Results` 展示。指标 MUST 包含：总 resolve_rate、每个 repo 的 resolve_rate、平均执行时间。

#### Scenario: 多 repo 报告

- **WHEN** 运行 20 个实例横跨 3 个 repo
- **THEN** 报告 SHALL 展示每个 repo 的独立 resolve_rate 和综合 resolve_rate
