## ADDED Requirements

### Requirement: General 场景目录

系统 SHALL 支持从 `scenarios/general/` 目录加载以 `G` 前缀命名的通用编程基准场景。`Scenario.category` MUST 为 `"general"`，`difficulty` SHALL 为 `"easy"` / `"medium"` / `"hard"` 之一。

#### Scenario: G01 场景完整性

- **WHEN** 运行 `bench --category general`
- **THEN** 系统 SHALL 加载 `scenarios/general/G01-recursion-fix.yaml` 并执行

#### Scenario: general 场景可选 fixture

- **WHEN** general 场景定义了 `fixture` 字段
- **THEN** Runner SHALL 在场景执行前加载对应 fixture 子目录到项目目录

### Requirement: Python Fixture 项目

系统 SHALL 包含 `fixtures/python-project/` fixture，内含 `pyproject.toml`、`pytest.ini` 和 10 个场景子目录（G01–G10）。每个子目录 MUST 包含 `problem.py`（预置问题代码）、`solution.py`（黄金答案）和 `test_*.py`（pytest 测试文件）。

#### Scenario: fixture 结构完整性

- **WHEN** 检查 `fixtures/python-project/` 目录
- **THEN** 系统 SHALL 包含 `pyproject.toml`、`pytest.ini` 和 `G01-recursion-fix/` 至 `G10-mutable-default/` 共 10 个子目录

#### Scenario: 场景子目录内容

- **WHEN** 读取 `fixtures/python-project/G01-recursion-fix/`
- **THEN** SHALL 包含 `problem.py`、`solution.py` 和 `test_factorial.py`

### Requirement: General 场景内容覆盖

General 场景 SHALL 覆盖以下编程技能：递归 bug 修复（G01）、为无测试代码编写 pytest（G02）、重构提取方法（G03）、文件 IO 异常处理（G04）、函数签名修复（G05）、输入验证（G06）、线程安全修复（G07）、循环迭代逻辑修复（G08）、异常处理改进（G09）、可变默认参数陷阱（G10）。

#### Scenario: G01 Agent 修复递归

- **WHEN** Agent 收到 G01 prompt（预置 `problem.py` 包含缺少 base case 的递归函数）
- **THEN** `test_exec` 断言 SHALL 运行 `pytest tests/test_factorial.py` 且 exit code 为 0

#### Scenario: G02 Agent 编写测试

- **WHEN** Agent 收到 G02 prompt（要求为预置函数编写测试）
- **THEN** `test_exec` 断言 SHALL 验证 pytest 通过，且 structural 断言 SHALL 检测到 `def test_` 前缀的函数

### Requirement: General 场景 Python 反模式检测

系统 SHALL 对 general 场景的文件内容执行 Python 专有反模式检测：bare except（禁止）、mutable default argument（禁止）、list modification during iteration（G08 上下文豁免后禁止）。

#### Scenario: bare except 检测

- **WHEN** general 场景产出代码包含 `except:` 或 `except Exception:` 未做任何处理
- **THEN** pattern_check 断言 SHALL FAIL

#### Scenario: mutable default 检测

- **WHEN** Python 函数签名包含 `def foo(items=[])`
- **THEN** pattern_check 断言 SHALL FAIL
