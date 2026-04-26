## Why

astara-bench 目前仅有 26 个 Godot 游戏开发领域场景，缺少对 Agent 通用编程能力的基准评估。业界标准的 SWE-bench（2,294 个真实 GitHub issue 修复任务）在 Python/Web 领域已被广泛采用，但完全独立运行。将 SWE-bench 集成到 astara-bench 中可以形成"领域专精 + 通用能力"的双轨评估体系，让 benchmark 既能衡量 Godot 工程纪律性，也能衡量 Agent 解决真实编码问题的通用能力。

## What Changes

### Phase 1 — 通用 YAML 场景

- 新增 `scenarios/general/` 目录，包含 10 个 Python 编程场景（G01-G10），采用 YAML 格式，覆盖 bug 修复、测试编写、重构、错误处理等核心技能
- 新增 `fixtures/python-project/` Python 测试 fixture（含 pytest 配置和 10 个预置任务子目录）
- 新增 `test_exec` 断言类型，支持运行 shell 命令并检查退出码
- 扩展 `Scenario.category` 类型支持 `"general"`
- 扩展断言库新增 Python 反模式检测（bare except、mutable default arg、PEP8 import 等）

### Phase 2 — 原生 SWE-bench 评估

- 新增 `src/runners/swebench-runner.ts` 原生 SWE-bench 评估引擎
- 新增 `swebench-instances/` SWE-bench 实例缓存（SWE-bench Lite，534 个实例元数据）
- 支持 Docker 容器化测试隔离，遵循 SWE-bench 官方 FAIL_TO_PASS / PASS_TO_PASS 评估标准
- 新增 `--preset swebench` CLI 选项，与 `--category` 正交
- SWE-bench 结果使用独立 `resolve_rate` 指标在报告中展示

## Capabilities

### New Capabilities

- `general-scenarios`: 定义通用编程基准场景，包含 Python 专有断言和 `test_exec` 评估
- `swebench-native`: 原生 SWE-bench 评估集成，包含实例加载、repo 管理、Docker 测试隔离和 resolve_rate 评分

### Modified Capabilities

- `bench-runner`: `Scenario.category` 类型扩展至 `"general"`；新增 `test_exec` 确定性断言处理；`runScenario` 和 `evaluateScenario` 需兼容无 fixture 的 general 场景
- `bench-assertions`: 新增 Python 专有断言规则（bare-except、mutable-default-arg、pep8-import-order）；`function_exists` 扩展匹配 Python `def` 语法

## Impact

- **无破坏性变更**：现有 26 个 Godot 场景、断言系统、CLI 接口全部保持兼容
- `src/runners/bench-runner.ts`：扩展断言 evaluator，新增 `test_exec` case
- `src/runners/swebench-runner.ts`：新增 SWE-bench 原生评估运行器
- `src/assertions/patterns.ts`：新增 Python 专有规则
- `src/assertions/naming.ts`：新增 PEP8 检测
- `src/cli.ts`：新增 `--preset` 选项（godot/swebench/all），`--category` help text 更新
- `bench.config.yaml`：新增 `swebench` 配置段 + `scenario_dirs` 新增 `scenarios/general` + general 场景权重
- `swebench-instances/`：新增 SWE-bench Lite 实例 JSON 缓存
- 新增依赖：Phase 1 需 Python + pytest；Phase 2 需 Docker + git + swebench Python 包
