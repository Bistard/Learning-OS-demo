# AGENT.md  
**AI Coding Agent 统一编码纲领（Code & Design Guidelines）**

> 本文档是所有 AI 代码代理（Agent）在本项目中生成代码时必须严格遵循的核心规范。  
> 所有代码必须符合：**模块化、可扩展、可测试、可维护、统一风格**。

---

# 1. 总体原则（General Principles）

1. **严格遵循 SOLID 原则**  
   - **S**：Single Responsibility（单一职责）  
   - **O**：Open/Closed（开闭原则）  
   - **L**：Liskov Substitution（里氏替换）  
   - **I**：Interface Segregation（接口隔离）  
   - **D**：Dependency Inversion（依赖倒置）

2. 任何代码都必须语义清晰、分层明确、可测试性强。  
3. 模块必须支持扩展，而不是改写已有代码。
4. 禁止输出一次性、不可维护的「拼装代码」。  
5. 所有功能必须拆成：**Model（数据） + ViewModel（状态与业务逻辑） + View（UI 渲染）**。

---

# 2. 架构要求（Architecture Requirements）

## 2.1 分层结构（Model–View–ViewModel）

### **Model（核心数据 & 业务实体）**
- 只包含：数据结构、业务实体、基本方法（纯逻辑）  
- 不包含 UI 逻辑、状态管理  
- 可序列化、可单元测试  
- 必须与 View、ViewModel 完全解耦  

---

### **ViewModel（状态管理 & 业务逻辑层）**
作为 MVVM 的核心：

- 负责处理所有业务逻辑、状态变化、服务调用  
- 暴露给 View 的是「可绑定状态 + 事件方法」  
- 不包含 DOM 相关操作  
- 不依赖具体 UI 组件，只依赖 Model  
- 必须可单元测试  
- 必须保持「可观察状态」（例如使用 React 的状态或外部状态管理器）

**禁止：**  
- 在 View 中写逻辑  
- 在 Model 中写交互  
- 在 ViewModel 中直接操作 DOM  

---

### **View（展示层）**
- 只负责 UI 渲染与交互触发  
- 所有复杂逻辑必须从 View 中抽离  
- 通过 props 或绑定机制使用 ViewModel  
- 组件必须可复用、可组合、可替换  
- 必须为“pure component”

**禁止行为：**  
- 在 View 中写网络请求  
- 在 View 中读写全局状态  
- 在 View 中进行业务逻辑判断  

---

## 2.2 模块化（Modularity）
- 每个功能拆为独立模块  
- 暴露清晰的 public API  
- 模块之间依赖必须通过接口或抽象层，而不是直接依赖具体实现
- 避免循环依赖  
- View 层绝不能跨模块访问其他模块的 Model  

---

## 2.3 可测试性（Testability）
- Model 必须具备完整单元测试  
- ViewModel 必须可在无 UI 环境中测试  
- View（React 组件）使用 React Testing Library  
- 禁止不可测试的隐藏逻辑（如直接操作全局对象）

---

# 3. UI 设计规范（UI Development Guidelines）

## 3.1 布局
- **强制使用 flex layout**  
- 禁止使用 position:absolute 作为常规布局  
- 推荐使用 gap、align、justify 等现代 flex 属性  

---

## 3.2 样式规范
✔ 必须使用 className  
✔ 样式写在 CSS/SCSS  
✘ 禁止 inline style（禁止 `style={{}}`）

---

## 3.3 组件要求
所有组件必须：
- 可复用  
- 可组合  
- 无副作用（pure）  
- 通过 props 获取所有外部信息  
- 不依赖全局变量  
- 拆分为「容器 + 展示组件」  
- 容器组件：仅与 ViewModel 交互  
- 展示组件：只渲染 UI，不包含逻辑  

---

## 3.4 用户交互规范
- UI 只触发事件  
- ViewModel 处理事件逻辑  
- 永不在 View 中：
- 发 HTTP 请求  
- 操作 localStorage  
- 进行复杂逻辑判断  
- 管理状态  

---

# 4. 代码风格（Code Style Requirements）

## 4.1 TypeScript 强制要求
必须开启：  
```json
{
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true
}
````

---

## 4.2 命名规范

* 变量使用 `camelCase`
* 类使用 `PascalCase`
* 常量使用 `UPPER_SNAKE_CASE`
* 文件名使用 `camelCase`

---

## 4.3 禁止魔法数字

* 所有数值/字符串必须提取到常量或配置文件

---

## 4.4 文件长度限制

* 超过 **500 行** 必须拆分
* 单个函数超过 **300 行** 必须拆分

---

# 5. 文档与注释（Documentation Guidelines）

所有模块必须包含：

1. 文件头部注释（模块用途）
2. 函数注释（参数、返回、异常）
3. 至少一个 usage example（示例）

---

# 6. 行为要求（Agent Behavior Requirements）

AI（Agent）在生成代码时必须遵守：

## 6.1 输出高质量代码，而不是最短代码

* 首要目标：**可维护、可扩展、可测试**

## 6.2 所有输出必须具备

* 可扩展
* 可测试
* 可读
* 可维护
* 符合 SOLID
* 符合 MVVM 分层
* 不使用 inline style
* 可复用组件

## 6.3 禁止行为

* 一次性拼凑代码
* 在 View 中写业务逻辑
* 在 ViewModel 中写繁重的数据结构
* 在 Model 中写 UI 逻辑
* 任意写死全局状态
* 函数过长

## 6.4 推荐行为

* 抽象
* 模块化
* 明确接口
* 单元测试友好
* 小函数、小组件、小模块

---

# 7. Prompt 规范（Prompt Standards for Agent）

* AI 必须在输入不明确时主动询问。
* 如果架构有更优选择，必须提出建议。
* 每次输出前必须进行自检（self-review）：
  * 是否符合 MVVM？
  * 是否符合 SOLID？
  * 是否可测试？
  * 是否避免视图逻辑耦合？
  * 是否无 inline style？

---

# 8. 目标（Agent Mission）

本规范旨在确保所有 AI 输出的代码：

* 结构清晰
* 长期可维护
* 具备行业工程化质量
* 能适配现代前端 MVVM 架构
* 能为「小墨学习交互系统」提供稳固的基础框架

**AI 代理的使命是：生成专业、可扩展、可维护的工程代码，而不是简单拼接。**

---