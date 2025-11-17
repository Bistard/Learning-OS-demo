import { Page, XiaoMoState } from '../models/xiaoMoModels';
import { XiaoMoViewModel } from '../viewModel/xiaoMoViewModel';
import { renderLanding, renderQuestionnaire, renderTaskTree, renderUpload } from './flowTemplates';
import { renderCompletion, renderLearning, renderMock, renderPractice, renderPracticeResult, renderReview } from './sessionTemplates';

type ToastTone = 'success' | 'info';

interface ToastPayload {
  readonly message: string;
  readonly tone: ToastTone;
}

const NAV_LINKS: Array<{ label: string; page: Page }> = [
  { label: '上传资料', page: 'upload' },
  { label: '配置问卷', page: 'questionnaire' },
  { label: '任务树', page: 'tasks' },
  { label: '模拟考', page: 'mock' },
];

const CHAT_HINTS: Record<Page, string> = {
  landing: '当前页面：首页。点击“开始冲刺”即可进入上传环节。',
  upload: '上传 6 项资料后即可生成配置问卷。',
  questionnaire: '填写时间偏好与押题设置，小墨会调整节点。',
  tasks: '点击任意节点进入学习/练习/复盘，完成后会加 XP。',
  learning: '本节点聚焦特征值与对角化，记得用快捷问答。',
  practice: '提交在线答案或拍照，小墨会给出批改反馈。',
  review: '将错题拖拽到时间轴即可规划复习节奏。',
  mock: '启动 60 分钟倒计时，交卷后自动批改。',
  complete: '冲刺完成！可以复盘错题或导出考前小抄。',
};

export class XiaoMoView {
  private uploadTimer: number | null = null;
  private mockInterval: number | null = null;

  constructor(
    private readonly viewModel: XiaoMoViewModel,
    private readonly root: HTMLElement,
    private readonly toastArea: HTMLElement,
    private readonly chatPanel: HTMLElement,
  ) {
    this.viewModel.subscribe((state) => this.render(state));
  }

  private render(state: Readonly<XiaoMoState>): void {
    this.root.innerHTML = this.renderShell(state);
    this.renderChatPanel(state);
    this.bindGlobalNav();
    this.bindPageEvents(state);
    this.applyProgressWidths();
  }

  private renderShell(state: Readonly<XiaoMoState>): string {
    return `
      <div class="shell">
        ${this.renderHeader(state.page)}
        <main class="page-area">${this.renderPage(state)}</main>
      </div>
    `;
  }

  private renderHeader(currentPage: Page): string {
    return `
      <header class="top-bar">
        <button class="logo-area" data-nav="landing">
          <span class="logo-icon droplet" aria-hidden="true"></span>
          <div>
            <p class="logo-eyebrow">XiaoMo</p>
            <p class="logo-title">考前 3 天冲刺</p>
          </div>
        </button>
        <nav class="nav-links">
          ${NAV_LINKS.map(
            (item) => `
              <button class="nav-btn ${currentPage === item.page ? 'active' : ''}" data-nav="${item.page}">
                ${item.label}
              </button>
            `,
          ).join('')}
        </nav>
        <div class="nav-hint">
          <span class="hint-dot"></span>今日建议：完成“特征值与对角化”模板
        </div>
      </header>
    `;
  }

  private renderPage(state: Readonly<XiaoMoState>): string {
    switch (state.page) {
      case 'landing':
        return renderLanding();
      case 'upload':
        return renderUpload(state.uploadItems);
      case 'questionnaire':
        return renderQuestionnaire(state, state.questionnaire.deadline || this.defaultDeadline());
      case 'tasks':
        return renderTaskTree(state, this.countdownCopy(state), (status) => this.taskStatusCopy(status), (type) => this.taskCtaCopy(type));
      case 'learning':
        return renderLearning();
      case 'practice':
        return renderPractice(state.practiceFeedback, state.practiceFeedback ? renderPracticeResult(state.practiceFeedback) : '');
      case 'review':
        return renderReview();
      case 'mock':
        return renderMock(state, this.mockTimerCopy(state));
      case 'complete':
        return renderCompletion(state, this.totalXp(state));
      default:
        return '';
    }
  }

  private bindGlobalNav(): void {
    this.root.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const destination = target.getAttribute('data-nav') as Page;
        if (destination) {
          this.viewModel.navigate(destination);
        }
      });
    });
  }

  private bindPageEvents(state: Readonly<XiaoMoState>): void {
    switch (state.page) {
      case 'landing':
        this.bindLandingEvents();
        break;
      case 'upload':
        this.bindUploadEvents();
        break;
      case 'questionnaire':
        this.bindQuestionnaireEvents();
        break;
      case 'tasks':
        this.bindTaskEvents(state);
        break;
      case 'learning':
        this.bindLearningEvents();
        break;
      case 'practice':
        this.bindPracticeEvents();
        break;
      case 'review':
        this.bindReviewEvents();
        break;
      case 'mock':
        this.bindMockEvents();
        break;
      case 'complete':
        this.bindCompletionEvents();
        break;
      default:
        break;
    }
  }

  private bindLandingEvents(): void {
    this.root.querySelector('#start-btn')?.addEventListener('click', () => this.viewModel.navigate('upload'));
    this.root.querySelector('#view-flow')?.addEventListener('click', () =>
      this.queueToast({ message: '示例任务树：上传 → 问卷 → 任务树 → 练习 → 模拟考。', tone: 'info' }),
    );
  }

  private bindUploadEvents(): void {
    this.root.querySelector('#upload-all')?.addEventListener('click', () => {
      if (this.uploadTimer) {
        window.clearInterval(this.uploadTimer);
      }
      this.uploadTimer = window.setInterval(() => {
        const done = this.viewModel.simulateUploadStep();
        if (done && this.uploadTimer) {
          window.clearInterval(this.uploadTimer);
          this.queueToast({ message: '资料已上传，正在生成个性化任务树', tone: 'info' });
        }
      }, 400);
    });
    this.root.querySelector('#next-config')?.addEventListener('click', () => this.viewModel.navigate('questionnaire'));
  }

  private bindQuestionnaireEvents(): void {
    const form = this.root.querySelector('#q-form') as HTMLFormElement | null;
    const warning = this.root.querySelector('#warning') as HTMLElement | null;
    const dailyRange = form?.querySelector('input[name="daily"]') as HTMLInputElement | null;
    const dailyValue = this.root.querySelector('#daily-value');
    dailyRange?.addEventListener('input', () => {
      if (dailyValue && warning) {
        dailyValue.textContent = `${dailyRange.value} h`;
        const hours = parseFloat(dailyRange.value);
        warning.textContent = hours < 3 ? '建议至少每天 3 小时以完成关键节点' : '';
      }
    });
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      this.viewModel.applyQuestionnaire({
        deadline: (data.get('deadline') as string) || this.defaultDeadline(),
        dailyHours: parseFloat(data.get('daily') as string),
        examDuration: parseInt(data.get('duration') as string, 10),
        isSchoolCourse: Boolean(data.get('school')),
        mode: data.get('mode') as '知识获取 + 备考' | '快速应试',
        aiPrediction: Boolean(data.get('predict')),
      });
      this.queueToast({ message: '生成完成：个性化任务树已就绪', tone: 'success' });
      this.viewModel.navigate('tasks');
    });
  }

  private bindTaskEvents(state: Readonly<XiaoMoState>): void {
    this.root.querySelectorAll('.task-card').forEach((card) => {
      card.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const id = target.dataset.id;
        const task = state.tasks.find((t) => t.id === id);
        if (!task || task.status === 'locked') {
          return;
        }
        this.viewModel.navigate(this.targetPageByTaskType(task.type));
      });
    });
    this.root.querySelector('#open-review')?.addEventListener('click', () => this.viewModel.navigate('review'));
    this.root.querySelector('#open-mock')?.addEventListener('click', () => this.viewModel.navigate('mock'));
    this.root.querySelector('#to-complete')?.addEventListener('click', () => this.viewModel.navigate('complete'));
  }

  private bindLearningEvents(): void {
    this.root.querySelector('#complete-node')?.addEventListener('click', () => {
      this.viewModel.completeTask('diag', 'rank-nullity');
      this.queueToast({ message: '已掌握：特征值与对角化（+1 XP）', tone: 'success' });
      this.viewModel.navigate('tasks');
    });
  }

  private bindPracticeEvents(): void {
    this.root.querySelector('#upload-photo')?.addEventListener('click', () =>
      this.queueToast({ message: '已模拟上传，等待小墨批改', tone: 'info' }),
    );
    this.root.querySelector('#submit-practice')?.addEventListener('click', () => {
      const textarea = this.root.querySelector('#practice-answer') as HTMLTextAreaElement | null;
      const answer = textarea?.value || '';
      const feedback = this.viewModel.evaluatePractice(answer);
      const result = this.root.querySelector('#practice-result') as HTMLElement | null;
      if (result) {
        result.innerHTML = renderPracticeResult(feedback);
        result.removeAttribute('hidden');
      }
      this.queueToast({ message: feedback.verdict === 'correct' ? 'Nice！进步啦' : '别急，我们来拆解错误点 →', tone: 'info' });
    });
    this.root.querySelector('#complete-practice')?.addEventListener('click', () => {
      this.viewModel.completeTask('rank-nullity', 'orthogonal');
      this.queueToast({ message: '练习节点完成，XP +25', tone: 'success' });
      this.viewModel.navigate('tasks');
    });
  }

  private bindReviewEvents(): void {
    this.root.querySelector('#schedule')?.addEventListener('click', () =>
      this.queueToast({ message: '已加入今日复习 20:00 时段', tone: 'success' }),
    );
  }

  private bindMockEvents(): void {
    const startBtn = this.root.querySelector('#start-mock');
    startBtn?.addEventListener('click', () => {
      if (this.mockInterval) {
        window.clearInterval(this.mockInterval);
      }
      this.viewModel.startMock(60 * 60);
      this.mockInterval = window.setInterval(() => this.viewModel.tickMock(), 1000);
      this.queueToast({ message: '计时已开始，保持节奏', tone: 'info' });
    });
    this.root.querySelector('#submit-mock')?.addEventListener('click', () => {
      if (this.mockInterval) {
        window.clearInterval(this.mockInterval);
      }
      this.viewModel.finishMock('得分 78 / 100 · 弱点：特征值重根、最小二乘细节');
      this.queueToast({ message: '模拟考完成，已生成弱点雷达图', tone: 'success' });
    });
  }

  private bindCompletionEvents(): void {
    this.root.querySelector('#export-cheatsheet')?.addEventListener('click', () =>
      this.queueToast({ message: '已准备 PDF 小抄（示意）', tone: 'info' }),
    );
  }

  private renderChatPanel(state: Readonly<XiaoMoState>): void {
    const hint = CHAT_HINTS[state.page] || '保持节奏，有任何问题随时询问小墨。';
    this.chatPanel.innerHTML = `
      <div class="chat-shell">
        <div class="chat-head">
          <div class="droplet-mascot tiny" aria-hidden="true"></div>
          <div>
            <h4>小墨助理 · 问答</h4>
            <p class="chat-tip">墨滴会根据当前页面给出提示</p>
          </div>
        </div>
        <div class="chat-msg">
          <p class="label">系统提示</p>
          <p>${hint}</p>
        </div>
      </div>
    `;
  }

  private targetPageByTaskType(type: string): Page {
    switch (type) {
      case 'learn':
        return 'learning';
      case 'practice':
        return 'practice';
      case 'review':
        return 'review';
      default:
        return 'mock';
    }
  }

  private taskStatusCopy(status: string): string {
    switch (status) {
      case 'complete':
        return '已完成 + XP';
      case 'available':
        return '可开始';
      default:
        return '待解锁';
    }
  }

  private taskCtaCopy(type: string): string {
    switch (type) {
      case 'learn':
        return '进入学习节点';
      case 'practice':
        return '开始练习批改';
      case 'mock':
        return '进入模拟考';
      default:
        return '查看错题本';
    }
  }

  private countdownCopy(state: Readonly<XiaoMoState>): string {
    if (!state.countdownTarget) {
      return '待设置考试时间';
    }
    const now = new Date();
    const diff = state.countdownTarget.getTime() - now.getTime();
    if (diff <= 0) {
      return '0 天 0 小时';
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days} 天 ${hours} 小时`;
  }

  private mockTimerCopy(state: Readonly<XiaoMoState>): string {
    const minutes = Math.floor(state.mockStatus.remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (state.mockStatus.remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  private totalXp(state: Readonly<XiaoMoState>): number {
    return state.tasks.filter((t) => t.status === 'complete').reduce((acc, task) => acc + task.xp, 0);
  }

  private queueToast(toast: ToastPayload): void {
    const el = document.createElement('div');
    el.className = `toast ${toast.tone}`;
    el.textContent = toast.message;
    this.toastArea.appendChild(el);
    window.setTimeout(() => el.classList.add('show'), 50);
    window.setTimeout(() => {
      el.classList.remove('show');
      window.setTimeout(() => el.remove(), 300);
    }, 2500);
  }

  private applyProgressWidths(): void {
    this.root.querySelectorAll('.bar').forEach((bar) => {
      const value = bar.getAttribute('data-progress');
      if (!value) {
        return;
      }
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = `${value}%`;
      bar.innerHTML = '';
      bar.appendChild(fill);
    });
  }

  private defaultDeadline(): string {
    const now = new Date();
    now.setDate(now.getDate() + 3);
    now.setHours(21, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  }
}
