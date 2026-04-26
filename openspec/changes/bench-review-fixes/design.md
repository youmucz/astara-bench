## Context

astara-bench v0.1.0 已完成全部 54 个任务并通过 275 个测试。代码审核发现 6 个未修复问题，涉及评分准确性、测试覆盖率和代码质量。当前 `scenarioWeights` 从 `bench.config.yaml` 加载但从未在评分中使用，C# 文件的依赖分析使用 GDScript 正则导致失效，`buggy-code` fixture 创建后无场景引用。

## Goals / Non-Goals

**Goals:**

- 修复 `scenarioWeights` 使其在 category 总分聚合时实际加权
- 为 C# 文件提供有效的依赖方向分析
- 利用 `buggy-code` fixture 创建"修复反模式代码"场景
- 明确空断言数组的评分策略
- 改进静默 `catch {}` 的错误处理
- 消除 hook 测试文件间的冗余

**Non-Goals:**

- 不修改现有的 YAML 场景格式规范
- 不引入新的外部依赖
- 不修改 bench.config.yaml 的 schema

## Decisions

### D1: scenarioWeights 聚合方式

在 `reporter.ts` 的 category 总分计算中应用 `scenarioWeights`：

```
category_avg = Σ(score × weight) / Σ(weight)
```

其中 weight 来自 `config.scenarioWeights[scenarioId]`，未配置时默认 1.0。

### D2: C# 依赖分析

在 `architecture.ts` 的 `checkDependencyDirection` 中新增 C# 语法检测：
- `using` 语句映射到目录层
- `: BaseClass` 继承语法检测
- 复用 `inferLayer()` 函数

### D3: 空 Assertion 评分策略

当某层断言数组为空时：
- 如果场景 YAML 中该层未定义（`undefined`），该层权重自动分配给其他已定义层
- 如果显式定义为空数组（`[]`），该层得分记为 0

### D4: "修复反模式"场景

新增场景 `B08-buggy-code-fix.yaml`：
- prompt 给出 buggy_code.gd 的内容，要求修复所有反模式
- 断言检查 6 种禁止模式均不存在
- 通过 `fixture` 字段引用 `fixtures/buggy-code/`

### D5: 错误处理

将 `catch {}` 替换为 `catch (err) { console.warn(...) }` 明确记录错误上下文，不中断执行。

### D6: Hook 测试合并

将 `tests/unit/hooks/hook-assertions.test.ts` 中独有的 `.tres` 修改测试用例合并到 `tests/unit/assertions/hook-simulation.test.ts`，然后删除 `tests/unit/hooks/hook-assertions.test.ts`。

## Risks / Trade-offs

- **[scenarioWeights 变更影响历史对比]** → 使用 `--update-baseline` 重新建立基线
- **[空断言评分策略变更可能降低部分场景分数]** → 仅影响未定义某层断言的场景，实际影响面小
- **[C# 依赖分析精度有限]** → Phase 1 使用正则，Phase 2 可引入 Tree-sitter
