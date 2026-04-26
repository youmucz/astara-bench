# astara-bench

Godot 领域基准测试套件 —— 验证 Studios 框架在真实 Godot 开发环境中的增量效果。

---

## 强制

- 提问和回答使用的语种，根据用户输入语种来决定
- 默认使用中文问答
- 在项目根目录生成的文档，也根据用户输入语种来决定

---

## 项目概述

astara-bench 是一个独立的 CLI 工具，可一键部署到任意 Godot 游戏项目目录，通过 opencode SDK 集成在真实开发环境中运行基准测试。

核心功能：
1. **A/B 对比**：部署 Studios vs 裸 opencode，量化 Studios 全栈增量价值
2. **25 个测试场景**：7 基本 + 14 领域（含 2 C#）+ 4 负面
3. **断言库**：命名规范、架构规则、禁止模式、Godot 特有规则、hook 行为验证
4. **opencode SDK 集成**：通过 `@opencode-ai/sdk` 驱动真实 opencode runtime

---

## 仓库结构

```
astara-bench/
├── src/                    # 源代码
│   ├── cli.ts              #   CLI 入口
│   ├── runners/            #   运行器
│   │   ├── bench-runner.ts
│   │   ├── opencode-client.ts
│   │   ├── project-manager.ts
│   │   └── reporter.ts
│   └── assertions/         #   断言库
│       ├── naming.ts
│       ├── architecture.ts
│       ├── patterns.ts
│       ├── godot-specific.ts
│       └── hook-simulation.ts
├── scenarios/              # 25 测试场景 (YAML)
│   ├── basic/              #   B01-B07
│   ├── domain/             #   D01-D14
│   └── negative/           #   N01-N04
├── fixtures/               # Godot 测试项目模板
│   └── godot-project-bare/
├── tests/                  # 测试
│   ├── unit/
│   └── structural/
├── openspec/               # OpenSpec 工作流
│   └── changes/
│       └── astara-bench/   #   当前变更（设计文档）
├── bench.config.yaml       # 全局配置
├── reports/                # 输出目录
└── baseline.json           # 历史基线
```

---

## 开发规范

### 技术栈

- **Runtime**: Bun
- **语言**: TypeScript (strict mode)
- **SDK**: `@opencode-ai/sdk`
- **测试**: Bun test
- **场景格式**: YAML

### 命名规范

- TypeScript 文件：`kebab-case.ts`
- 测试文件：`*.test.ts`
- 场景文件：`B01-file-naming.yaml`, `D01-player-controller.yaml`, `N01-scene-edit-reject.yaml`
- 目录：`kebab-case/`

### 编码规则

- 不添加注释（除非用户要求）
- 使用 TypeScript strict mode
- 所有 public 函数需要类型签名
- 错误处理不使用 try/catch 吞异常——要么处理要么抛出
- 异步操作使用 async/await，不用 .then/.catch

---

## 常用命令

```bash
bun install                    # 安装依赖
bun run bench --help           # 查看用法
bun run bench --scenario B01   # 运行单个场景
bun run bench --category all --mode compare --runs 1  # 完整 A/B 对比
bun test                       # 运行全部测试
bun run typecheck              # 类型检查
```

---

## OpenSpec 工作流

| 模式 | 命令 | 用途 |
|------|------|------|
| Explore | `/opsx-explore` | 思考和可视化 |
| Propose | `/opsx-propose` | 创建提案 + 设计 + 任务 |
| Apply | `/opsx-apply` | 执行任务 |
| Archive | `/opsx-archive` | 完成归档 |

---

## 上下文管理

关键设计决策记录在 `openspec/changes/astara-bench/` 下：

| 文档 | 作用 |
|------|------|
| `proposal.md` | 动机和范围 |
| `design.md` | 8 个技术决策 (D1-D8)、架构图、风险 |
| `specs/` | 4 个 spec（场景/断言/runner/CI） |
| `tasks.md` | 9 组约 30 个实施任务 |
