## Why

对 astara-bench 代码库进行完整审计发现了 3 个致命 bug：场景级 `fixture` 字段被完全忽略（B07/B08 的预置代码永不加载），C# 场景的 `function_exists`/`extends_type` 断言使用了仅匹配 GDScript 的正则导致永久误判，以及文档与配置间场景计数不一致。这些 bug 导致基准测试结果不可信——C# 场景得分被人为压低，fixture-heavy 场景测试的是错误的初始状态。

## What Changes

- **修复 fixture 机制**：Runner 在 `runScenario` 中读取 `scenario.fixture`，将指定的 fixture 目录内容复制到测试项目后再运行
- **修复 C# 断言兼容**：`function_exists` 和 `extends_type` 新增 C# 语法检测分支
- **修复场景计数一致性**：更新 AGENTS.md 中的场景数从 25 → 26，或在 bench.config.yaml 中将 B08 从 basic 移至 domain（取决于设计决策）
- 更新受影响的 spec 文件以反映新行为

## Capabilities

### New Capabilities

- `fixture-loading`: 场景级 fixture 目录加载机制，runner 在运行场景前将 `scenario.fixture` 内容复制到项目目录

### Modified Capabilities

- `bench-assertions`: `function_exists` 和 `extends_type` 断言类型需同时支持 GDScript 和 C# 语法
- `bench-scenario-buggy`: B08 fixture 引用需求已存在但实现缺失，需补全实现以符合 spec

## Impact

- `src/runners/bench-runner.ts`: `runScenario` / `executeScenario` 需新增 fixture 加载逻辑
- `src/runners/project-manager.ts`: 可选——新增 `applyFixture(projectDir, fixtureDir)` 工具函数
- `scenarios/basic/B07-existing-code-respect.yaml`: fixture 字段已存在，无需修改
- `scenarios/basic/B08-buggy-code-fix.yaml`: fixture 字段已存在，无需修改
- `bench.config.yaml` / `AGENTS.md`: 场景计数相关文档
- `openspec/specs/bench-scenario-buggy/spec.md`: 已声明 fixture 引用需求，仅缺实现
- `openspec/specs/bench-assertions/spec.md`: 需新增 C# 语法兼容场景
