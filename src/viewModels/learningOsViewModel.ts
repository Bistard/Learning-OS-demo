/**
 * Learning OS view-model aligned with the Goal x Knowledge Base flow.
 */

import {
  ChatMessage,
  GoalCreationDraft,
  KnowledgeBaseState,
  KnowledgeCategory,
  KnowledgeItem,
  LearningOsState,
  Page,
  ResourceHighlight,
  StudyGoal,
  Toast,
  ToastTone,
  WorkspaceState,
  createGoalDraft,
  createInitialState,
  NEW_GOAL_CONNECTED_VAULTS,
  KNOWLEDGE_UNSORTED_CATEGORY_ID,
  createStudyRoute,
  createTaskTree,
  createWeeklyPlan,
  nextDeadlineIso,
} from '../models/learningOsModel';

interface KnowledgeCategoryDraft {
  title: string;
  icon: string;
  color: string;
}

interface DashboardSummary {
  totalGoals: number;
  activeGoals: number;
  nearestDeadlineLabel: string;
  knowledgeVaults: number;
}

export interface ViewSnapshot extends LearningOsState {
  activeGoal: StudyGoal | null;
  dashboardSummary: DashboardSummary;
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
    const goalExists = this.state.goals.some((item) => item.id === goalId);
    if (!goalExists) return;
    this.updateState({
      activeGoalId: goalId,
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
    this.state = {
      ...this.state,
      goals: [newGoal, ...this.state.goals],
      activeGoalId: newGoal.id,
      creationDraft: createGoalDraft(),
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
      this.emitToast('笔记内容为空，无法收录～', 'warning');
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
    const noteItem: KnowledgeItem = {
      id: `kb-note-${Date.now()}`,
      summary: headline,
      detail: content,
      source: '即时笔记',
      updatedAt: timestamp,
      goalId: this.state.activeGoalId ?? undefined,
    };
    const knowledgeBase = this.prependKnowledgeItem('kb-notes', noteItem);
    this.updateState({ workspace, knowledgeBase });
    this.emitToast('已自动沉入当前知识库并分类～', 'success');
  }

  public addKnowledgeCategory(payload: KnowledgeCategoryDraft): void {
    const title = payload.title.trim();
    if (!title) {
      this.emitToast('分类名称不能为空～', 'warning');
      return;
    }
    const icon = payload.icon.trim() || '📁';
    const color = this.normalizeHexColor(payload.color);
    const knowledgeBase = this.mutateKnowledgeCategories((categories) => [
      ...categories,
      {
        id: `kb-category-${Date.now()}`,
        title,
        icon,
        color,
        kind: 'custom',
        isFixed: false,
        items: [],
      },
    ]);
    this.updateState({ knowledgeBase });
  }

  public renameKnowledgeCategory(categoryId: string, title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      this.emitToast('分类名称不能为空～', 'warning');
      return;
    }
    const knowledgeBase = this.mutateKnowledgeCategories((categories) =>
      categories.map((category) =>
        category.id === categoryId && !category.isFixed
          ? { ...category, title: trimmed }
          : category
      )
    );
    this.updateState({ knowledgeBase });
  }

  public deleteKnowledgeCategory(categoryId: string): void {
    const knowledgeBase = this.mutateKnowledgeCategories((categories) => {
      const target = categories.find((category) => category.id === categoryId);
      if (!target || target.isFixed) {
        return categories;
      }
      return categories
        .filter((category) => category.id !== categoryId)
        .map((category) =>
          category.id === KNOWLEDGE_UNSORTED_CATEGORY_ID
            ? { ...category, items: [...target.items, ...category.items] }
            : category
        );
    });
    this.updateState({ knowledgeBase });
  }

  public reorderKnowledgeCategories(order: string[]): void {
    if (!order.length) return;
    const map = new Map(
      this.state.knowledgeBase.categories.map((category) => [category.id, category] as const)
    );
    const ordered: KnowledgeCategory[] = [];
    order.forEach((id) => {
      const category = map.get(id);
      if (category) {
        ordered.push(category);
        map.delete(id);
      }
    });
    map.forEach((category) => ordered.push(category));
    const knowledgeBase: KnowledgeBaseState = {
      ...this.state.knowledgeBase,
      categories: ordered,
    };
    this.updateState({ knowledgeBase });
  }

  public moveKnowledgeItem(itemId: string, targetCategoryId: string, targetIndex = 0): void {
    const { item } = this.locateKnowledgeItem(itemId);
    if (!item) return;
    const normalizedIndex = Number.isInteger(targetIndex) ? Number(targetIndex) : 0;
    const targetId = this.resolveCategoryId(targetCategoryId);
    const baseline = this.ensureUnsortedCategory(this.state.knowledgeBase.categories);
    const withoutItem = baseline.map((category) => ({
      ...category,
      items: category.items.filter((candidate) => candidate.id !== itemId),
    }));
    const categories = withoutItem.map((category) => {
      if (category.id !== targetId) {
        return category;
      }
      const items = [...category.items];
      const safeIndex = Math.max(0, Math.min(normalizedIndex, items.length));
      items.splice(safeIndex, 0, item);
      return { ...category, items };
    });
    this.updateState({ knowledgeBase: { ...this.state.knowledgeBase, categories } });
  }

  public recordKnowledgeUpload(fileName: string): string {
    const label = fileName.trim() || '未命名文件';
    const timestamp = this.formatTime();
    const uploadItem: KnowledgeItem = {
      id: `kb-upload-${Date.now()}`,
      summary: label,
      detail: `${label} 已上传，稍后自动解析`,
      source: '上传文件',
      updatedAt: timestamp,
      goalId: this.state.activeGoalId ?? undefined,
    };
    const knowledgeBase = this.prependKnowledgeItem('kb-uploads', uploadItem);
    this.updateState({ knowledgeBase });
    this.emitToast('文件已记录到「上传资料」', 'success');
    return uploadItem.id;
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
      connectedKnowledgeVaults: [...NEW_GOAL_CONNECTED_VAULTS],
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

  private prependKnowledgeItem(categoryId: string, item: KnowledgeItem): KnowledgeBaseState {
    const targetId = this.resolveCategoryId(categoryId);
    return this.mutateKnowledgeCategories((categories) =>
      categories.map((category) =>
        category.id === targetId ? { ...category, items: [item, ...category.items] } : category
      )
    );
  }

  private locateKnowledgeItem(
    itemId: string
  ): { item: KnowledgeItem | null; categoryId: string | null } {
    for (const category of this.state.knowledgeBase.categories) {
      const found = category.items.find((candidate) => candidate.id === itemId);
      if (found) {
        return { item: { ...found }, categoryId: category.id };
      }
    }
    return { item: null, categoryId: null };
  }

  private mutateKnowledgeCategories(
    mutator: (categories: KnowledgeCategory[]) => KnowledgeCategory[]
  ): KnowledgeBaseState {
    const baseline = this.ensureUnsortedCategory(this.state.knowledgeBase.categories);
    return {
      ...this.state.knowledgeBase,
      categories: mutator(baseline),
    };
  }

  private ensureUnsortedCategory(categories: KnowledgeCategory[]): KnowledgeCategory[] {
    if (categories.some((category) => category.id === KNOWLEDGE_UNSORTED_CATEGORY_ID)) {
      return categories;
    }
    const fallback: KnowledgeCategory = {
      id: KNOWLEDGE_UNSORTED_CATEGORY_ID,
      title: '未分类',
      kind: 'uncategorized',
      isFixed: true,
      icon: '📥',
      color: '#94a3b8',
      items: [],
    };
    return [...categories, fallback];
  }

  private resolveCategoryId(categoryId: string): string {
    const exists = this.state.knowledgeBase.categories.some(
      (category) => category.id === categoryId
    );
    return exists ? categoryId : KNOWLEDGE_UNSORTED_CATEGORY_ID;
  }

  private normalizeHexColor(color: string): string {
    const trimmed = color.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : '#94a3b8';
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
    return {
      ...this.state,
      activeGoal,
      dashboardSummary,
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
