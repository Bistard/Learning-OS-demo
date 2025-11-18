/**
 * Learning OS view-model aligned with the Goal x Knowledge Base flow.
 */

import {
  GoalCreationDraft,
  KnowledgeCategory,
  KnowledgeBaseState,
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
  createStudyRoute,
  createTaskTree,
  createWeeklyPlan,
  nextDeadlineIso,
} from '../models/learningOsModel';
import { KnowledgeManager } from './learningOs/knowledgeManager';
import { TabController } from './learningOs/tabController';
import type { AppTab, TabContext, TabOpenOptions } from './learningOs/tabController';
import type { KnowledgeCategoryDraft, ViewSnapshot } from './learningOs/types';

export type { AppTab, TabContext } from './learningOs/tabController';
export type { ViewSnapshot } from './learningOs/types';

export type ViewUpdateListener = (snapshot: ViewSnapshot) => void;
export type ToastListener = (toast: Toast) => void;

export class LearningOsViewModel {
  private state: LearningOsState = createInitialState();
  private readonly tabController: TabController;
  private readonly knowledgeManager: KnowledgeManager;
  private readonly viewListeners = new Set<ViewUpdateListener>();
  private readonly toastListeners = new Set<ToastListener>();

  constructor(private readonly nowProvider: () => Date = () => new Date()) {
    this.tabController = new TabController((tab) => this.resolveTabTitle(tab));
    this.knowledgeManager = new KnowledgeManager({
      readState: () => this.state,
      writeState: (partial) => this.updateState(partial),
      emitToast: (message, tone) => this.emitToast(message, tone),
      formatTime: () => this.formatTime(),
    });
    this.tabController.bootstrap(this.state.page);
  }

  public subscribe(listener: ViewUpdateListener): () => void {
    this.viewListeners.add(listener);
    this.tabController.syncTabTitles();
    listener(this.buildSnapshot());
    return () => this.viewListeners.delete(listener);
  }

  public onToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  public navigate(page: Page, context?: TabContext): void {
    this.focusOrCreateTab(page, { context });
  }

  public selectGoal(goalId: string, targetPage?: Page): void {
    if (this.state.activeGoalId === goalId && !targetPage) return;
    const goalExists = this.state.goals.some((item) => item.id === goalId);
    if (!goalExists) return;
    const pending: Partial<LearningOsState> = {};
    if (this.state.activeGoalId !== goalId) {
      pending.activeGoalId = goalId;
    }
    const hasPending = Object.keys(pending).length > 0;
    if (hasPending) {
      this.assignState(pending);
    }
    if (targetPage) {
      this.focusOrCreateTab(targetPage, { context: { goalId } });
      return;
    }
    if (hasPending) {
      this.publish();
    }
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
    };
    this.focusOrCreateTab('goalWorkspace', { context: { goalId: newGoal.id } });
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

  public activateTab(tabId: string): void {
    const page = this.tabController.activate(tabId);
    if (!page) return;
    this.assignState({ page });
    this.publish();
  }

  public closeTab(tabId: string): void {
    const page = this.tabController.close(tabId, 'goalDashboard');
    if (page === null) return;
    this.assignState({ page });
    this.publish();
  }

  public closeAllTabs(): void {
    const page = this.tabController.closeAll('goalDashboard');
    this.assignState({ page });
    this.publish();
  }

  public reloadTab(tabId: string): void {
    if (!this.tabController.reload(tabId)) return;
    this.publish();
  }

  public toggleTabPin(tabId: string, pinned?: boolean): void {
    if (!this.tabController.togglePin(tabId, pinned)) return;
    this.publish();
  }

  public reorderTabs(order: string[]): void {
    if (!this.tabController.reorder(order)) return;
    this.publish();
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
    const knowledgeBase = this.knowledgeManager.prependItem('kb-notes', noteItem);
    this.updateState({ workspace, knowledgeBase });
    this.emitToast('已自动沉入当前知识库并分类～', 'success');
  }

  public addKnowledgeCategory(payload: KnowledgeCategoryDraft): void {
    this.knowledgeManager.addCategory(payload);
  }

  public renameKnowledgeCategory(categoryId: string, title: string): void {
    this.knowledgeManager.renameCategory(categoryId, title);
  }

  public deleteKnowledgeCategory(categoryId: string): void {
    this.knowledgeManager.deleteCategory(categoryId);
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
    this.knowledgeManager.moveItem(itemId, targetCategoryId, targetIndex);
  }

  public recordKnowledgeUpload(fileName: string): string {
    return this.knowledgeManager.recordUpload(fileName);
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

  private focusOrCreateTab(view: Page, options: TabOpenOptions = {}): void {
    const page = this.tabController.focusOrCreate(view, options);
    this.assignState({ page });
    this.publish();
  }

  private resolveTabTitle(tab: AppTab): string {
    const activeGoal = this.getActiveGoal();
    const contextGoal = this.getGoalById(tab.context?.goalId);
    switch (tab.view) {
      case 'goalDashboard':
        return activeGoal ? `${activeGoal.name} · 驾驶舱` : '目标驾驶舱';
      case 'goalCreation':
        return '创建目标';
      case 'goalWorkspace': {
        const goal = contextGoal ?? activeGoal;
        return goal ? `${goal.name} · 工作区` : '目标工作区';
      }
      case 'learningWorkspace': {
        const assetTitle = this.state.workspace.activeAsset?.title;
        return assetTitle ? `${assetTitle} · 学习台` : '学习工作台';
      }
      case 'knowledgeBase':
        return activeGoal ? `${activeGoal.name} · 知识库` : '知识库';
      default:
        return '工作区';
    }
  }

  private getGoalById(goalId?: string | null): StudyGoal | null {
    if (!goalId) return null;
    return this.state.goals.find((goal) => goal.id === goalId) ?? null;
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
      tabs: this.tabController.getTabsSnapshot(),
      activeTabId: this.tabController.getActiveTabId(),
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

  private assignState(partial: Partial<LearningOsState>): void {
    this.state = { ...this.state, ...partial };
  }

  private updateState(partial: Partial<LearningOsState>): void {
    this.assignState(partial);
    this.publish();
  }

  private publish(): void {
    this.tabController.syncTabTitles();
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
