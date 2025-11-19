# Learning-OS-demo

一个使用 **TypeScript + HTML + CSS + Vite** 打造的迷你前端骨架，可直接部署到 GitHub Pages，演示最基础的 SPA 开发、构建与发布流程。

## 技术栈
- Vite：极速开发服务器与打包
- TypeScript：获得类型提示与更好的工程体验
- 纯前端资源：可托管在 GitHub Pages、Netlify、Vercel 等任意静态平台

## 目录结构
```
.
├── index.html           # SPA 入口
├── src/
│   ├── main.ts          # 页面逻辑（含最小交互示例）
│   └── style.css        # 简洁样式
├── vite.config.ts       # 构建 / 预览配置（含 base 设置）
├── tsconfig*.json       # TypeScript 配置
└── .github/workflows/   # GitHub Pages 自动部署
```

## 快速开始
1. 安装依赖  
   ```bash
   npm install
   ```
2. 启动开发服务器（默认 http://localhost:5173）  
   ```bash
   npm run dev
   ```
3. 类型检查（可选）  
   ```bash
   npm run typecheck
   ```
4. 构建与预览生产版本  
   ```bash
   npm run build
   npm run preview
   ```

## GitHub Pages 部署
1. 确认 `vite.config.ts` 中的 `base` 与仓库名称一致（格式 `/<repo-name>/`）。
2. 推送至 GitHub，仓库 Settings → Pages 中选择 “GitHub Actions”。
3. 本项目已提供 `.github/workflows/main.yml`，会在每次 push `master` 时：
   - 使用 `npm ci` 安装依赖；
   - 运行 `npm run build`；
   - 将 `dist/` 自动部署到 GitHub Pages。
4. Workflow 成功后，可以通过 `https://<username>.github.io/<repo-name>/` 访问。

## 如何扩展
- 在 `src/` 目录中自由添加新的模块 / 样式文件，Vite 会自动热更新。
- 把 `main.ts` 的示例计数逻辑替换为团队需要的交互或 UI。
- 若需要引入 API，可直接在前端调用公开接口，仍保持纯静态部署。

> 提示：该项目刻意保持“最小但可运行”，适合作为团队模板或 PoC 起点。根据实际业务逐步增加依赖与脚本即可。
## 数据驱动内容
- 所有案例与模板数据统一存放在 `src/data/` 文件夹，以 JSON 形式集中管理。
- `src/models/learningOsModel.ts` 仅负责读取这些数据并构建状态，不再硬编码任务树或知识库结构。
- 当需要替换演示文案时，直接编辑对应 JSON（如 `initialGoal.json`、`templates/*.json`）即可被全局复用。
- 「知识库」示例数据拆分存放在 `src/data/knowledgeBases/<library-id>/knowledgeBase.json`，默认内置“线性代数”和“西方哲学”，可以在 `src/models/learningOs/templates.ts` 中注册更多案例供 UI 下拉切换。
