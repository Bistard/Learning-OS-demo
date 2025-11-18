/**
 * Declarative view that binds the LearningOsViewModel to real DOM nodes.
 *
 * Usage:
 * ```ts
 * const vm = new LearningOsViewModel();
 * new LearningOsView('app', vm);
 * ```
 */

import { Page } from '../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';

interface NavItem {
  label: string;
  page: Page;
}

const NAV_ITEMS: NavItem[] = [
  { label: '主页', page: 'landing' },
  { label: '资料上传', page: 'upload' },
  { label: '任务树', page: 'tasks' },
  { label: '练习', page: 'practice' },
  { label: '模拟考', page: 'mock' },
];

export class LearningOsView {
  private readonly contentHost: HTMLElement;
  private readonly toastHost: HTMLElement;
  private readonly navButtons = new Map<Page, HTMLButtonElement>();

  /**
   * @param rootId DOM 容器 id.
   * @param viewModel MVVM 状态层.
   */
  constructor(rootId: string, private readonly viewModel: LearningOsViewModel) {
    const root = document.getElementById(rootId);
    if (!root) {
      throw new Error(`Root container #${rootId} not found`);
    }
    root.innerHTML = this.buildShell();
    this.contentHost = root.querySelector<HTMLElement>('[data-view="content"]')!;
    this.toastHost = root.querySelector<HTMLElement>('[data-view="toast"]')!;
    this.bindNav(root);
    this.viewModel.subscribe((snapshot) => this.render(snapshot));
    this.viewModel.onToast((toast) => this.renderToast(toast.message, toast.tone));
  }

  private buildShell(): string {
    const navButtons = NAV_ITEMS.map(
      (item) => `
        <li>
          <button class="nav-shortcut" data-page="${item.page}" type="button">${item.label}</button>
        </li>`
    ).join('');
    return `
      <div class="app-layout">
        <header class="app-header">
          <div class="logo-area" role="button" tabindex="0">
            <div class="logo-dot"></div>
            <span>小墨学习 OS</span>
          </div>
          <nav>
            <ul>
              ${navButtons}
            </ul>
          </nav>
        </header>
        <main data-view="content" id="view-root"></main>
        <div class="toast-area" data-view="toast"></div>
      </div>
    `;
  }

  private bindNav(shell: HTMLElement): void {
    const logo = shell.querySelector('.logo-area');
    logo?.addEventListener('click', () => this.viewModel.navigate('landing'));
    logo?.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        this.viewModel.navigate('landing');
      }
    });
    shell.querySelectorAll<HTMLButtonElement>('.nav-shortcut').forEach((button) => {
      const page = button.dataset.page as Page;
      this.navButtons.set(page, button);
      button.addEventListener('click', () => this.viewModel.navigate(page));
    });
  }

  private render(snapshot: ViewSnapshot): void {
    this.highlightNav(snapshot.page);
    switch (snapshot.page) {
      case 'landing':
        this.renderLanding(snapshot);
        break;
      case 'upload':
        this.renderUpload(snapshot);
        break;
      case 'questionnaire':
        this.renderQuestionnaire(snapshot);
        break;
      case 'tasks':
        this.renderTaskTree(snapshot);
        break;
      case 'learning':
        this.renderLearning(snapshot);
        break;
      case 'practice':
        this.renderPractice(snapshot);
        break;
      case 'review':
        this.renderReview(snapshot);
        break;
      case 'mock':
        this.renderMock(snapshot);
        break;
      case 'complete':
        this.renderCompletion(snapshot);
        break;
    }
  }

  private highlightNav(page: Page): void {
    this.navButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === page);
    });
  }

  private renderLanding(snapshot: ViewSnapshot): void {
    const stats = [
      { label: '距离考试', value: snapshot.countdownActive ? snapshot.countdownLabel.replace('距考试 ', '') : '3 天 0 小时' },
      { label: '已上传资料', value: `${snapshot.uploadedCount} / ${snapshot.totalUploads}` },
      { label: '完成节点', value: `${snapshot.completedTasks} / ${snapshot.totalTasks}` },
    ];
    const statsHtml = stats
      .map(
        (stat) => `
        <div>
          <p class="label">${stat.label}</p>
          <p class="strong">${stat.value}</p>
        </div>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <p class="eyebrow">小墨 · 考前 3 天冲刺</p>
          <h1>72 小时速成：线性代数冲刺路径</h1>
          <p class="sub">聚焦“最低解题必要知识”，上传资料后 30 秒生成个性化任务树，配套拍照批改与模拟考。</p>
          <div class="cta-group">
            <button class="btn primary" id="start-btn">开始冲刺（只需 72 小时）</button>
            <button class="btn ghost" id="view-flow">查看流程</button>
          </div>
          <div class="microcopy">今日建议：优先完成“特征值与对角化”模板，目标 25 分钟。</div>
        </div>
        <div class="hero-card">
          <div class="mascot">
            <div class="mascot-face">🖤</div>
            <p>小墨学习助手：根据你的资料生成考点树，并在关键节点提醒。</p>
          </div>
          <div class="progress-mini">
            ${statsHtml}
          </div>
        </div>
      </section>
    `;
    this.bindClick('#start-btn', () => this.viewModel.navigate('upload'));
    this.bindClick('#view-flow', () => this.viewModel.showFlowGuide());
  }

  private renderUpload(snapshot: ViewSnapshot): void {
    const files = snapshot.uploads
      .map(
        (item) => `
          <div class="file-card ${item.status}">
            <div>
              <p class="title">${item.name}</p>
              <p class="meta">${item.type} · ${item.pages} 页 · ${item.size}</p>
            </div>
            <div class="tag">${item.status === 'uploaded' ? '已上传' : '待上传'}</div>
          </div>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="panel">
        <header class="panel-head">
          <div>
            <p class="eyebrow">资料上传</p>
            <h2>整理资料，生成个性化任务树</h2>
            <p class="sub">讲义 PDF、教材章节、期末重点、往年试题都可以批量拖拽上传。</p>
          </div>
          <button class="btn primary" id="upload-all" ${snapshot.isUploading ? 'disabled' : ''}>模拟上传</button>
        </header>
        <div class="upload-body">
          <div class="dropzone">
            <p>拖拽文件到此，或点击模拟上传</p>
            <p class="hint">支持：PDF / 图片 / ZIP；系统自动识别类别</p>
            <div class="mascot-bubble">这些资料会帮助我们生成个性化任务树</div>
          </div>
          <div class="file-list">
            <div class="progress-line">
              <span>已上传 ${snapshot.uploadedCount} / ${snapshot.totalUploads} 项</span>
              <progress class="progress-bar" value="${snapshot.uploadProgress}" max="100"></progress>
            </div>
            ${files}
          </div>
        </div>
        <footer class="panel-foot">
          <button class="btn ghost" id="back-home">返回首页</button>
          <button class="btn primary" id="next-config" ${snapshot.uploadProgress < 100 ? 'disabled' : ''}>下一步（开始配置）</button>
        </footer>
      </section>
    `;
    this.bindClick('#back-home', () => this.viewModel.navigate('landing'));
    this.bindClick('#upload-all', () => this.viewModel.simulateUpload());
    this.bindClick('#next-config', () => this.viewModel.navigate('questionnaire'));
  }

  private renderQuestionnaire(snapshot: ViewSnapshot): void {
    const deadline = this.viewModel.getEffectiveDeadline();
    this.contentHost.innerHTML = `
      <section class="panel overlay">
        <div class="overlay-card">
          <h2>预冲刺配置</h2>
          <p class="sub">根据你的时间和目标，系统将调整任务树节点数量与优先级。</p>
          <form id="q-form" class="form-grid">
            <label>预计完成冲刺日期时间
              <input type="datetime-local" name="deadline" value="${deadline}">
            </label>
            <label>每天可学习时长（小时）
              <input type="range" name="daily" min="1" max="8" step="0.5" value="${snapshot.questionnaire.dailyHours}">
              <span class="value" id="daily-value">${snapshot.questionnaire.dailyHours} h</span>
            </label>
            <label>考试时长（分钟）
              <input type="number" name="duration" value="${snapshot.questionnaire.examDuration}" min="30" max="240">
            </label>
            <label class="switch-row">是否为特定学校课程
              <input type="checkbox" name="school" ${snapshot.questionnaire.isSchoolCourse ? 'checked' : ''}>
              <span class="switch"></span>
            </label>
            <label>偏好模式
              <select name="mode">
                <option value="知识获取 + 备考" ${snapshot.questionnaire.mode === '知识获取 + 备考' ? 'selected' : ''}>知识获取 + 备考</option>
                <option value="快速应试" ${snapshot.questionnaire.mode === '快速应试' ? 'selected' : ''}>快速应试</option>
              </select>
            </label>
            <label class="switch-row">是否包含 AI 押题
              <input type="checkbox" name="predict" ${snapshot.questionnaire.aiPrediction ? 'checked' : ''}>
              <span class="switch"></span>
            </label>
            <p class="warning" id="warning"></p>
            <div class="form-actions">
              <button type="button" class="btn ghost" id="cancel-q">取消</button>
              <button type="submit" class="btn primary" id="generate">生成任务树（系统思考）</button>
            </div>
          </form>
          <div class="loading" id="loading" hidden>
            <div class="dots"><span></span><span></span><span></span></div>
            <p>系统思考中，正在为你布局 3 天冲刺路径...</p>
          </div>
        </div>
      </section>
    `;
    const form = this.contentHost.querySelector<HTMLFormElement>('#q-form');
    const warning = this.contentHost.querySelector<HTMLElement>('#warning');
    const dailyRange = this.contentHost.querySelector<HTMLInputElement>('input[name="daily"]');
    const dailyValue = this.contentHost.querySelector<HTMLElement>('#daily-value');
    const loading = this.contentHost.querySelector<HTMLElement>('#loading');
    if (dailyRange && dailyValue && warning) {
      dailyRange.addEventListener('input', () => {
        dailyValue.textContent = `${dailyRange.value} h`;
        warning.textContent = parseFloat(dailyRange.value) < 3 ? '建议至少每天 3 小时以完成关键节点' : '';
      });
    }
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      this.viewModel.updateQuestionnaire({
        deadline: (data.get('deadline') as string) ?? '',
        dailyHours: parseFloat((data.get('daily') as string) ?? '3'),
        examDuration: parseInt((data.get('duration') as string) ?? '120', 10),
        isSchoolCourse: Boolean(data.get('school')),
        mode: (data.get('mode') as '知识获取 + 备考' | '快速应试') ?? '知识获取 + 备考',
        aiPrediction: Boolean(data.get('predict')),
      });
      loading?.removeAttribute('hidden');
      await this.viewModel.generatePersonalizedPlan();
    });
    this.bindClick('#cancel-q', () => this.viewModel.navigate('upload'));
  }

  private renderTaskTree(snapshot: ViewSnapshot): void {
    const cards = snapshot.tasks
      .map(
        (task) => `
          <article class="task-card ${task.status} ${task.type}" data-task="${task.id}">
            <div class="task-top">
              <span class="pill ${task.difficulty}">${task.difficulty}</span>
              <span class="pill timing">${task.eta} 分钟</span>
            </div>
            <h3>${task.title}</h3>
            <p class="meta">${task.summary}</p>
            <div class="status-row">
              <span class="ring ${task.status}"></span>
              <span>${this.describeTaskStatus(task.status)}</span>
            </div>
            <button class="btn small ${task.status === 'locked' ? 'disabled' : 'primary'}" ${task.status === 'locked' ? 'disabled' : ''}>
              ${this.taskCtaCopy(task.type)}
            </button>
          </article>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="panel">
        <header class="panel-head">
          <div>
            <p class="eyebrow">个性化任务树</p>
            <h2>围绕“考什么 & 必须掌握”自动生成节点</h2>
            <p class="sub">点击节点立即进入学习 / 练习 / 模拟考，完成后会获得 XP 激励。</p>
          </div>
          <div class="countdown">${snapshot.countdownLabel}</div>
        </header>
        <div class="progress-line">
          <span>整体完成度 ${snapshot.completionPercent}%</span>
          <progress class="progress-bar" value="${snapshot.completionPercent}" max="100"></progress>
        </div>
        <div class="task-grid">
          ${cards}
        </div>
        <footer class="panel-foot">
          <p class="microcopy">完成节点时，进度条同步增长，并显示微奖励（XP）。</p>
          <button class="btn ghost" id="to-complete">跳转到完成页（演示）</button>
        </footer>
      </section>
    `;
    this.contentHost.querySelectorAll<HTMLElement>('.task-card').forEach((card) => {
      card.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        this.viewModel.enterTask(target.dataset.task);
      });
    });
    this.bindClick('#to-complete', () => this.viewModel.navigate('complete'));
  }

  private renderLearning(snapshot: ViewSnapshot): void {
    this.contentHost.innerHTML = `
      <section class="two-col">
        <div class="content">
          <p class="eyebrow">学习节点 · 应试教学</p>
          <h2>特征值与对角化：最低解题必要知识</h2>
          <p class="sub">模板化步骤，立即可做题。选中段落右击，呼出应试快捷问答。</p>
          <div class="example">
            <div class="question">
              <h4>示例题（接近考试风格）</h4>
              <p>给定矩阵 A = [[2,1,0],[0,2,0],[0,0,3]]，判断 A 是否可对角化，并给出步骤。</p>
              <ol>
                <li>特征多项式 det(A-λI) = (2-λ)^2 (3-λ)</li>
                <li>特征值 λ₁=2（代数重数 2），λ₂=3（代数重数 1）</li>
                <li>求解 (A-2I)x=0，几何重数 = 2 ⇒ 可对角化</li>
              </ol>
              <div class="toolbar">
                <button class="pill-btn">Highlight</button>
                <button class="pill-btn">笔记</button>
                <button class="pill-btn">标记疑难</button>
              </div>
            </div>
            <div class="template">
              <h4>3 步模板（判断矩阵能否对角化）</h4>
              <ol>
                <li>写出特征多项式，列出所有特征值</li>
                <li>对每个特征值求 (A-λI)x=0，得到特征向量维度</li>
                <li>若几何重数与代数重数相等 ⇒ 可对角化</li>
              </ol>
            </div>
          </div>
          <div class="actions">
            <button class="btn ghost" id="back-tree">返回任务树</button>
            <button class="btn primary" id="complete-node">完成节点（+XP）</button>
          </div>
        </div>
        <aside class="chat-panel">
          <div class="msg from-ai">
            <p class="label">小墨学习助手</p>
            <p>本节得分点：确认重复特征值的几何重数；构造对角化 P 时注意特征向量线性无关性。</p>
          </div>
          <div class="msg from-ai subtle">
            <p class="label">小墨提示</p>
            <p>完成并标记后，自动推送 2 道变式题 + 1 次拍照批改。</p>
          </div>
        </aside>
      </section>
    `;
    this.bindClick('#back-tree', () => this.viewModel.navigate('tasks'));
    this.bindClick('#complete-node', () => this.viewModel.completeLearningNode());
  }

  private renderPractice(snapshot: ViewSnapshot): void {
    this.contentHost.innerHTML = `
      <section class="two-col">
        <div class="content">
          <p class="eyebrow">练习节点 · 在线答题 / 拍照批改</p>
          <h2>秩-零空间 + 线性相关性</h2>
          <p class="sub">选择在线答题或上传手写作业，小墨实时批改，错题加入错题本。</p>
          <div class="question-card">
            <h4>典型题</h4>
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
          <div class="result" id="practice-result" ${snapshot.practiceResultVisible ? '' : 'hidden'}>
            <div class="badge success">小墨批改完成：正确率 92%</div>
            <p>参考解答（要点）：</p>
            <ol>
              <li>行化简 → 主元列为 1、3，第三列为自由列 ⇒ r = 2</li>
              <li>零空间维度 = 列数 3 - r 2 = 1，基向量可取 (-2,1,0)</li>
              <li>行向量线性相关（因为 r &lt; 行数）</li>
            </ol>
            <p class="hint">考查知识点：秩-零空间定理、线性相关性判定。常见错误：忽略自由变量导致零空间维度错误。</p>
          </div>
          <div class="actions">
            <button class="btn ghost" id="back-tree-2">返回任务树</button>
            <button class="btn primary" id="complete-practice">标记完成</button>
          </div>
        </div>
        <aside class="sidebar">
          <h4>小墨批改 · 即时反馈</h4>
          <p class="hint">做对：短暂激励 “Nice！进步啦 🖤”；做错：引导“别急，我们来拆解错误点 →”。</p>
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
    this.bindClick('#back-tree-2', () => this.viewModel.navigate('tasks'));
    this.bindClick('#upload-photo', () => this.viewModel.simulatePhotoUpload());
    this.bindClick('#submit-practice', () => this.viewModel.submitPracticeAnswer());
    this.bindClick('#complete-practice', () => this.viewModel.completePracticeNode());
  }

  private renderReview(snapshot: ViewSnapshot): void {
    this.contentHost.innerHTML = `
      <section class="panel">
        <p class="eyebrow">错题本与复习计划</p>
        <h2>优先攻克高频错因，安排智能复习间隔</h2>
        <div class="review-grid">
          <div class="mistake-card">
            <h4>题目：特征值重根判定</h4>
            <p>错因：忽略几何重数 &lt; 代数重数。</p>
            <div class="tag-row">
              <span class="pill warning">再次复习</span>
              <span class="pill ghost">关联节点：特征值</span>
            </div>
          </div>
          <div class="mistake-card">
            <h4>题目：最小二乘拟合</h4>
            <p>错因：构造法方程时漏写转置。</p>
            <div class="tag-row">
              <span class="pill warning">本周必复</span>
              <span class="pill ghost">关联节点：正交投影</span>
            </div>
          </div>
          <div class="mistake-card">
            <h4>题目：秩-零空间综合题</h4>
            <p>错因：混淆自由变量数量。</p>
            <div class="tag-row">
              <span class="pill info">安排拍照批改</span>
            </div>
          </div>
        </div>
        <div class="scheduler">
          <p>下一次复刷建议：今晚 20:00 · 25 分钟速记 + 10 分钟错题再练</p>
          <div class="slots">
            <button class="pill-btn">添加日历</button>
            <button class="pill-btn">推送到手机</button>
            <button class="pill-btn">导出错题 PDF</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn ghost" id="back-tree-3">返回任务树</button>
          <button class="btn primary" id="schedule">安排复刷提醒</button>
          <button class="btn primary" id="complete-review">标记完成</button>
        </div>
      </section>
    `;
    this.bindClick('#back-tree-3', () => this.viewModel.navigate('tasks'));
    this.bindClick('#schedule', () => this.viewModel.scheduleReviewReminder());
    this.bindClick('#complete-review', () => this.viewModel.completeReviewNode());
  }

  private renderMock(snapshot: ViewSnapshot): void {
    const bodyClasses = snapshot.mockResultVisible ? 'mock-body completed' : 'mock-body';
    this.contentHost.innerHTML = `
      <section class="panel">
        <p class="eyebrow">模拟考 · 倒数第二关</p>
        <h2>60 分钟仿真考试，提交后小墨逐题批改 + 弱点雷达图</h2>
        <div class="mock-top">
          <div class="timer">${snapshot.mockTimerLabel}</div>
          <button class="btn ghost" id="start-mock" ${snapshot.mockStatus === 'running' ? 'disabled' : ''}>开始计时</button>
        </div>
        <div class="${bodyClasses}">
          <ol>
            <li>题 1：判断矩阵是否可逆，并给出逆矩阵或说明不存在的理由</li>
            <li>题 2：对角化 / Jordan 分解（根据题目可行性选择）</li>
            <li>题 3：最小二乘拟合与误差分析</li>
            <li>题 4：线性相关性与秩-零空间定理综合题</li>
          </ol>
        </div>
        <div class="actions">
          <button class="btn ghost" id="back-tree-4">返回任务树</button>
          <button class="btn primary" id="submit-mock">提交并批改</button>
        </div>
        <div class="result" id="mock-result" ${snapshot.mockResultVisible ? '' : 'hidden'}>
          <div class="badge success">批改完成</div>
          <p>总分 78 / 100 · 预测区间 74-82</p>
          <p>弱点：特征值重根、最小二乘细节。建议复习错题本 + 速记模板。</p>
          <div class="radar">雷达图（示意）：{代数基础 80, 对角化 70, 正交投影 65, 计算稳健 85}</div>
          <button class="btn primary" id="go-complete">查看复盘 & 庆祝</button>
        </div>
      </section>
    `;
    this.bindClick('#back-tree-4', () => this.viewModel.navigate('tasks'));
    this.bindClick('#start-mock', () => this.viewModel.startMockExam());
    this.bindClick('#submit-mock', () => this.viewModel.completeMockExam());
    this.bindClick('#go-complete', () => this.viewModel.navigate('complete'));
  }

  private renderCompletion(snapshot: ViewSnapshot): void {
    this.contentHost.innerHTML = `
      <section class="panel celebration">
        <div class="confetti">🎉</div>
        <p class="eyebrow">冲刺完成</p>
        <h2>恭喜完成 3 天冲刺！</h2>
        <p class="sub">预测分数区间 74 - 82 分。关键弱点：特征值重根、最小二乘细节。</p>
        <div class="summary">
          <div>
            <p class="label">完成节点</p>
            <p class="strong">${snapshot.completedTasks} / ${snapshot.totalTasks}</p>
          </div>
          <div>
            <p class="label">累计 XP</p>
            <p class="strong">${snapshot.totalXp} XP</p>
          </div>
          <div>
            <p class="label">下一步</p>
            <p class="strong">复习错题本 + 导出考前小抄</p>
          </div>
        </div>
        <div class="actions">
          <button class="btn primary" id="review-wrong">复习错题本</button>
          <button class="btn ghost" id="export-cheatsheet">导出考前小抄</button>
        </div>
        <div class="mascot">小墨学习助手：稳住节奏，考前再做一次速记。</div>
      </section>
    `;
    this.bindClick('#review-wrong', () => this.viewModel.navigate('review'));
    this.bindClick('#export-cheatsheet', () => this.viewModel.exportCheatsheet());
  }

  private renderToast(message: string, tone: 'success' | 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    this.toastHost.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  private describeTaskStatus(status: string): string {
    if (status === 'complete') return '已完成 · + XP';
    if (status === 'available') return '可开始';
    return '待解锁';
  }

  private taskCtaCopy(kind: string): string {
    switch (kind) {
      case 'learn':
        return '进入学习节点';
      case 'practice':
        return '开始练习 / 批改';
      case 'mock':
        return '进入模拟考';
      default:
        return '查看错题本';
    }
  }

  private bindClick(selector: string, handler: () => void): void {
    const node = this.contentHost.querySelector<HTMLElement>(selector);
    node?.addEventListener('click', handler);
  }
}
