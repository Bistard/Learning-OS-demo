# Learning-OS-demo

基于 **TypeScript + HTML + CSS + Vite** 的最小前端演示项目，方便团队在纯前端场景下启动实验或示例，并可直接部署在 GitHub Pages。

## 目录结构

```
.
├─ index.html            # 主页入口
├─ src/
│  ├─ main.ts           # 示例页面逻辑
│  └─ style.css         # 基础样式
├─ tsconfig*.json       # TypeScript 配置
├─ vite.config.ts       # Vite 构建 & Dev Server 配置
└─ package.json
```

## 快速开始（本地）

1. 安装依赖：
   ```bash
   npm install
   ```
2. 本地开发预览（默认 http://localhost:5173）：
   ```bash
   npm run dev
   ```
3. 类型检查（可选）：
   ```bash
   npm run typecheck
   ```
4. 生产构建：
   ```bash
   npm run build
   npm run preview   # 构建完成后进行本地预览
   ```

## 部署到 GitHub Pages

1. **确认仓库名称**：默认 `vite.config.ts` 中的 `base` 设置为 `/Learning-OS-demo/`，若你 fork/改名，请同步修改为 `/<你的仓库名>/`，否则 GitHub Pages 静态资源路径会不正确。
2. **上传源码到 GitHub**（main/master 分支均可）。
3. **产出静态文件**：
   ```bash
   npm run build
   ```
   生成的 `dist/` 目录就是 GitHub Pages 需要的静态内容。
4. **发布方式一：gh-pages 分支**
   ```bash
   git add dist -f
   git commit -m "build: gh-pages assets"
   git subtree push --prefix dist origin gh-pages
   ```
   然后在 GitHub 仓库的 *Settings → Pages* 中选择 `gh-pages` 分支作为发布源。
5. **发布方式二：GitHub Actions 自动构建**（推荐）
   - 在仓库 Settings → Pages 中选择 `GitHub Actions`。
   - 添加官方的 Vite/Node 部署 Action（示例 Workflow 可参考 GitHub 文档），自动编译并发布 `dist`。

完成后，访问 `https://<你的 GitHub 用户名>.github.io/<仓库名>/` 即可看到示例主页。

## 自定义扩展

- 在 `src/` 目录中增加新的 `.ts`、`.css` 或组件文件，Vite 开发服务器会自动热更新。
- 可在 `main.ts` 中拆分模块、引入 UI 库或状态管理工具，逐步扩展成真实业务。
- 若需要接入 API，可通过静态 JSON 或第三方前端 SDK，保持「纯前端」的同时验证交互流程。
