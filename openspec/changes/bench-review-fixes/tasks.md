## 1. 评分聚合修复

- [x] 1.1 修改 `src/runners/bench-runner.ts`：在 `evaluateScenario` 返回的 `ScenarioResult` 中不包含权重聚合，将 category 加权聚合逻辑移至 `src/runners/reporter.ts` 或 `src/cli.ts` 的报告生成阶段。验收：`scenarioWeights` 中的非 1.0 权重实际影响 category 总分。
- [x] 1.2 修改空断言评分策略：当某层未定义时权重重分配给其他层，当显式空数组时得分为 0。验收：只定义 deterministic 的场景，总分 = deterministic_score × 1.0。

## 2. C# 依赖分析

- [x] 2.1 修改 `src/assertions/architecture.ts`：在 `checkDependencyDirection` 中增加 C# `using` 和继承语法的依赖检测。验收：C# 文件的反向依赖被检测为 FAIL。
- [x] 2.2 为 C# 依赖分析添加单测（至少 3 个 case：正向 using、反向继承、混合文件）。验收：`bun test` 通过。

## 3. 新增 B08 场景

- [x] 3.1 创建 `scenarios/basic/B08-buggy-code-fix.yaml`：prompt 给出 buggy_enemy.gd 的内容，要求修复所有反模式，断言覆盖 6 种禁止模式。验收：YAML 格式合法，场景可通过 `loadScenario` 加载。
- [x] 3.2 在 `bench.config.yaml` 的 `scenario_weights` 中添加 `B08: 1.0`。验收：配置合法。

## 4. 错误处理改进

- [x] 4.1 替换 `src/runners/bench-runner.ts` 中所有静默 `catch {}` 为 `catch (err) { console.warn(...) }`，包含操作上下文。验收：代码中无空 catch 块。

## 5. Hook 测试合并

- [x] 5.1 将 `tests/unit/hooks/hook-assertions.test.ts` 中独有的 `.tres` 修改测试用例合并到 `tests/unit/assertions/hook-simulation.test.ts`。验收：合并后测试覆盖不减少。
- [x] 5.2 删除 `tests/unit/hooks/hook-assertions.test.ts`。验收：`bun test` 全部通过，文件不存在。
