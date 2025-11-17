/**
 * @fileoverview ViewModel layer for XiaoMo sprint demo.
 */

import { PracticeFeedback, QuestionnaireState, TaskStatus, XiaoMoState, Page, createInitialState } from '../models/xiaoMoModels';

type Subscriber = (state: Readonly<XiaoMoState>) => void;

export interface QuestionnairePayload extends QuestionnaireState {
  deadline: string;
}

export class XiaoMoViewModel {
  private state: XiaoMoState = createInitialState();
  private readonly subscribers = new Set<Subscriber>();

  public subscribe(listener: Subscriber): () => void {
    this.subscribers.add(listener);
    listener(this.state);
    return () => this.subscribers.delete(listener);
  }

  public getState(): Readonly<XiaoMoState> {
    return this.state;
  }

  public reset(): void {
    this.state = createInitialState();
    this.emit();
  }

  public navigate(page: Page): void {
    this.state.page = page;
    this.emit();
  }

  public simulateUploadStep(): boolean {
    const next = this.state.uploadItems.find((item) => item.status === 'pending');
    if (next) {
      next.status = 'uploaded';
      this.emit();
    }
    return this.areAllUploadsComplete();
  }

  public areAllUploadsComplete(): boolean {
    return this.state.uploadItems.every((item) => item.status === 'uploaded');
  }

  public applyQuestionnaire(payload: QuestionnairePayload): void {
    this.state.questionnaire = { ...payload };
    this.state.countdownTarget = payload.deadline ? new Date(payload.deadline) : null;
    this.resetTaskStatuses();
    this.emit();
  }

  public setPracticeFeedback(feedback: PracticeFeedback | null): void {
    this.state.practiceFeedback = feedback;
    this.emit();
  }

  public evaluatePractice(answer: string): PracticeFeedback {
    const normalized = answer.trim().toLowerCase();
    const isCorrect = normalized.includes('r=2') || normalized.includes('rank') || normalized.includes('零空间');
    const feedback: PracticeFeedback = {
      verdict: isCorrect ? 'correct' : 'incorrect',
      title: isCorrect ? '批改完成 · 正确' : '批改完成 · 待加强',
      steps: [
        '行化简得到两个主元列，确认 r = 2',
        '零空间维度 = 列数 3 - r (2) = 1，写出基向量 (-2,1,0)',
        '根据 r < 行数 判定行向量线性相关',
      ],
      hint: isCorrect
        ? '下一步建议：进入“正交投影 & 最小二乘”节点继续巩固。'
        : '建议回看“特征值与对角化”模板，尤其关注自由变量处理。',
    };
    this.setPracticeFeedback(feedback);
    return feedback;
  }

  public completeTask(taskId: string, unlockNextId?: string): void {
    this.updateTask(taskId, 'complete');
    if (unlockNextId) {
      this.updateTask(unlockNextId, 'available');
    }
    this.emit();
  }

  public unlockTask(taskId: string): void {
    this.updateTask(taskId, 'available');
    this.emit();
  }

  public startMock(seconds: number): void {
    this.state.mockStatus = {
      hasStarted: true,
      remainingSeconds: seconds,
      resultSummary: null,
    };
    this.emit();
  }

  public tickMock(): void {
    if (!this.state.mockStatus.hasStarted) {
      return;
    }
    const remaining = Math.max(this.state.mockStatus.remainingSeconds - 1, 0);
    this.state.mockStatus.remainingSeconds = remaining;
    if (remaining === 0 && !this.state.mockStatus.resultSummary) {
      this.state.mockStatus.resultSummary = '计时结束，已自动批改生成弱点雷达图';
    }
    this.emit();
  }

  public finishMock(resultSummary: string): void {
    this.state.mockStatus.resultSummary = resultSummary;
    this.state.mockStatus.remainingSeconds = 0;
    this.emit();
  }

  private updateTask(taskId: string, status: TaskStatus): void {
    const target = this.state.tasks.find((task) => task.id === taskId);
    if (target) {
      target.status = status;
    }
  }

  private resetTaskStatuses(): void {
    this.state.tasks.forEach((task, index) => {
      task.status = index === 0 ? 'available' : 'locked';
    });
  }

  private emit(): void {
    this.subscribers.forEach((listener) => listener(this.state));
  }
}
