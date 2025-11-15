# AGENT.md  
**AI Coding Agent 统一编码纲领（Code & Design Guidelines）**

> 本文档是所有 AI 代码代理（Agent）在本项目中生成代码时必须严格遵循的核心规范。  
> 任何生成的代码都必须符合以下原则，以确保：**统一风格、模块化、可扩展、可测试、可维护**。

---

## 1. 总体原则（General Principles）
1. **遵循 SOLID 原则**
   - **S**：Single Responsibility（单一职责）  
   - **O**：Open/Closed（开闭原则）  
   - **L**：Liskov Substitution（里氏替换）  
   - **I**：Interface Segregation（接口隔离）  
   - **D**：Dependency Inversion（依赖倒置）

2. **全部代码必须语义清晰、模块边界明确、可测试性强。**  
3. 所有模块必须 **可扩展而非改写**（Open for extension, closed for modification）。  
4. 禁止输出一次性、难以维护的「拼凑式」代码。  
5. 任何功能必须拆成：**数据（model）+ 逻辑（controller） + UI（view）**。

---

## 2. 架构要求（Architecture Requirements）
### 2.1 Model / View 分层  
所有功能必须至少拆分为：

- **Model**：  
  - 纯数据结构与业务逻辑  
  - 不包含任何 UI 代码  
  - 具备序列化能力  
  - 可被单元测试覆盖

- **View（UI）**：  
  - 纯渲染逻辑  
  - 不直接操作业务逻辑  
  - 使用 props / events 与 model 或 controller 通信  
  - 组件必须可复用、可组合、可独立使用  

> **禁止** 将业务逻辑写进 UI（如 React 组件内部执行复杂计算）。  
> **禁止** 任意耦合状态与视图。

### 2.2 模块化（Modularity）
- 每个功能必须拆为独立模块  
- 每个模块必须暴露明确的 public API  
- 模块之间依赖必须通过接口或抽象层，而不是直接依赖具体实现  
- 避免循环依赖  

### 2.3 可测试性（Testability）
- Model 层必须具备单元测试（jest）  
- Controller 层必须能模拟数据进行测试  
- UI 层需保证结构清晰，便于 React Testing Library 编写测试  

---

## 3. UI 设计规范（UI Development Guidelines）
### 3.1 Flex Layout
- 所有布局必须使用 **flex**  
- 禁止使用 position:absolute 作为基础布局手段  
- 推荐使用 gap、justify、align 等现代 flex 属性  

### 3.2 不允许 inline style
✔ 使用 className  
✔ 样式写入 CSS
✘ 禁止 `style={{ ... }}`  

所有样式必须具备可复用性、组件化、命名规范。

### 3.3 组件规范
所有组件必须：

- 可复用  
- 可组合（composition-friendly）  
- 不依赖全局变量  
- 接收 `props` 作为唯一输入  
- 必须是 **pure component**（无副作用）  
- 必须拆分逻辑与展示（container + presentational component）

### 3.4 用户交互逻辑
- 所有事件（onClick、onChange）必须通过 controller 或 event handler 层处理  
- UI 仅触发事件，不处理业务逻辑  
- UI 永不直接读写 localStorage / 网络请求

---

## 4. 代码风格要求（Code Style Requirements）
### 4.1 TypeScript 强制开启
所有文件必须使用 `.ts`：

### 4.2 命名规范

* 变量使用 `camelCase`
* 类使用 `PascalCase`
* 常量使用 `UPPER_SNAKE_CASE`
* 文件名使用 `camelCase`

### 4.3 不允许魔法数字 / 魔法字符串

所有值必须抽离为常量或放在 config 层。

### 4.4 不允许臃肿文件

超过 500 行必须拆分。

---

## 5. 文档与注释要求（Documentation Guidelines）

所有模块必须包含：

1. **文件头部注释**（描述模块用途）
2. **函数注释**（参数、返回值、异常说明）
3. **至少一个使用示例（example）**

---

## 6. 行为要求（Agent Behavior Requirements）

AI（Agent）在生成代码时必须遵守：

### 6.1 输出高质量代码，而不是最短代码

目标是长期维护 + 可扩展，而不是“一次可运行”。

### 6.2 所有输出需要具备以下特性

* 可扩展
* 可测试
* 可读
* 可维护
* 遵循 SOLID
* UI 与数据必须分层
* 不使用内联样式
* 组件可复用

### 6.3 禁止行为

* 生成一次性、不可维护的代码
* 生成高度耦合 UI 逻辑
* 任意写死控制器或全局状态
* 将逻辑塞进 React 组件中
* 使用过长函数（>300行必须拆分）

### 6.4 优先行为

* 推荐抽象
* 推荐模块化
* 推荐解耦数据与展示
* 推荐接口设计
* 推荐单元测试
* 推荐小函数、小模块、小组件

---

## 7. 提示规范（Prompt Standards for Agent）

开发者向 AI 提供提示时，AI 应遵守：

* 当上下文不明确时，应该主动询问
* 如果架构可能更优，应提出改进建议
* 在多个实现中，优先选择最符合 SOLID / 模块化 / 可测试性 的方案
* 生成后的代码必须自检（self-review）结构、命名、风格

---

## 8. 目标（Agent Mission）

本规范旨在：

* 为整个项目建立统一开发标准
* 保证代码质量
* 维持一致的 UI / UX 原则
* 形成可持续扩展的架构
* 让所有由 AI 生成的代码都具备长期价值

AI 代理的使命是：
**生成更专业、更可维护、更工程化的代码，而不是简单拼接代码。**

---