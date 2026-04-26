## 1. Fixture 加载机制

- [x] 1.1 在 `project-manager.ts` 中新增 `applyFixture(projectDir: string, fixturePath: string): void` 函数，将 fixture 目录内容 cpSync 到 projectDir 并执行 `git add . && git commit`
- [x] 1.2 若 fixturePath 目录不存在，记录 warning 并跳过（不中断场景执行）
- [x] 1.3 在 `bench-runner.ts` 的 `runScenario` 中，读取 `scenario.fixture`，在 `resetProject` 后、`executeScenario` 前调用 `applyFixture`
- [x] 1.4 修改 `resetProject` 确保 fixture commit 被正确回退（git checkout 回退到初始状态含 fixture）
- [x] 1.5 验证：运行 `bun test tests/structural/` 确认 fixture 相关测试通过

## 2. C# 断言兼容性修复

- [x] 2.1 修改 `evaluateStructuralAssertions` 中的 `function_exists` case，新增 C# 备用正则 `\bNAME\s*\(`
- [x] 2.2 修改 `evaluateStructuralAssertions` 中的 `extends_type` case，新增 C# 继承检测 `class\s+\w+\s*:\s*TYPE`
- [x] 2.3 在 `tests/unit/assertions/` 中新增或更新测试，覆盖 C# 方法匹配和 C# 继承匹配场景
- [x] 2.4 验证：`bun test` 全部通过，`bun run typecheck` 零错误

## 3. 文档一致性

- [x] 3.1 更新 `AGENTS.md` 中场景计数：将 "7 基本" 改为 "8 基本"（总数为 8+14+4=26）
- [x] 3.2 确认 `bench.config.yaml` 中 scenario_weights 包含 B01-B08, D01-D14, N01-N04 共 26 项
- [x] 3.3 验证：`bun test tests/structural/scenarios.test.ts` 通过（已有 >=25 检查，26 满足条件）
