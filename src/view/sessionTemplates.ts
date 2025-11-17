import { PracticeFeedback, XiaoMoState } from '../models/xiaoMoModels';

/**
 * 学习节点（应试教学）。
 */
export const renderLearning = (): string => `
  <section class="three-col">
    <aside class="meta-card">
      <p class="eyebrow">节点信息</p>
      <p class="meta-row">难度：高 · 预计 25 分钟</p>
      <p class="meta-row">已完成次数：1</p>
      <button class="text-link" data-nav="tasks" id="back-tree">← 返回任务树</button>
    </aside>
    <div class="content">
      <p class="eyebrow">学习节点 · 应试教学</p>
      <h2>特征值与对角化：考前必背模板</h2>
      <p class="sub">模板化步骤，选中文本右击即可唤出应试快捷问答。</p>
      <div class="example">
        <div class="question" data-context-menu="true">
          <h4>示例题（接近考试风格）</h4>
          <p>给定矩阵 A = [[2,1,0],[0,2,0],[0,0,3]]，判断 A 是否可对角化，并给出步骤。</p>
          <ol>
            <li>计算特征多项式 det(A-λI) = (2-λ)<sup>2</sup>(3-λ)。</li>
            <li>区分代数重数与几何重数：λ<sub>1</sub>=2，λ<sub>2</sub>=3。</li>
            <li>求解 (A-2I)x=0，若特征向量维度总和 = n，则 A 可对角化。</li>
          </ol>
          <div class="toolbar">
            <button class="pill-btn">Highlight</button>
            <button class="pill-btn">笔记</button>
            <button class="pill-btn">标记疑难</button>
          </div>
        </div>
      </div>
      <div class="template">
        <h4>3 步模板（判断矩阵能否对角化）</h4>
        <ol>
          <li>计算 det(A - λI)。</li>
          <li>处理重复 λ：比较代数重数与几何重数。</li>
          <li>行化简检验特征向量维度是否凑齐 n。</li>
        </ol>
        <p class="hint">若每个特征值的几何重数 = 代数重数，则矩阵可被对角化。</p>
      </div>
      <div class="actions">
        <button class="btn primary" id="complete-node">完成并标记</button>
      </div>
    </div>
    <aside class="knowledge-card">
      <h4>最低解题必要知识</h4>
      <ul>
        <li>特征值与特征向量定义</li>
        <li>重复根的代数/几何重数</li>
        <li>可对角化充要条件</li>
      </ul>
      <div class="chat-panel inline">
        <div class="chat-panel__header">
          <div class="droplet-mascot tiny" aria-hidden="true"></div>
          <span>小墨问答（可折叠）</span>
        </div>
        <div class="msg from-ai">
          <p class="label">墨滴提示</p>
          <p>选中文本后可快速提问「这和考试有什么关系？」「举个简单例题」等。</p>
        </div>
      </div>
    </aside>
  </section>
`;

/**
 * 练习节点。
 */
export const renderPractice = (feedback: PracticeFeedback | null, resultHtml: string): string => `
  <section class="two-col">
    <div class="content">
      <p class="eyebrow">练习节点 · 在线答题 / 拍照批改</p>
      <div class="tab-row">
        <button class="pill-btn active">典型题</button>
        <button class="pill-btn" disabled>变式题（预留）</button>
      </div>
      <h2>秩-零空间联动</h2>
      <p class="sub">在线作答或上传手写作业，小墨实时批改并加入错题本。</p>
      <div class="question-card">
        <p>给定矩阵 B = [[1,2,3],[2,4,6],[1,1,1]]，判断行向量是否线性相关，并给出秩与零空间维度。</p>
        <div class="answer-area">
          <label>你的答案（要点式）</label>
          <textarea id="practice-answer" placeholder="写出行化简步骤 + r + 零空间维度"></textarea>
          <div class="upload-inline">
            <button class="btn ghost" id="upload-photo">拍照上传手写答案</button>
            <span class="hint">上传后小墨自动批改</span>
          </div>
          <button class="btn primary" id="submit-practice">提交批改</button>
        </div>
      </div>
      <div class="result" id="practice-result" ${feedback ? '' : 'hidden'}>${feedback ? resultHtml : ''}</div>
      <div class="actions">
        <button class="btn primary" id="complete-practice">标记完成</button>
      </div>
    </div>
    <aside class="sidebar">
      <h4>小墨批改 · 即时反馈</h4>
      <p class="hint">做对：激励 “Nice！进步啦”；做错：引导错题本拆解。</p>
      <div class="faq">
        <p class="label">常见易错</p>
        <ul>
          <li>行化简未保持主元列对应</li>
          <li>将代数重数误判为几何重数</li>
          <li>零空间基未覆盖所有自由变量</li>
        </ul>
      </div>
    </aside>
  </section>
`;

export const renderPracticeResult = (feedback: PracticeFeedback): string => `
  <div class="badge ${feedback.verdict === 'correct' ? 'success' : 'warn'}">${feedback.title}</div>
  <p>参考解答（要点）：</p>
  <ol>${feedback.steps.map((step) => `<li>${step}</li>`).join('')}</ol>
  <p class="hint">${feedback.hint}</p>
`;

/**
 * 错题本与复习计划。
 */
export const renderReview = (): string => `
  <section class="panel">
    <p class="eyebrow">错题本与复习计划</p>
    <h2>优先攻克高频错因，安排智能复习间隔</h2>
    <div class="review-grid">
      <div class="mistake-card">
        <h4>题目：特征值重根判定</h4>
        <p>错因：忽略几何重数 < 代数重数</p>
        <p class="label">纠正步骤</p>
        <ul>
          <li>重算 (A-λI) 的秩，确认自由变量个数。</li>
          <li>若特征向量不足，补充 Jordan 块提示。</li>
        </ul>
        <div class="tag-row"><span class="pill">高优先级</span><span class="pill">线性代数</span></div>
      </div>
      <div class="mistake-card">
        <h4>题目：最小二乘法</h4>
        <p>错因：未写出正规方程</p>
        <p class="label">纠正步骤</p>
        <ul>
          <li>写出 A^T A x = A^T b，检查 A^T A 可逆。</li>
          <li>若不可逆，使用 QR 分解。</li>
        </ul>
        <div class="tag-row"><span class="pill">中优先级</span><span class="pill">正交投影</span></div>
      </div>
    </div>
    <div class="timeline">
      <div class="slot">T+1 天：回顾零空间模板</div>
      <div class="slot">T+3 天：拍照批改 + 错题本复习</div>
      <div class="slot">T+7 天：模拟考复盘</div>
    </div>
    <footer class="panel-foot">
      <button class="btn primary" id="schedule">加入今日复习</button>
    </footer>
  </section>
`;

/**
 * 模拟考。
 */
export const renderMock = (state: Readonly<XiaoMoState>, timerCopy: string): string => `
  <section class="panel mock">
    <header class="panel-head">
      <div>
        <p class="eyebrow">模拟考</p>
        <h2>终局模拟考 · 线性代数</h2>
        <p class="sub">提交后小墨自动批改并生成弱点雷达图。</p>
      </div>
      <div class="timer" id="mock-timer">${timerCopy}</div>
    </header>
    <div class="mock-body">
      <ol>
        <li>题 1：判断矩阵是否可逆，并说明理由；</li>
        <li>题 2：对角化或 Jordan 分解（依据题意）；</li>
        <li>题 3：最小二乘拟合与误差分析；</li>
        <li>题 4：线性相关性与秩-零空间定理综合题。</li>
      </ol>
    </div>
    <div class="actions">
      <button class="btn ghost" data-nav="tasks" id="back-tree-4">返回任务树</button>
      <button class="btn ghost" id="start-mock">开始计时</button>
      <button class="btn primary" id="submit-mock">提交并批改</button>
    </div>
    <div class="result" id="mock-result" ${state.mockStatus.resultSummary ? '' : 'hidden'}>
      ${state.mockStatus.resultSummary ? `<div class="badge success">批改完成</div><p>${state.mockStatus.resultSummary}</p>` : ''}
    </div>
  </section>
`;

/**
 * 完成页。
 */
export const renderCompletion = (state: Readonly<XiaoMoState>, xp: number): string => `
  <section class="panel celebration">
    <div class="confetti">🎉</div>
    <p class="eyebrow">冲刺完成</p>
    <h2>恭喜完成 3 天冲刺！</h2>
    <p class="sub">预测分数区间 74 - 82 分 · 弱点：特征值重根、最小二乘细节。</p>
    <div class="summary">
      <div>
        <p class="label">完成节点</p>
        <p class="strong">${state.tasks.filter((t) => t.status === 'complete').length} / ${state.tasks.length}</p>
      </div>
      <div>
        <p class="label">累计 XP</p>
        <p class="strong">${xp} XP</p>
      </div>
      <div>
        <p class="label">下一步</p>
        <p class="strong">复习错题本 · 导出考前小抄</p>
      </div>
    </div>
    <div class="actions">
      <button class="btn primary" data-nav="review" id="review-wrong">复习错题本</button>
      <button class="btn ghost" id="export-cheatsheet">导出考前小抄</button>
    </div>
    <div class="mascot">墨滴助手：保持节奏，考前再做一次速记。</div>
  </section>
`;
