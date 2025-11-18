/**
 * Declarative view that reflects the Goal x Knowledge Base usage logic.
 */

import { Page, TaskNode } from '../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';

interface NavItem {
  icon: string;
  label: string;
  page: Page;
}

const SIDE_NAV: NavItem[] = [
  { icon: '📌', label: '目标', page: 'goalDashboard' },
  { icon: '📚', label: '知识库', page: 'knowledgeBase' },
  { icon: '💬', label: 'AI 对话', page: 'aiChat' },
  { icon: '🧭', label: '我的计划', page: 'calendar' },
  { icon: '⚙️', label: '设置', page: 'settings' },
];

export class LearningOsView {
  private readonly contentHost: HTMLElement;
  private readonly toastHost: HTMLElement;
  private readonly headerHost: HTMLElement;
  private readonly sidebarMeta: HTMLElement;
  private readonly navButtons = new Map<Page, HTMLButtonElement>();

  constructor(rootId: string, private readonly viewModel: LearningOsViewModel) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`Root container #${rootId} not found`);
    root.innerHTML = this.buildShell();
    this.contentHost = root.querySelector<HTMLElement>('[data-view="content"]')!;
    this.toastHost = root.querySelector<HTMLElement>('[data-view="toast"]')!;
    this.headerHost = root.querySelector<HTMLElement>('[data-view="context-head"]')!;
    this.sidebarMeta = root.querySelector<HTMLElement>('[data-view="side-meta"]')!;
    this.bindNav(root);
    this.viewModel.subscribe((snapshot) => this.render(snapshot));
    this.viewModel.onToast((toast) => this.renderToast(toast.message, toast.tone));
  }

  private buildShell(): string {
    const navMarkup = SIDE_NAV.map(
      (item) => `
        <button class="side-link" data-page="${item.page}" type="button">
          <span class="icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>`
    ).join('');
    return `
      <div class="os-shell">
        <aside class="side-nav">
          <div class="brand" role="button" tabindex="0" data-nav-home>
            <span class="logo-dot"></span>
            <div>
              <strong>小墨学习 OS</strong>
              <p class="microcopy">目标驱动 · 知识库沉淀</p>
            </div>
          </div>
          <div class="side-links">
            ${navMarkup}
          </div>
          <div class="side-meta" data-view="side-meta">
            <p class="eyebrow">自动收录</p>
            <p class="microcopy">AI 正在监听目标上下文</p>
          </div>
        </aside>
        <div class="main-stage">
          <header class="context-header" data-view="context-head"></header>
          <main data-view="content"></main>
        </div>
      </div>
      <div class="toast-area" data-view="toast"></div>
    `;
  }

  private bindNav(shell: HTMLElement): void {
    const brand = shell.querySelector<HTMLElement>('[data-nav-home]');
    brand?.addEventListener('click', () => this.viewModel.navigate('goalDashboard'));
    brand?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        this.viewModel.navigate('goalDashboard');
      }
    });
    shell.querySelectorAll<HTMLButtonElement>('.side-link').forEach((button) => {
      const page = button.dataset.page as Page;
      this.navButtons.set(page, button);
      button.addEventListener('click', () => this.viewModel.navigate(page));
    });
  }

  private render(snapshot: ViewSnapshot): void {
    this.highlightNav(snapshot.page);
    this.renderContextHeader(snapshot);
    this.renderSidebarMeta(snapshot);
    switch (snapshot.page) {
      case 'goalDashboard':
        this.renderGoalDashboard(snapshot);
        break;
      case 'goalCreation':
        this.renderGoalCreation(snapshot);
        break;
      case 'goalWorkspace':
        this.renderGoalWorkspace(snapshot);
        break;
      case 'learningWorkspace':
        this.renderLearningWorkspace(snapshot);
        break;
      case 'knowledgeBase':
        this.renderKnowledgeBase(snapshot);
        break;
      case 'aiChat':
        this.renderAiChat(snapshot);
        break;
      case 'calendar':
        this.renderCalendar(snapshot);
        break;
      case 'settings':
        this.renderSettings(snapshot);
        break;
    }
  }

  private highlightNav(page: Page): void {
    this.navButtons.forEach((button, key) => {
      button.classList.toggle('active', key === page);
    });
  }

  private renderContextHeader(snapshot: ViewSnapshot): void {
    const goal = snapshot.activeGoal;
    const summary = snapshot.dashboardSummary;
    if (!goal) {
      this.headerHost.innerHTML = `
        <div class="context-empty">
          <h1>还没有目标</h1>
          <p class="microcopy">以目标为入口，知识库作为自动沉淀的载体</p>
          <button class="btn primary" id="header-create-goal">创建目标</button>
        </div>
      `;
      this.bindClick('#header-create-goal', () => this.viewModel.navigate('goalCreation'));
      return;
    }
    this.headerHost.innerHTML = `
      <div class="context-primary">
        <p class="eyebrow">当前目标</p>
        <h1>${goal.name}</h1>
        <p class="microcopy">${goal.focus}</p>
      </div>
      <div class="context-metrics">
        <div>
          <p class="label">总体进度</p>
          <p class="strong">${goal.progress.percent}%</p>
        </div>
        <div>
          <p class="label">剩余天数</p>
          <p class="strong">${goal.progress.remainingDays} 天</p>
        </div>
        <div>
          <p class="label">每日投入</p>
          <p class="strong">${Math.round(goal.profile.dailyMinutes / 60)} 小时</p>
        </div>
        <div>
          <p class="label">知识库连接</p>
          <p class="strong">${summary.knowledgeVaults}</p>
        </div>
      </div>
      <div class="context-actions">
        <button class="btn primary" id="header-open-workspace">进入任务树</button>
        <button class="btn ghost" id="header-open-workspace-3col">三栏学习空间</button>
      </div>
    `;
    this.bindClick('#header-open-workspace', () => this.viewModel.openGoalWorkspace());
    this.bindClick('#header-open-workspace-3col', () => this.viewModel.startLearningWorkspace());
  }

  private renderSidebarMeta(snapshot: ViewSnapshot): void {
    this.sidebarMeta.innerHTML = `
      <p class="eyebrow">自动收录</p>
      <p class="strong">${snapshot.knowledgeStats.totalItems}</p>
      <p class="microcopy">${snapshot.knowledgeStats.autoCaptureLabel}</p>
    `;
  }

  private renderGoalDashboard(snapshot: ViewSnapshot): void {
    const summary = snapshot.dashboardSummary;
    const goalCards = snapshot.goals
      .map(
        (goal) => `
        <article class="goal-card">
          <div>
            <p class="eyebrow">${goal.profile.targetType}</p>
            <h3>${goal.name}</h3>
            <p class="microcopy">截止 ${new Date(goal.profile.deadline).toLocaleDateString()}</p>
          </div>
          <div class="goal-progress">
            <p class="label">进度</p>
            <progress value="${goal.progress.percent}" max="100"></progress>
            <p class="microcopy">剩余 ${goal.progress.remainingDays} 天 · 每日 ${
              Math.round(goal.profile.dailyMinutes / 60) || 0
            } 小时</p>
          </div>
          <div class="goal-actions">
            <button class="btn primary" data-goal-open="${goal.id}">进入任务树</button>
            <button class="btn ghost" data-goal-workspace="${goal.id}">三栏学习空间</button>
          </div>
        </article>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="panel hero-goal">
        <div>
          <p class="eyebrow">Step 0</p>
          <h2>你现在最重要的学习目标是什么？</h2>
          <p class="microcopy">入口永远是目标；知识库永远是副产品，负责沉淀和上下文。</p>
          <div class="cta-group">
            <button class="btn primary" id="dashboard-create-goal">创建目标</button>
            <button class="btn ghost" id="dashboard-open-kb">查看知识库</button>
          </div>
        </div>
        <div class="hero-stats">
          <div>
            <p class="label">目标总数</p>
            <p class="strong">${summary.totalGoals}</p>
          </div>
          <div>
            <p class="label">活跃目标</p>
            <p class="strong">${summary.activeGoals}</p>
          </div>
          <div>
            <p class="label">最近截止</p>
            <p class="strong">${summary.nearestDeadlineLabel}</p>
          </div>
        </div>
      </section>

      <section class="goal-grid">
        ${goalCards || '<p class="microcopy">创建目标后，这里会展示任务树与今日路线。</p>'}
      </section>

      <section class="panel knowledge-remind">
        <div>
          <p class="eyebrow">目标 ≠ 知识库</p>
          <h3>目标驱动行为；知识库负责沉淀</h3>
          <p class="microcopy">
            目标是有限且可完成的项目；知识库是无限且长期的内容集合。
            两者通过 AI 自动连接，实现个性化教学与 RAG。
          </p>
        </div>
        <div class="knowledge-stats">
          <p class="label">自动收录条目</p>
          <p class="strong">${snapshot.knowledgeStats.totalItems}</p>
          <p class="microcopy">${snapshot.knowledgeStats.autoCaptureLabel}</p>
        </div>
      </section>
    `;
    this.bindClick('#dashboard-create-goal', () => this.viewModel.navigate('goalCreation'));
    this.bindClick('#dashboard-open-kb', () => this.viewModel.navigate('knowledgeBase'));
    this.contentHost.querySelectorAll<HTMLButtonElement>('[data-goal-open]').forEach((button) => {
      const id = button.dataset.goalOpen!;
      button.addEventListener('click', () => this.viewModel.openGoalWorkspace(id));
    });
    this.contentHost
      .querySelectorAll<HTMLButtonElement>('[data-goal-workspace]')
      .forEach((button) => {
        const id = button.dataset.goalWorkspace!;
        button.addEventListener('click', () => this.viewModel.startLearningWorkspace(id));
      });
  }

  private renderGoalCreation(snapshot: ViewSnapshot): void {
    const draft = snapshot.creationDraft;
    const optionValues = ['期末考试', '作业', '考研', '证书考试', '自主学习主题'];
    const selectedMaterials = draft.materials
      .map(
        (material) => `
        <span class="tag">
          ${material}
          <button type="button" data-remove-material="${material}" aria-label="移除 ${material}">✕</button>
        </span>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="panel creation">
        <h2>创建目标 · 小墨问你五个问题</h2>
        <ol class="creation-steps">
          <li>
            <p class="label">1. 你要准备什么？</p>
            <div class="option-row">
              ${optionValues
                .map(
                  (label) => `
                <button class="pill-btn ${draft.targetType === label ? 'active' : ''}"
                        data-target-type="${label}" type="button">${label}</button>`
                )
                .join('')}
            </div>
          </li>
          <li>
            <p class="label">2. 截止日期</p>
            <input id="goal-deadline" type="datetime-local" value="${draft.deadline}" />
          </li>
          <li>
            <p class="label">3. 当前掌握程度：${draft.mastery}%</p>
            <input id="goal-mastery" type="range" min="0" max="100" value="${draft.mastery}" />
          </li>
          <li>
            <p class="label">4. 你有哪些资料？</p>
            <div class="material-row">
              <input id="material-input" type="text" placeholder="Lecture slides, 错题本..." />
              <button class="btn ghost" id="add-material">添加</button>
            </div>
            <div class="tag-row">${selectedMaterials || '<p class="microcopy">可跳过，AI 会自动生成「未收录知识库」。</p>'}</div>
          </li>
          <li>
            <p class="label">5. 每天可投入学习时间：${Math.round(draft.dailyMinutes / 60)} 小时</p>
            <input id="daily-minutes" type="range" min="30" max="300" step="30" value="${draft.dailyMinutes}" />
          </li>
        </ol>
        <div class="creation-summary">
          <p>生成后：目标档案 + 初步任务树 + 「未收录知识库」将自动建成。</p>
          <button class="btn primary" id="goal-submit">生成目标档案</button>
        </div>
      </section>
    `;
    this.contentHost.querySelectorAll<HTMLButtonElement>('[data-target-type]').forEach((button) => {
      const value = button.dataset.targetType!;
      button.addEventListener('click', () => this.viewModel.updateGoalDraft('targetType', value));
    });
    this.bindInput('#goal-deadline', (value) => this.viewModel.updateGoalDraft('deadline', value));
    this.bindInput('#goal-mastery', (value) =>
      this.viewModel.updateGoalDraft('mastery', Number(value))
    );
    this.bindInput('#daily-minutes', (value) =>
      this.viewModel.updateGoalDraft('dailyMinutes', Number(value))
    );
    this.bindClick('#add-material', () => {
      const input = this.contentHost.querySelector<HTMLInputElement>('#material-input');
      if (!input) return;
      this.viewModel.appendMaterial(input.value);
      input.value = '';
    });
    this.contentHost
      .querySelectorAll<HTMLButtonElement>('[data-remove-material]')
      .forEach((button) => {
        const value = button.dataset.removeMaterial!;
        button.addEventListener('click', () => this.viewModel.removeMaterial(value));
      });
    this.bindClick('#goal-submit', () => this.viewModel.submitGoalCreation());
  }

  private renderGoalWorkspace(snapshot: ViewSnapshot): void {
    const goal = snapshot.activeGoal;
    if (!goal) {
      this.contentHost.innerHTML = '<p class="microcopy">选择一个目标以查看任务树。</p>';
      return;
    }
    const routeList = goal.todayRoute
      .map(
        (item) => `
        <li class="route-item ${item.status}">
          <div>
            <p class="label">${item.kind}</p>
            <strong>${item.title}</strong>
            <p class="microcopy">${item.detail}</p>
          </div>
          <div class="route-meta">
            <span class="pill">${item.etaMinutes} min</span>
            <button class="btn ghost" data-route-learn="${item.id}" ${
              item.status === 'locked' ? 'disabled' : ''
            }>进入三栏</button>
            <button class="btn primary" data-route-complete="${item.id}" ${
              item.status === 'available' || item.status === 'in-progress' ? '' : 'disabled'
            }>标记完成</button>
          </div>
        </li>`
      )
      .join('');
    const weekly = goal.weeklyPlan
      .map(
        (plan) => `
        <article>
          <p class="eyebrow">${plan.day}</p>
          <strong>${plan.focus}</strong>
          <p class="microcopy">投入 ${plan.hours} 小时 · ${plan.aiTip}</p>
        </article>`
      )
      .join('');
    const highlights =
      goal.highlights.length > 0
        ? goal.highlights
            .map(
              (highlight) => `
          <article>
            <p class="eyebrow">${highlight.type}</p>
            <strong>${highlight.title}</strong>
            <p class="microcopy">${highlight.excerpt}</p>
            <p class="label">${highlight.source}</p>
          </article>`
            )
            .join('')
        : '<p class="microcopy">学习过程中生成的对话、笔记、Quiz 会自动沉入知识库。</p>';
    const taskTree = this.renderTaskTree(goal.taskTree);
    this.contentHost.innerHTML = `
      <section class="panel today-route">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Step 2</p>
            <h3>今日路线 · 任务树入口</h3>
          </div>
          <button class="btn ghost" id="route-open-kb">查看关联知识库</button>
        </div>
        <ul class="route-list">${routeList}</ul>
      </section>

      <section class="panel weekly-plan">
        <div class="panel-head">
          <p class="eyebrow">Step 3</p>
          <h3>AI 排好的本周计划</h3>
        </div>
        <div class="grid-4">${weekly}</div>
      </section>

      <section class="panel task-tree">
        <div class="panel-head">
          <p class="eyebrow">任务树</p>
          <h3>所有节点均可链接知识库</h3>
        </div>
        <div>${taskTree}</div>
      </section>

      <section class="panel highlights">
        <div class="panel-head">
          <p class="eyebrow">自动整理</p>
          <h3>知识库即时沉淀</h3>
        </div>
        <div class="grid-3">${highlights}</div>
      </section>
    `;
    this.bindClick('#route-open-kb', () => this.viewModel.navigate('knowledgeBase'));
    this.contentHost.querySelectorAll<HTMLButtonElement>('[data-route-learn]').forEach((button) => {
      const id = button.dataset.routeLearn!;
      button.addEventListener('click', () => this.viewModel.startLearningWorkspace(id));
    });
    this.contentHost
      .querySelectorAll<HTMLButtonElement>('[data-route-complete]')
      .forEach((button) => {
        const id = button.dataset.routeComplete!;
        button.addEventListener('click', () => this.viewModel.markRouteItemComplete(id));
      });
  }

  private renderTaskTree(nodes: TaskNode[]): string {
    if (!nodes) return '';
    const renderNode = (node: NonNullable<typeof nodes>[number]): string => `
      <div class="tree-node ${node.status}">
        <div>
          <p class="label">${node.type}</p>
          <strong>${node.title}</strong>
          <p class="microcopy">${node.summary}</p>
        </div>
        <div class="node-meta">
          <span>${node.xp} XP</span>
          <button class="btn ghost" data-node-workspace="${node.id}" ${
            node.status === 'locked' ? 'disabled' : ''
          }>开启三栏</button>
        </div>
        ${node.children ? `<div class="tree-children">${node.children.map(renderNode).join('')}</div>` : ''}
      </div>
    `;
    const markup = nodes.map(renderNode).join('');
    // After building markup, bind buttons once appended.
    window.setTimeout(() => {
      this.contentHost.querySelectorAll<HTMLButtonElement>('[data-node-workspace]').forEach((button) => {
        const id = button.dataset.nodeWorkspace!;
        button.addEventListener('click', () => this.viewModel.startLearningWorkspace(id));
      });
    }, 0);
    return markup;
  }

  private renderLearningWorkspace(snapshot: ViewSnapshot): void {
    const asset = snapshot.workspace.activeAsset;
    this.contentHost.innerHTML = `
      <section class="workspace">
        <div class="workspace-col reader">
          <p class="eyebrow">左栏 · 多媒体阅读器</p>
          <h3>${asset.title}</h3>
          <p class="microcopy">${asset.metadata}</p>
          <p class="label">章节</p>
          <p>${asset.chapter}</p>
          <p class="label">进度 ${asset.progress}%</p>
          <progress value="${asset.progress}" max="100"></progress>
          <div class="actions">
            <button class="btn ghost" id="workspace-back">返回任务树</button>
            <button class="btn primary" id="workspace-open-kb">查看沉淀</button>
          </div>
        </div>
        <div class="workspace-col notes">
          <p class="eyebrow">中栏 · 即时笔记</p>
          <textarea id="note-editor">${snapshot.workspace.noteDraft}</textarea>
          <div class="note-meta">
            <p>最近收录：${snapshot.workspace.syncedNotes.join(' · ') || '暂无'}</p>
            <button class="btn primary" id="sync-note">一键收录</button>
          </div>
        </div>
        <div class="workspace-col coach">
          <p class="eyebrow">右栏 · AI 个性化教师</p>
          <div class="coach-card">
            <p>${snapshot.workspace.coachFocus}</p>
            <ul>
              ${snapshot.workspace.quizQueue.map((item) => `<li>${item}</li>`).join('')}
            </ul>
            <div class="actions">
              <button class="btn ghost" id="workspace-go-chat">打开 AI 对话</button>
              <button class="btn primary" id="workspace-sync">同步到知识库</button>
            </div>
          </div>
        </div>
      </section>
    `;
    this.bindClick('#workspace-back', () => this.viewModel.openGoalWorkspace());
    this.bindClick('#workspace-open-kb', () => this.viewModel.navigate('knowledgeBase'));
    this.bindClick('#sync-note', () => this.viewModel.syncWorkspaceNote());
    this.bindClick('#workspace-sync', () => this.viewModel.syncWorkspaceNote());
    this.bindClick('#workspace-go-chat', () => this.viewModel.navigate('aiChat'));
    this.bindInput('#note-editor', (value) => this.viewModel.updateWorkspaceNote(value));
  }

  private renderKnowledgeBase(snapshot: ViewSnapshot): void {
    const sections = snapshot.knowledgeBase.sections
      .map(
        (section) => `
        <section class="kb-section">
          <header>
            <div>
              <p class="eyebrow">${section.id === 'kb-current' ? '绑定目标' : '长期知识库'}</p>
              <h3>${section.title}</h3>
              <p class="microcopy">${section.description}</p>
            </div>
          </header>
          <div class="kb-folders">
            ${section.folders
              .map(
                (folder) => `
              <article>
                <p class="label">${folder.title}</p>
                <strong>${folder.items}</strong>
                <p class="microcopy">${folder.description}</p>
                <p class="label">最近同步 ${folder.lastSynced}</p>
              </article>`
              )
              .join('')}
          </div>
        </section>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="panel kb-head">
        <div>
          <p class="eyebrow">Step 4</p>
          <h2>知识库是系统底层 · 不是入口</h2>
          <p class="microcopy">
            目标驱动学习过程；知识库自动收录对话、笔记、Quiz、错题等，随时可分享 / 邀请协作者。
          </p>
        </div>
        <label class="switch-row" for="toggle-capture">
          <span>自动收录</span>
          <input type="checkbox" id="toggle-capture" ${snapshot.knowledgeBase.autoCaptureEnabled ? 'checked' : ''}/>
          <span class="switch" aria-hidden="true"></span>
        </label>
      </section>
      ${sections}
    `;
    this.bindInput('#toggle-capture', (checked: boolean) => this.viewModel.toggleAutoCapture(checked));
  }

  private renderAiChat(snapshot: ViewSnapshot): void {
    const messages = snapshot.chatHistory
      .map(
        (msg) => `
        <div class="chat-msg ${msg.role}">
          <p class="label">${msg.role === 'ai' ? '小墨' : '我'} · ${msg.timestamp}</p>
          <p>${msg.content}</p>
        </div>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="panel chat">
        <div class="panel-head">
          <p class="eyebrow">Step 5</p>
          <h3>AI 全程理解目标 + 内容 + 用户</h3>
          <p class="microcopy">AI 负责理解、收敛、分类，并不断给出下一条路径。</p>
        </div>
        <div class="chat-history">${messages}</div>
        <div class="chat-input">
          <textarea id="chat-input" placeholder="问小墨：接下来我该怎么学？"></textarea>
          <button class="btn primary" id="chat-send">发送</button>
        </div>
      </section>
    `;
    this.bindClick('#chat-send', () => {
      const textarea = this.contentHost.querySelector<HTMLTextAreaElement>('#chat-input');
      if (!textarea) return;
      this.viewModel.sendChat(textarea.value);
      textarea.value = '';
    });
  }

  private renderCalendar(snapshot: ViewSnapshot): void {
    const items = snapshot.timeline
      .map(
        (event) => `
        <article class="calendar-item">
          <p class="eyebrow">${event.day}</p>
          <strong>${event.title}</strong>
          <p class="microcopy">${event.time} · ${event.focus}</p>
          <button class="btn ghost" data-calendar-start="${event.id}">打开任务树</button>
        </article>`
      )
      .join('');
    this.contentHost.innerHTML = `
      <section class="panel calendar">
        <div class="panel-head">
          <p class="eyebrow">Step 6</p>
          <h3>我的计划 · 由目标串起的唯一入口</h3>
          <p class="microcopy">每天进入任务树界面，AI 会按照目标推送今日路线。</p>
        </div>
        <div class="calendar-list">${items}</div>
      </section>
    `;
    this.contentHost.querySelectorAll<HTMLButtonElement>('[data-calendar-start]').forEach((button) => {
      button.addEventListener('click', () => this.viewModel.openGoalWorkspace());
    });
  }

  private renderSettings(snapshot: ViewSnapshot): void {
    this.contentHost.innerHTML = `
      <section class="panel settings">
        <h3>系统偏好</h3>
        <div class="setting-row">
          <div>
            <strong>默认入口</strong>
            <p class="microcopy">保持“目标优先”，知识库仅作上下文</p>
          </div>
          <button class="btn ghost" id="settings-goal">回到目标</button>
        </div>
        <div class="setting-row">
          <div>
            <strong>未收录知识库</strong>
            <p class="microcopy">无需手动分类，AI 会在合适的时机分发</p>
          </div>
          <button class="btn ghost" id="settings-kb">查看知识库</button>
        </div>
      </section>
    `;
    this.bindClick('#settings-goal', () => this.viewModel.navigate('goalDashboard'));
    this.bindClick('#settings-kb', () => this.viewModel.navigate('knowledgeBase'));
  }

  private bindClick(selector: string, handler: () => void): void {
    const element = this.contentHost.querySelector<HTMLElement>(selector);
    element?.addEventListener('click', handler);
  }

  private bindInput(selector: string, handler: (value: any) => void): void {
    const element = this.contentHost.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
    element?.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      handler(target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value);
    });
    if (element && element.type === 'range') {
      element.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        handler(target.value);
      });
    }
  }

  private renderToast(message: string, tone: string): void {
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    this.toastHost.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 200);
    }, 2600);
  }
}
