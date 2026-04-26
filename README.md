# astara-bench

Godot 领域基准测试套件 —— 通过 opencode SDK 在真实 Godot 开发环境中验证 [Studios](https://github.com/astara-studios/astara-opencode) 框架的增量效果。

## 快速开始

```bash
# 安装
npm install -g astara-bench

# fixture 模式：自动创建空白 Godot 项目并测试
astara-bench --mode compare --runs 1

# 指定游戏项目
astara-bench --project-dir /path/to/my-godot-game --mode compare

# 用本地 Studios 源码测试未发布改动
astara-bench --studios-source /path/to/astara-opencode --mode compare

# 只跑基本场景
astara-bench --category basic --mode studios

# 指定单个场景
astara-bench --scenario B01
```

## 工作原理

```
┌─────────────────────────────────────────────────┐
│ astara-bench                                      │
│                                                   │
│  1. 准备两个 Godot 项目副本                        │
│     baseline/ (裸)  ←→  studios/ (Studios 部署)  │
│                                                   │
│  2. 各启动一个 opencode serve                      │
│     :4097               :4098                     │
│                                                   │
│  3. 发送相同 prompt → 收集文件变更                  │
│                                                   │
│  4. 断言评估 → A/B 分数对比 → 报告                 │
└─────────────────────────────────────────────────┘
```

## 场景覆盖

| 类别   | 数量 | 覆盖范围                                    |
|--------|------|---------------------------------------------|
| 基本   | 7    | 命名规范、安全编辑、代码质量、目录结构、禁止模式、跨文件引用、已有代码尊重 |
| 领域   | 14   | 玩家控制器、敌人 AI、生命值组件、信号通信、状态机、事件总线、UI/HUD、场景组合、Resource、背包、音频、存档、C# 玩家、C# 信号 |
| 负面   | 4    | 场景文件编辑拒绝、文件覆盖拒绝、BDD 注释保留、硬编码路径拒绝 |

## CLI 参数

| 参数               | 说明                                       | 默认值  |
|--------------------|--------------------------------------------|---------|
| `--mode`           | `baseline` / `studios` / `compare`         | compare |
| `--category`       | `basic` / `domain` / `negative` / `all`    | all     |
| `--scenario`       | 指定场景 ID（如 `B01`）                     | -       |
| `--runs`           | 每场景运行次数                              | 5       |
| `--project-dir`    | 指定已有 Godot 游戏项目                     | fixture |
| `--studios-source` | Studios 来源：`npm` 或本地路径              | npm     |
| `--compare`        | 对比基线文件路径                            | -       |
| `--update-baseline`| 用当前结果更新基线                          | false   |

## 开发

```bash
git clone https://github.com/youmucz/astara-bench.git
cd astara-bench
bun install
bun test
bun run bench --scenario B01 --mode studios --runs 1
```

## License

MIT
