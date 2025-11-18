/**
 * Learning OS view-model aligned with the Goal x Knowledge Base flow.
 */

import {
  ChatMessage,
  GoalCreationDraft,
  KnowledgeFolder,
  KnowledgeSection,
  LearningOsState,
  Page,
  ResourceHighlight,
  StudyGoal,
  Toast,
  ToastTone,
  WorkspaceState,
  createGoalDraft,
  createInitialState,
  createKnowledgeSections,
  createStudyRoute,
  createTaskTree,
  createWeeklyPlan,
  nextDeadlineIso,
} from '../models/learningOsModel';

interface DashboardSummary {
  totalGoals: number;
  activeGoals: number;
  nearestDeadlineLabel: string;
  knowledgeVaults: number;
}

interface KnowledgeStats {
  totalItems: number;
  autoCaptureLabel: string;
}

export interface ViewSnapshot extends LearningOsState {
  activeGoal: StudyGoal | null;
  dashboardSummary: DashboardSummary;
  knowledgeStats: KnowledgeStats;
}

export type ViewUpdateListener = (snapshot: ViewSnapshot) => void;
export type ToastListener = (toast: Toast) => void;

export class LearningOsViewModel {
  private state: LearningOsState = createInitialState();
  private readonly viewListeners = new Set<ViewUpdateListener>();
  private readonly toastListeners = new Set<ToastListener>();

  constructor(private readonly nowProvider: () => Date = () => new Date()) {}

  public subscribe(listener: ViewUpdateListener): () => void {
    this.viewListeners.add(listener);
    listener(this.buildSnapshot());
    return () => this.viewListeners.delete(listener);
  }

  public onToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  public navigate(page: Page): void {
    if (this.state.page === page) return;
    this.updateState({ page });
  }

  public selectGoal(goalId: string, targetPage?: Page): void {
    if (this.state.activeGoalId === goalId && !targetPage) return;
    const goal = this.state.goals.find((item) => item.id === goalId);
    if (!goal) return;
    const sections = this.replaceGoalKnowledgeSection(goal);
    this.updateState({
      activeGoalId: goalId,
      knowledgeBase: { ...this.state.knowledgeBase, sections },
      page: targetPage ?? this.state.page,
    });
  }

  public openGoalWorkspace(goalId?: string): void {
    if (goalId) {
      this.selectGoal(goalId, 'goalWorkspace');
    } else {
      this.navigate('goalWorkspace');
    }
  }

  public updateGoalDraft<K extends keyof GoalCreationDraft>(
    field: K,
    value: GoalCreationDraft[K]
  ): void {
    this.updateState({ creationDraft: { ...this.state.creationDraft, [field]: value } });
  }

  public appendMaterial(label: string): void {
    const trimmed = label.trim();
    if (!trimmed) return;
    const materials = Array.from(new Set([...this.state.creationDraft.materials, trimmed]));
    this.updateGoalDraft('materials', materials);
  }

  public removeMaterial(label: string): void {
    const materials = this.state.creationDraft.materials.filter((item) => item !== label);
    this.updateGoalDraft('materials', materials);
  }

  public submitGoalCreation(): void {
    const draft = this.state.creationDraft;
    if (!draft.targetType.trim()) {
      this.emitToast('请先告诉我你要准备什么～', 'warning');
      return;
    }
    const newGoal = this.createGoalFromDraft(draft);
    const knowledgeSections = this.replaceGoalKnowledgeSection(newGoal);
    this.state = {
      ...this.state,
      goals: [newGoal, ...this.state.goals],
      activeGoalId: newGoal.id,
      creationDraft: createGoalDraft(),
      knowledgeBase: { ...this.state.knowledgeBase, sections: knowledgeSections },
      page: 'goalWorkspace',
    };
    this.publish();
    this.emitToast('目标档案已生成，知识库「未收录」待自动整理。', 'success');
  }

  public markRouteItemComplete(routeId: string): void {
    this.mutateActiveGoal((goal) => {
      const updatedRoute = goal.todayRoute.map((item) =>
        item.id === routeId ? { ...item, status: 'complete' as const } : item
      );
      const completedIndex = goal.todayRoute.findIndex((item) => item.id === routeId);
      if (completedIndex !== -1 && completedIndex + 1 < updatedRoute.length) {
        const nextItem = updatedRoute[completedIndex + 1];
        if (nextItem.status === 'locked') {
          updatedRoute[completedIndex + 1] = { ...nextItem, status: 'available' as const };
        }
      }
      const progress = Math.min(100, goal.progress.percent + 6);
      const highlights = this.appendHighlight(goal.highlights, routeId);
      return {
        ...goal,
        todayRoute: updatedRoute,
        progress: { ...goal.progress, percent: progress },
        highlights,
      };
    });
    this.emitToast('学习进度已同步到任务树与知识库。', 'success');
  }

  public startLearningWorkspace(taskId?: string): void {
    this.mutateActiveGoal((goal) => {
      if (!taskId) return goal;
      const todayRoute = goal.todayRoute.map((item) =>
        item.id === taskId && item.status !== 'complete'
          ? { ...item, status: 'in-progress' as const }
          : item
      );
      return { ...goal, todayRoute };
    });
    if (taskId) {
      const routeItem = this.getActiveGoal()?.todayRoute.find((item) => item.id === taskId);
      this.updateState({
        workspace: {
          ...this.state.workspace,
          coachFocus: routeItem
            ? `围绕「${routeItem.title}」自动提供例题 / Quiz / 笔记整理`
            : this.state.workspace.coachFocus,
        },
      });
    }
    this.navigate('learningWorkspace');
  }

  public updateWorkspaceNote(payload: string): void {
    this.updateState({ workspace: { ...this.state.workspace, noteDraft: payload } });
  }

  public syncWorkspaceNote(): void {
    const content = this.state.workspace.noteDraft.trim();
    if (!content) {
      this.emitToast('笔记内容为空，无法收录。', 'warning');
      return;
    }
    const headline = content.split('\n')[0]?.replace(/^#+\s*/, '') || '即时笔记';
    const timestamp = this.formatTime();
    const syncedNotes = [headline, ...this.state.workspace.syncedNotes].slice(0, 5);
    const workspace: WorkspaceState = {
      ...this.state.workspace,
      syncedNotes,
      lastSyncedAt: timestamp,
    };
    const knowledgeBase = this.bumpKnowledgeFolder('kb-notes');
    this.updateState({ workspace, knowledgeBase });
    this.emitToast('已自动沉入当前知识库并分类。', 'success');
  }

  public toggleAutoCapture(enabled: boolean): void {
    this.updateState({
      knowledgeBase: { ...this.state.knowledgeBase, autoCaptureEnabled: enabled },
    });
  }

  public sendChat(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) return;
    const now = this.formatTime();
    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      role: 'user',
      content: trimmed,
      relatedGoalId: this.state.activeGoalId ?? undefined,
      timestamp: now,
    };
    const aiMsg: ChatMessage = {
      id: `chat-ai-${Date.now()}`,
      role: 'ai',
      content: this.composeAiResponse(trimmed),
      relatedGoalId: this.state.activeGoalId ?? undefined,
      timestamp: now,
    };
    this.updateState({ chatHistory: [...this.state.chatHistory, userMsg, aiMsg] });
  }

  private createGoalFromDraft(draft: GoalCreationDraft): StudyGoal {
    const id = `goal-${Date.now()}`;
    const deadline = draft.deadline || nextDeadlineIso();
    const todayRoute = createStudyRoute().map((item, index) =>
      index < 2 ? { ...item, status: 'available' as const } : { ...item, status: 'locked' as const }
    );
    const weeklyPlan = createWeeklyPlan().map((plan, index) =>
      index === 0
        ? { ...plan, focus: `${draft.targetType} · ${plan.focus}` }
        : plan
    );
    const taskTree = createTaskTree();
    return {
      id,
      name: draft.targetType || '自定义学习目标',
      focus: 'AI 根据资料持续生成任务树',
      status: 'active',
      profile: {
        targetType: draft.targetType || '自定义',
        deadline,
        mastery: draft.mastery,
        dailyMinutes: draft.dailyMinutes,
        materials: draft.materials,
        resourcesCaptured: 0,
      },
      progress: {
        percent: 0,
        xp: 0,
        remainingDays: this.computeRemainingDays(deadline),
      },
      todayRoute,
      weeklyPlan,
      taskTree,
      highlights: [],
      connectedKnowledgeVaults: ['kb-unsorted'],
    };
  }

  private appendHighlight(existing: ResourceHighlight[], routeId: string): ResourceHighlight[] {
    if (existing.some((highlight) => highlight.linkedTaskId === routeId)) {
      return existing;
    }
    const route = this.getActiveGoal()?.todayRoute.find((item) => item.id === routeId);
    if (!route) return existing;
    const newHighlight: ResourceHighlight = {
      id: `highlight-${routeId}`,
      title: `${route.title} · 自动整理完成`,
      type: 'insight',
      excerpt: '学习痕迹已同步，「知识库」将继续补全关联内容。',
      source: '未收录知识库',
      linkedTaskId: routeId,
    };
    return [newHighlight, ...existing].slice(0, 6);
  }

  private bumpKnowledgeFolder(folderId: string) {
    const sections = this.state.knowledgeBase.sections.map((section) => ({
      ...section,
      folders: section.folders.map((folder) =>
        folder.id === folderId ? this.incrementFolder(folder) : folder
      ),
    }));
    return { ...this.state.knowledgeBase, sections };
  }

  private incrementFolder(folder: KnowledgeFolder): KnowledgeFolder {
    return { ...folder, items: folder.items + 1, lastSynced: this.formatTime() };
  }

  private replaceGoalKnowledgeSection(goal: StudyGoal): KnowledgeSection[] {
    const [goalSection] = createKnowledgeSections(goal);
    const otherSections = this.state.knowledgeBase.sections.filter(
      (section) => section.id !== 'kb-current'
    );
    return [goalSection, ...otherSections];
  }

  private composeAiResponse(message: string): string {
    const goal = this.getActiveGoal();
    if (!goal) {
      return '先创建一个目标吧，AI 才能结合知识库给出路径。';
    }
    const nextRoute = goal.todayRoute.find((item) => item.status === 'available');
    const base = `已读取目标「${goal.name}」与关联知识库。`;
    if (!nextRoute) {
      return `${base} 目前所有路线均完成，可打开任务树安排下一阶段或创建新的目标。`;
    }
    return `${base} 建议现在执行「${nextRoute.title}」（约 ${nextRoute.etaMinutes} 分钟）。左栏阅读资料、中栏记笔记，右栏我会基于你上传的 ${goal.profile.materials[0] ?? '资料'} 继续生成 Quiz。`;
  }

  private mutateActiveGoal(mutator: (goal: StudyGoal) => StudyGoal): void {
    const activeId = this.state.activeGoalId;
    if (!activeId) return;
    const goals = this.state.goals.map((goal) =>
      goal.id === activeId ? mutator(goal) : goal
    );
    this.state = { ...this.state, goals };
    this.publish();
  }

  private getActiveGoal(): StudyGoal | null {
    if (!this.state.activeGoalId) return null;
    return this.state.goals.find((goal) => goal.id === this.state.activeGoalId) ?? null;
  }

  private buildSnapshot(): ViewSnapshot {
    const activeGoal = this.getActiveGoal();
    const dashboardSummary = this.computeDashboardSummary();
    const knowledgeStats = this.computeKnowledgeStats();
    return {
      ...this.state,
      activeGoal,
      dashboardSummary,
      knowledgeStats,
    };
  }

  private computeDashboardSummary(): DashboardSummary {
    const totalGoals = this.state.goals.length;
    const activeGoals = this.state.goals.filter((goal) => goal.status === 'active').length;
    const nearestDeadline = this.state.goals
      .map((goal) => goal.progress.remainingDays)
      .filter((days) => days > 0)
      .sort((a, b) => a - b)[0];
    const nearestDeadlineLabel = nearestDeadline
      ? `距最近截止 ${nearestDeadline} 天`
      : '暂无截止压力';
    const knowledgeVaults = this.getActiveGoal()?.connectedKnowledgeVaults.length ?? 0;
    return { totalGoals, activeGoals, nearestDeadlineLabel, knowledgeVaults };
  }

  private computeKnowledgeStats(): KnowledgeStats {
    const totalItems = this.state.knowledgeBase.sections.reduce(
      (sum, section) =>
        sum + section.folders.reduce((folderSum, folder) => folderSum + folder.items, 0),
      0
    );
    return {
      totalItems,
      autoCaptureLabel: this.state.knowledgeBase.autoCaptureEnabled
        ? '自动收录已开启'
        : '自动收录已暂停',
    };
  }

  private updateState(partial: Partial<LearningOsState>): void {
    this.state = { ...this.state, ...partial };
    this.publish();
  }

  private publish(): void {
    const snapshot = this.buildSnapshot();
    this.viewListeners.forEach((listener) => listener(snapshot));
  }

  private emitToast(message: string, tone: ToastTone): void {
    const toast: Toast = { message, tone };
    this.toastListeners.forEach((listener) => listener(toast));
  }

  private formatTime(): string {
    return this.nowProvider().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  private computeRemainingDays(deadline: string): number {
    const target = new Date(deadline);
    const diff = target.getTime() - this.nowProvider().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}
