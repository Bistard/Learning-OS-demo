# 小墨（XiaoMo）「考前 3 天冲刺」可点击演示稿

高保真级别的点击式网页原型说明，用于展示 Jry 在期末前 72 小时的完整冲刺路径与关键交互。视觉基调：白 + 墨 (#111827)，简洁专业，带有温暖中性色点缀，吉祥物为成熟的“小墨小助理”（墨元素）。

------

## 1) 页面清单与高保真布局说明

### A. 首页 / 模块入口

- **结构**：
  - 顶栏：左侧 Logo + 模块名「小墨」；右上轻量吉祥物头像（微笑、举手动作），旁边小卡片显示今日建议（例：“建议先整理资料，15 分钟即可”）。
  - 主区域：左侧大标题“考前 3 天冲刺”，副标题“72 小时内完成应试路径”；右侧插画：小墨小助理递出任务树简图。
  - CTA：墨色主按钮“开始冲刺（只需 72 小时）”，副按钮“查看示例任务树”。
- **状态/动效**：
  - Hover：CTA 外发光墨色 glow，轻微上浮 4px；
  - Click：按钮轻微下沉并出现墨色涟漪，小墨小助理点头。
- **点击**：主 CTA → B 资料上传页；副按钮 → 弹出示例任务树预览。

### B. 资料上传页

- **结构**：
  - 顶部进度条：显示“已上传 x / 6 项”，墨色填充。
  - 主区域左右分栏：
    - 左：拖拽上传区域，支持批量；上传项列表卡片（文件名、类型标签：讲义 PDF/教材章节/期末重点/past assignment/past midterm/quiz，页数或大小，删除/替换按钮）。
    - 右：AI 提示气泡：“这些资料会帮助我们为你生成个性化任务树”，下方吉祥物半身示意。
  - 底部：灰色“上一步”、墨色“下一步（开始配置）”。
- **状态/动效**：
  - 上传中：文件卡片显示 loading 条与旋转点阵；
  - 成功：卡片右上角绿勾，toast “资料已上传，正在生成个性化任务树…”；
  - 失败：红色错误条“文件读取失败，请重试”。
- **点击**：“下一步”→ C 预冲刺问卷弹窗。

### C. 预冲刺问卷（弹窗表单）

- **字段**：
  - 完成日期时间（日期时间选择器，默认 3 天后晚 10 点）；
  - 每天可学习时长（滑块 1–8 小时，显示数值）；
  - 考试时长（数字输入，单位分钟）；
  - 是否为特定学校课程（开关）；
  - 偏好模式（单选：知识获取+备考 / 快速应试）；
  - AI 押题（开关）。
- **校验**：若每日时长 <3 小时，显示提示“建议至少每天 3 小时以完成关键节点”。
- **CTA**：墨色“生成任务树（系统思考）”，点击后按钮进入 loading 状态（墨色三点跳动，文案切换“生成中…”）。
- **点击**：提交成功 → D 个性化任务树；取消/关闭 → 返回 B。

### D. 个性化任务树（主界面）

- **结构**：
  - 顶栏：整体完成率环形图；倒计时“距考试 2 天 18:32”；右侧快捷操作（复习计划、模拟考入口）。
  - 主要区域：树状/矩阵卡片，每个节点=考点；卡片包含标题、难度点位、估时、完成环；颜色：未做浅灰、进行中淡墨、完成亮墨打勾。
  - 左侧侧边栏：筛选（按难度/章节/考试占比），切换视图（树/列表）。
- **交互**：
  - 点击节点 → E 学习节点；
  - 完成节点：卡片闪烁、打勾，顶部进度条增长并弹出徽章 “已掌握：特征值与对角化（+1 XP）”；
  - 悬停节点显示快捷按钮“去练习”、“跳过（降优先级）”。

### E. 学习节点 — 应试教学

- **布局**：三栏：
  - 左侧窄栏：节点信息（难度、估时、已完成次数）与“返回任务树”。
  - 中央主内容：
    - 上方标题：“特征值与对角化 — 考前必背模板”。
    - 示例题卡：题干 + 标准解法步骤（可折叠）；
    - 底部工具条：Highlight、笔记、标记疑难（带图标）。
  - 右侧：知识点浓缩卡（“最低解题必要知识”），列出 3–5 步模板；下面 AI 对话栏（Chat Sidebar）。
- **快捷菜单**：用户选中文本后右击弹出：1) 这和考试有什么关系？ 2) 举个简单例题 3) 我看不懂 4) 常见错误。点击任一项 → 右侧 AI 对话栏自动展开回答并附简短步骤。
- **示例模板（默认展示）**：
  1. 计算特征值（det(A − λI)）。
  2. 处理重复 λ（代数重数 vs. 几何重数）。
  3. 行化简检验特征向量维度。
- **完成按钮**：右下角灰色“完成并标记”，Hover 转墨，点击 → 节点标为完成并回写到任务树。

### F. 练习节点 — 题型与拍照批改

- **结构**：
  - 顶部标签：典型题 / 变式题切换；
  - 中央：题目内容，右上角可切换“在线答题/拍照上传”；
  - 拍照区：上传框 + 示例占位图；
  - 结果区：
    - 批改结果卡：正确/错误标识（绿/红），分步骤参考解答；
    - 知识点&易错点分析；
    - 个性化逐步解析（错误时突出“缩短路径复习建议”）；
  - 侧边栏：错题本入口（显示当前累积 N 题）。
- **交互反馈**：
  - 做对：toast “Nice！进步啦 🖋️”；
  - 做错：提示 “别急，我们来拆解错误点 →”，并高亮建议链接（跳至对应学习节点）。

### G. 错题本与复习计划

- **结构**：
  - 列表：缩略题干、错因标签（概念/计算/粗心）、纠正步骤、小墨批注；
  - 顶部批量操作：加入今日复习 / 设优先级 / 生成复习间隔；
  - 时间线：显示自动推荐的间隔复习时段，可拖拽。

### H. 模拟考（倒数第二关）

- **结构**：
  - 顶栏计时器（倒计时），显示“提交后自动批改”；
  - 题目列表固定顺序，左侧导航可跳转，右上切换“随机顺序”；
  - 底部提交按钮，禁用状态到时间或题目未答完提示。
- **结果页**：
  - 分数卡：总分、及格线、目标线（70–80）；
  - 错题分布、弱点雷达图；
  - CTA：“复习错题本”、“返回任务树”。

### I. 完成页 / 复盘 & 庆祝

- **结构**：
  - 顶部轻量 confetti 动效；吉祥物做“竖拇指”姿态。
  - 分数区：最终成绩、预计区间（保守/乐观）；
  - 弱点摘要卡 + 行动建议；
  - CTA：墨色“复习错题本”、次要“导出考前小抄（仅复习要点）”，第三按钮“再次模拟”。

------

## 2) 页面间点击流程（Click-through）

1. 首页 CTA “开始冲刺” → 资料上传页。
2. 资料上传页 “下一步（开始配置）” → 预冲刺问卷弹窗。
3. 问卷提交成功 → 个性化任务树。
4. 任务树节点点击 → 学习节点（应试教学）。
5. 学习节点右下“完成并标记” → 返回任务树并标记完成。
6. 任务树节点快捷“去练习” → 练习节点；完成批改 → 错题自动加入错题本。
7. 错题本列表 → 点击题目返回对应学习节点或练习节点复练。
8. 任务树顶栏“模拟考入口” → 模拟考；提交 → 结果页 → CTA 返回任务树或错题本。
9. 任务树整体完成 ≥90% → 完成页 / 复盘 & 庆祝。

------

## 3) 关键动效与微交互

- **按钮反馈**：Hover 上浮、阴影加深；点击涟漪；禁用态 30% 透明。
- **上传**：卡片显示墨色 loading 条；成功后轻微缩放 + 绿勾；失败抖动一次。
- **任务树节点完成**：节点闪烁 0.3s → 墨色打勾 → 顶部 XP 徽章下落并消失；进度条平滑增长。
- **Chat Sidebar**：菜单触发后展开，自右侧滑入；AI 回复逐字渐显；支持继续追问。
- **批改返回**：上传后显示墨色点阵 loading；批改完成卡片自下弹出；正确时短暂闪亮，错误时红色波纹强调错行。
- **错题本安排**：拖拽题目到时间线时，时间块变墨色高亮；放开时伴随轻微震动反馈。
- **庆祝**：完成页有轻量 confetti、吉祥物缓慢挥手；提示音柔和。

------

## 4) 视觉资产清单

- **主色**：墨 #111827；
- **辅色**：深灰 #1F2933，文本主色；浅灰背景 #F7F8FA；成功绿 #2CC27B；警示红 #E55B5B；信息蓝 #3A86FF；
- **字体**：Inter / Noto Sans，层级：H1 28–32px，H2 22–24px，正文 14–16px，标签 12–13px；
- **按钮规范**：
  - 主按钮：墨底白字，圆角 10px，左右内边距 16–20px，hover 外发光；
  - 次按钮：白底墨边，文字墨；
  - icon-only：圆形浅灰背景，墨色线条图标。
- **图标集**：上传、计时器、进度环、徽章、对话、拍照、批改勾/叉、雷达图。
- **吉祥物姿态**：
  1. 轻点头（确认/成功）；2) 举手引导（提示）；3) 竖拇指（庆祝）；4) 思考状态（loading 时双手托腮）。

------

## 5) Figma/Framer Prompt（可粘贴至 AI 设计工具）

“Design a multi-screen web prototype for ‘**XiaoMo – 3-Day Exam Sprint**’. Palette: white background, **primary ink #111827**, warm neutrals, professional modern style (Inter/Noto Sans). Include mascot: mature **ink assistant** with subtle expressions. Screens: 1) Landing with CTA and advice card, 2) Upload page with progress bar and file tags, 3) Survey modal (date picker, slider, toggles, mode preference, AI guessing toggle) with validation hint, 4) Personalized task tree with progress ring, countdown, filter sidebar; nodes show title, difficulty, time, completion ring, hover quick actions. 5) Learning node layout: left metadata, center example problem with steps and toolbar (highlight, notes, mark hard), right condensed ‘minimum steps’ card and chat sidebar; context menu on text for exam relevance/sample/simple/explain errors; include 3-step diagonalization template. 6) Practice node: typical & variant tabs, online answer or photo upload, AI grading (correct/incorrect badge, step solution, knowledge points, error analysis), error toast/encouragement. 7) Wrong-problem book with tags, batch scheduling, spaced review timeline. 8) Mock exam page with timer, navigation, submit; results with score, distribution, radar chart, CTAs. 9) Completion/review page with confetti, score range, weakness summary, CTAs to review/export cheatsheet. Add microinteractions: hover lift/shadow, **ink-colored dot loading**, node completion badge drop, chat slide-in, grading bounce. Ensure click-through links follow the user flow.”