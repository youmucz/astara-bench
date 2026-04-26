## Why

代码审核发现 astara-bench 实现中存在 6 个未修复问题：1 个功能性缺陷（`scenarioWeights` 未参与评分计算）、2 个覆盖率缺口（C# 依赖分析无效、`buggy-code` fixture 未被使用）、1 个设计决策待定（空断言数组返回满分）、以及 2 个低优先级的代码质量问题（静默 `catch {}`、hook 测试重复）。这些问题不影响基准测试的基本运行，但影响评分准确性、测试覆盖率和代码质量。

## What Changes

- 修复 `scenarioWeights` 评分聚合逻辑，使 `bench.config.yaml` 中的场景间权重实际生效
- 为 `architecture.ts` 添加 C# 依赖分析支持（`using` 和 C# 继承语法）
- 创建使用 `buggy-code` fixture 的“修 bug”场景（B08 或新场景）
- 优化空断言数组的默认评分策略（返回 0 或跳过该维度）
- 将静默 `catch {}` 替换为明确的错误日志或重新抛出
- 合并重复的 hook 测试文件，消除冗余

## Capabilities

### New Capabilities

- `bench-scenario-buggy`: 新增“修复反模式代码”场景，利用 `fixtures/buggy-code/` fixture

### Modified Capabilities

- `bench-runner`: 修复 `scenarioWeights` 评分聚合、空断言评分策略、错误处理改进
- `bench-assertions`: 为 `architecture.ts` 添加 C# 依赖分析支持

## Impact

- `src/runners/bench-runner.ts` — 评分聚合逻辑变更
- `src/assertions/architecture.ts` — 新增 C# 依赖分析正则
- `scenarios/basic/` 或 `scenarios/domain/` — 新增 1 个场景文件
- `tests/unit/hooks/` — 合并/重构测试文件
