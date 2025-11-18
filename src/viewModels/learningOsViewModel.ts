/**
 * Learning OS view-model orchestrates domain state mutations + derived data.
 *
 * Usage:
 * ```ts
 * const vm = new LearningOsViewModel();
 * vm.subscribe((snapshot) => console.log(snapshot.page));
 * vm.navigate('tasks');
 * ```
 */

import {
  COUNTDOWN_LOOKAHEAD_DAYS,
  LearningOsState,
  MockExamStatus,
  Page,
  PLAN_GENERATION_DELAY_MS,
  QuestionnaireState,
  TaskKind,
  TaskNode,
  TaskStatus,
  Toast,
  ToastTone,
  UPLOAD_SIMULATION_INTERVAL_MS,
  MOCK_EXAM_DURATION_SECONDS,
  createInitialState,
  nextDeadlineIso,
} from '../models/learningOsModel';

export interface ViewSnapshot extends LearningOsState {
  uploadProgress: number;
  uploadedCount: number;
  totalUploads: number;
  completedTasks: number;
  totalTasks: number;
  completionPercent: number;
  totalXp: number;
  countdownLabel: string;
  countdownActive: boolean;
  mockTimerLabel: string;
}

export type ViewUpdateListener = (snapshot: ViewSnapshot) => void;
export type ToastListener = (toast: Toast) => void;

const COUNTDOWN_TICK_INTERVAL = 1000 * 60;

export class LearningOsViewModel {
  private state: LearningOsState = createInitialState();
  private viewListeners = new Set<ViewUpdateListener>();
  private toastListeners = new Set<ToastListener>();
  private uploadTimer: number | null = null;
  private countdownTimer: number | null = null;
  private mockTimer: number | null = null;

  /**
   * @param nowProvider Allows deterministic testing by injecting a clock.
   */
  constructor(private readonly nowProvider: () => Date = () => new Date()) {}

  /**
   * Registers a listener that reacts to view-state changes.
   *
   * @param listener Callback receiving the latest snapshot.
   * @returns Function for disposing the subscription.
   */
  public subscribe(listener: ViewUpdateListener): () => void {
    this.viewListeners.add(listener);
    listener(this.buildSnapshot());
    return () => this.viewListeners.delete(listener);
  }

  /**
   * Subscribes to toast notifications triggered by domain events.
   *
   * @param listener Toast handler.
   * @returns Cleanup hook.
   */
  public onToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  /**
   * Imperative navigation triggered by the view.
   *
   * @param page Next route id.
   */
  public navigate(page: Page): void {
    if (this.state.page === page) return;
    this.updateState({ page });
  }

  /**
   * Simulates uploading the prepared资料, sequentially flipping each item.
   */
  public simulateUpload(): void {
    if (this.state.isUploading) {
      this.emitToast('正在上传，请稍候', 'info');
      return;
    }
    this.updateState({ isUploading: true });
    this.uploadTimer = window.setInterval(() => {
      const nextIndex = this.state.uploads.findIndex((item) => item.status === 'pending');
      if (nextIndex === -1) {
        this.stopUploadTimer();
        this.emitToast('资料已上传，正在生成个性化任务树', 'info');
        this.updateState({ isUploading: false });
        return;
      }
      const uploads = this.state.uploads.map((item, idx) =>
        idx === nextIndex ? { ...item, status: 'uploaded' } : item
      );
      this.state = { ...this.state, uploads };
      this.publish();
    }, UPLOAD_SIMULATION_INTERVAL_MS);
  }

  /**
   * Persists questionnaire preferences.
   *
   * @param payload Form payload from the view.
   */
  public updateQuestionnaire(payload: QuestionnaireState): void {
    this.updateState({ questionnaire: payload });
  }

  /**
   * Generates personalized任务树 after一个小延迟.
   *
   * @returns Promise resolved once tasks + countdown are ready.
   */
  public async generatePersonalizedPlan(): Promise<void> {
    await this.delay(PLAN_GENERATION_DELAY_MS);
    const countdownTarget = this.getEffectiveDeadline();
    const resetTasks = this.state.tasks.map((task) =>
      task.id === 'diag' ? { ...task, status: 'available' } : { ...task, status: 'locked' }
    );
    this.stopCountdownTicker();
    this.updateState({
      tasks: resetTasks,
      countdownTarget,
      practiceResultVisible: false,
      page: 'tasks',
    });
    this.startCountdownTicker();
    this.emitToast('生成完成：个性化任务树已准备好', 'success');
  }

  /**
   * Centralizes hero CTA copy explaining流程.
   */
  public showFlowGuide(): void {
    this.emitToast('点击任务节点即可进入学习 / 练习 / 模拟考', 'info');
  }

  /**
   * Opens the correct页面 based on点击的任务卡片.
   *
   * @param taskId Identifier from the card dataset.
   */
  public enterTask(taskId: string | undefined): void {
    if (!taskId) return;
    const task = this.state.tasks.find((candidate) => candidate.id === taskId);
    if (!task || task.status === 'locked') return;
    const nextPage = this.mapTaskTypeToPage(task.type);
    this.navigate(nextPage);
  }

  /**
   * Marks the learning node完成并解锁下一步.
   */
  public completeLearningNode(): void {
    this.markTaskComplete('diag');
    this.unlockTask('rank-nullity');
    this.emitToast('已掌握：特征值与对角化（+30 XP）', 'success');
    this.navigate('tasks');
  }

  /**
   * Triggers模拟拍照上传的提示.
   */
  public simulatePhotoUpload(): void {
    this.emitToast('已模拟上传手写答案，等待批改', 'info');
  }

  /**
   * 展示批改结果，供 view 显示静态反馈卡片.
   */
  public submitPracticeAnswer(): void {
    this.updateState({ practiceResultVisible: true });
    this.emitToast('批改完成，已加入错题本（若错误）', 'info');
  }

  /**
   * 完成练习节点并解锁 “正交投影 & 最小二乘”.
   */
  public completePracticeNode(): void {
    this.markTaskComplete('rank-nullity');
    this.unlockTask('orthogonal');
    this.emitToast('Nice！进步啦 🖤', 'success');
    this.navigate('tasks');
  }

  /**
   * Schedules 晚间复刷提醒.
   */
  public scheduleReviewReminder(): void {
    this.emitToast('已安排复刷：今晚 20:00', 'success');
  }

  /**
   * 完成错题本复盘并解锁模拟考.
   */
  public completeReviewNode(): void {
    this.markTaskComplete('review');
    this.unlockTask('mock');
    this.navigate('tasks');
  }

  /**
   * 启动 60 分钟模拟考倒计时.
   */
  public startMockExam(): void {
    if (this.state.mockStatus === 'running') return;
    this.stopMockTimer();
    this.updateState({ mockStatus: 'running', mockTimerSeconds: MOCK_EXAM_DURATION_SECONDS });
    this.mockTimer = window.setInterval(() => {
      if (this.state.mockTimerSeconds <= 0) {
        this.completeMockExam();
        return;
      }
      this.state = { ...this.state, mockTimerSeconds: this.state.mockTimerSeconds - 1 };
      this.publish();
    }, 1000);
    this.emitToast('计时已开始，保持节奏', 'info');
  }

  /**
   * 结束模拟考并展示雷达反馈.
   */
  public completeMockExam(): void {
    this.stopMockTimer();
    this.markTaskComplete('mock');
    this.updateState({ mockStatus: 'complete', mockTimerSeconds: 0, mockResultVisible: true });
    this.emitToast('模拟考完成，已生成弱点雷达图', 'success');
  }

  /**
   * 导出考前小抄（示意提示）.
   */
  public exportCheatsheet(): void {
    this.emitToast('已准备 PDF 小抄（示意）', 'info');
  }

  /**
   * 提供 questionnaire 默认截止时间.
   *
   * @returns ISO 字符串.
   */
  public getEffectiveDeadline(): string {
    return this.state.questionnaire.deadline || nextDeadlineIso(COUNTDOWN_LOOKAHEAD_DAYS);
  }

  private publish(): void {
    const snapshot = this.buildSnapshot();
    this.viewListeners.forEach((listener) => listener(snapshot));
  }

  private buildSnapshot(): ViewSnapshot {
    const uploadedCount = this.state.uploads.filter((item) => item.status === 'uploaded').length;
    const totalUploads = this.state.uploads.length;
    const uploadProgress = totalUploads === 0 ? 0 : Math.round((uploadedCount / totalUploads) * 100);
    const completedTasks = this.state.tasks.filter((task) => task.status === 'complete').length;
    const totalTasks = this.state.tasks.length;
    const completionPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const totalXp = this.state.tasks
      .filter((task) => task.status === 'complete')
      .reduce((acc, task) => acc + task.xp, 0);
    return {
      ...this.state,
      uploadProgress,
      uploadedCount,
      totalUploads,
      completedTasks,
      totalTasks,
      completionPercent,
      totalXp,
      countdownLabel: this.computeCountdownLabel(),
      countdownActive: Boolean(this.state.countdownTarget),
      mockTimerLabel: this.formatMockTimer(this.state.mockTimerSeconds),
    };
  }

  private updateState(partial: Partial<LearningOsState>): void {
    this.state = { ...this.state, ...partial };
    this.publish();
  }

  private emitToast(message: string, tone: ToastTone): void {
    const toast: Toast = { message, tone };
    this.toastListeners.forEach((listener) => listener(toast));
  }

  private mapTaskTypeToPage(kind: TaskKind): Page {
    switch (kind) {
      case 'learn':
        return 'learning';
      case 'practice':
        return 'practice';
      case 'review':
        return 'review';
      case 'mock':
        return 'mock';
      default:
        return 'tasks';
    }
  }

  private markTaskComplete(taskId: string): void {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((task) =>
        task.id === taskId ? { ...task, status: 'complete' } : task
      ),
    };
    this.publish();
  }

  private unlockTask(taskId: string): void {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((task) =>
        task.id === taskId && task.status === 'locked' ? { ...task, status: 'available' } : task
      ),
    };
    this.publish();
  }

  private computeCountdownLabel(): string {
    if (!this.state.countdownTarget) {
      return '距考试 -- 天 -- 小时';
    }
    const target = new Date(this.state.countdownTarget);
    const diff = target.getTime() - this.nowProvider().getTime();
    if (diff <= 0) return '距考试 0 天 0 小时';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `距考试 ${days} 天 ${hours} 小时`;
  }

  private formatMockTimer(seconds: number): string {
    const min = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  private stopUploadTimer(): void {
    if (this.uploadTimer) {
      window.clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
  }

  private startCountdownTicker(): void {
    this.countdownTimer = window.setInterval(() => this.publish(), COUNTDOWN_TICK_INTERVAL);
  }

  private stopCountdownTicker(): void {
    if (this.countdownTimer) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private stopMockTimer(): void {
    if (this.mockTimer) {
      window.clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
  }

  private delay(duration: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, duration);
    });
  }
}
