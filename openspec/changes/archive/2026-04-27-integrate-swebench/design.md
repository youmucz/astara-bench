## Context

astara-bench 当前架构为 Godot 专有基准测试套件：

```
scenarios/*.yaml → bench-runner.ts → 断言评估 → 评分
                      ↑
              opencode-client.ts
              project-manager.ts
```

核心流程：加载 YAML → 发送 prompt → 收集 diff → 评估断言（deterministic / structural / hook_simulation）→ 加权评分。断言系统全部围绕 GDScript/C# 设计（scene-file-guard、godot_rules_check、naming_check 等）。

SWE-bench 本质不同：基于真实 repo checkout + test execution 的 verify-by-run 模型，而非静态断言扫描。Phase 1 用 YAML 场景 + `test_exec` 断言弥合这个鸿沟，Phase 2 引入原生 SWE-bench 评估管线。

## Goals / Non-Goals

**Goals:**

- 10 个 Python 通用编程场景（G01-G10），覆盖 bug 修复 / 测试编写 / 重构 / 错误处理，与 Godot 场景共存于同一 CLI
- 新增 `test_exec` 断言类型，通过 pytest 验证 Agent 生成的代码真实可运行
- 新增 Python 专有断言规则（反模式检测）
- 原生 SWE-bench 评估管线（Docker 隔离 + resolve_rate 评分），通过 `--preset swebench` 激活
- 零破坏性变更，现有 26 个 Godot 场景 100% 兼容

**Non-Goals:**

- 不替换或修改现有 Godot 断言系统
- 不修改现有 YAML 场景格式
- SWE-bench 部分不覆盖全部 2,294 个 Full 实例（仅 Lite 534 + 可配置子集）
- 不实现 SWE-bench 社区提交 / Leaderboard 功能

## Decisions

### D1: YAML-first 架构 — 复用现有 Scenario 模型

**选择**：Phase 1 通用场景使用与 Godot 相同的 YAML + `Scenario` 接口，通过 `category: "general"` 区分。

```
现有:  scenarios/basic/*.yaml    category: "basic"
      scenarios/domain/*.yaml    category: "domain"
      scenarios/negative/*.yaml  category: "negative"
新增:  scenarios/general/*.yaml  category: "general"
```

**替代方案考虑**：
- 独立 JSON schema → 增加维护负担，报告层需处理两套格式
- 独立 CLI 子命令 → 用户体验割裂

**理由**：统一的场景模型让加载、过滤、报告层无需改动。`general` 场景的唯一特殊性在于断言内容（test_exec、Python 规则），不在结构。

### D2: test_exec 作为确定性断言

**选择**：`test_exec` 作为 `deterministic` 类型的新断言，不复用 hook_simulation 或 structural 层。

**断言结构**：
```yaml
assertions:
  deterministic:
    - type: test_exec
      command: "pytest tests/test_calc.py -x --tb=short"
      expected_exit: 0
      timeout_ms: 30000
      message: "All tests should pass after fix"
```

**实现**：
```typescript
// bench-runner.ts evalDeterministic() 新增 case
case "test_exec": {
  try {
    execSync(a.command!, { cwd: projectDir, timeout: a.timeout_ms ?? 30000 });
    return { assertion: a, passed: true, message: "test_exec: passed" };
  } catch (err: any) {
    return { assertion: a, passed: false, message: `test_exec failed (exit ${err.status}): ${err.stderr?.toString()?.slice(0, 200)}` };
  }
}
```

**理由**：
- `deterministic` 定位是"即时可验证的结果"，test_exec 天然符合
- 不需要新增评估维度，评分体系无需变更
- 放在其他层语义不对：structural 是静态分析，hook_simulation 是行为模拟

### D3: Category 类型扩展

**选择**：将 `Scenario.category` 从 `"basic" | "domain" | "negative"` 扩展为 `"basic" | "domain" | "negative" | "general"`。

**替代方案考虑**：
- 改为 `string` 完全放开 → 失去类型安全，IDE 自动补全失效
- 新增 `bench_type` 字段 → 增加歧义，两套筛选机制混乱

**理由**：union 类型扩展保持类型安全，编译期即可捕获拼写错误。未来新增 category（如 Phase 2 的 `"swebench"`）只需追加一个字面量。

### D4: Python Fixture 结构

**选择**：单个 `fixtures/python-project/` fixture，包含 10 个独立子目录，每个对应一个场景。

```
fixtures/python-project/
├── pyproject.toml          # 全局 Python 配置
├── pytest.ini
├── G01-recursion-fix/      # 预置 buggy 代码 + 测试 → Agent 修复
├── G02-write-tests/        # 预置无测试代码 → Agent 编写测试
├── G03-extract-method/     # 预置长函数 → Agent 重构
├── ...
└── G10-concurrency-fix/    # 预置线程 bug → Agent 修复
```

每个子目录包含：
- `problem.py` — 预置的有问题代码
- `solution.py` — 黄金答案（用于 scoring 参考）
- `test_problem.py` — 验证修复的 pytest 文件

场景 YAML 通过 `fixture` 字段引用对应子目录：
```yaml
id: G01
fixture: "fixtures/python-project/G01-recursion-fix"
```

**理由**：
- 复用现有 fixture-loading spec
- 单次 `pip install -e .` 即可运行所有测试
- 每个场景独立测试，可选择性执行

### D5: SWE-bench Runner 架构 — 独立运行器

**选择**：SWE-bench 评估通过独立 `swebench-runner.ts` 实现，与 YAML-based `bench-runner.ts` 并行共存。通过 `--preset` CLI 标志激活：

```
CLI 层:
  bun run bench --category basic          → Godot YAML runner (现有)
  bun run bench --category general        → General YAML runner (复用 bench-runner.ts)
  bun run bench --preset swebench         → SWE-bench native runner (新增)
  bun run bench --preset all              → 两者都跑，合并报告
```

**替代方案考虑**：
- 嵌入 bench-runner.ts → SWE-bench 流程（Docker 隔离、git checkout、test suite 执行）与 YAML 断言评估完全不同，强行合并导致分支爆炸
- 独立 CLI 命令 `bun run swebench` → 无法复用共享层（opencode-client、reporter），报告分散

**理由**：独立 runner 保持代码隔离的同时复用共享基础设施。`--preset` 标志允许用户选择评估域。`--preset all` 提供统一报告体验。

### D8: SWE-bench 实例缓存策略

**选择**：预缓存 SWE-bench Lite（534 实例）为单个 `instances.json` 文件，运行时通过 max_instances 限制首批执行量。

**数据结构**：
```json
{
  "instance_id": "django__django-13023",
  "repo": "django/django",
  "pull_number": 13023,
  "base_commit": "abc123...",
  "problem_statement": "...",
  "hints_text": "",
  "created_at": "2023-01-01T00:00:00Z",
  "test_patch": "diff --git ...",
  "patch": "diff --git ...",
  "version": "4.0"
}
```

**替代方案考虑**：
- 实时从 GitHub API 拉取 → 受速率限制，不可重现
- 使用 SWE-bench Python 包动态下载 → 引入完整 Python 依赖链

**理由**：JSON 缓存是平台无关格式，Bun/Node 原生解析，无需 Python 环境即可加载元数据。仅测试执行需要 Python。

### D9: Docker 测试隔离降级策略

**选择**：三层降级策略确保评估在各种环境下都能运行：

```
Level 1: Docker (优先) → 完全隔离，匹配官方 SWE-bench 标准
Level 2: Local venv → pip install deps + 直接 pytest，无容器隔离
Level 3: Dry run → 仅收集 agent patch 不执行测试（标记为 unverified）
```

**理由**：不是所有开发环境都有 Docker（Windows 环境尤甚）。降级策略让 SWE-bench 评估在任何环境下至少产生部分有效结果，同时明确标记评估可信度。

### D6: 评分协调

**选择**：三种评估域使用各自独立的评分指标，报告分层展示：

```
报告结构:
  ## Godot (basic + domain + negative)
  | Scenario | Score | Det | Struct | Hook | Status |

  ## General (general)
  | Scenario | Score | Det | Struct | Hook | Status |

  ## SWE-bench
  | Repo        | Resolve Rate | Avg Time | Instances |
  | django/django   | 0.45       | 342s     | 12/20     |
  | psf/requests    | 0.60       | 180s     | 3/5       |
  | **Overall**     | **0.48**   | 289s     | 15/25     |

  ## Category Summary
  | Category     | Weighted Score / Resolve Rate |
  | Godot        | 0.876                        |
  | General      | 0.742                        |
  | SWE-bench    | 0.48                         |
```

- Godot / General：三维加权评分（deterministic + structural + hook_simulation）
- SWE-bench：`resolve_rate = passed_F2P / total_F2P`（仅计算 PASS_TO_PASS 全保留的实例）

**理由**：通用编程 + SWE-bench + 游戏开发是不同维度的能力，混合评分无意义。独立报告让用户分别评估 Agent 在不同领域的能力。

### D7: 场景设计哲学

**选择**：每个 general 场景遵循"预置问题代码 + pytest 验证"模式，不采用 prompt-only 空白创建：

| 场景 | 预置状态 | Agent 任务 | 验证方式 |
|------|---------|-----------|---------|
| G01 | 递归函数缺少 base case | 修复 base case | pytest test_calc |
| G02 | 纯函数无测试 | 编写 pytest | pytest test_calc |
| G03 | 100行非结构化函数 | 提取 helper 方法 | pytest + structural 断言 |
| G04 | 无异常处理的文件 IO | 添加 try/except | pytest |
| G05 | 实现与接口不匹配 | 修复函数签名 | pytest |
| G06 | 清空输入验证 | 添加 validation | pytest |
| G07 | 线程不安全计数器 | 添加 Lock | pytest (并发测试) |
| G08 | 列表循环中修改列表 | 修复迭代逻辑 | pytest |
| G09 | 裸露 except 吞异常 | 改进异常处理 | pytest + pattern 断言 |
| G10 | 可变默认参数陷阱 | 修复默认参数 | pytest |

**理由**："修复已有代码"比"从零创建"更贴近真实 SWE 工作流，也是 SWE-bench 的核心设计理念。verify-by-run 确保了评分非主观。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `test_exec` 超时挂起 opencode session | 阻塞后续场景执行 | `execSync` + `timeout` 参数内置进程终止；Runner 外层已有 `scenario_timeout_ms` 兜底 |
| Python 环境缺失 | `test_exec` 全部 FAIL | CLI 启动时检测 Python/pytest 可用性，优雅降级提示 |
| 并发测试 (G07) 不稳定 | 偶发 FAIL 影响评分可靠性 | G07 使用 `time.sleep` 显式等待 |
| general 场景侵蚀 Godot 专项能力 | 用户困惑 benchmark 定位 | 报告中明确分区 `## Godot` vs `## General` vs `## SWE-bench` |
| Python Fixture 子目录过多 | 维护负担 | 控制在 10 个以内，每个场景 2-3 个文件 |
| Docker 不可用 | SWE-bench 无法隔离测试 | 三层降级策略（Docker → venv → dry-run） |
| SWE-bench repo clone 磁盘占用大 | 12 个 Python repo 约 2-5 GB | 使用 `git clone --bare --filter=blob:none` 浅克隆 + worktree checkout |
| SWE-bench 534 实例全量执行时间长 | 可能需数小时 | `max_instances` 配置项控制首批规模，默认 20，支持增量评测 |
| SWE-bench 实例 metadata 过期 | repo commit 可能已被 force-push 覆盖 | 缓存 base_commit 对应的 tar 快照或使用 GitHub archive API 回退 |

## Open Questions

1. G01-G10 的具体难度分布 — 目前 planned 10 个 easy/medium，是否需 1-2 个 hard？
2. Python Fixture 是否包含 `py.typed` 和完整的 type hint 基础设施？
3. SWE-bench 是使用官方 `swebench` Python 包作为评估后端，还是自建精简版测试执行管线？
4. `--preset all` 时 YAML runner 和 SWE-bench runner 是否串行还是可并行执行以节省时间？
