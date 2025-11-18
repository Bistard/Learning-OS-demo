/**
 * Learning OS view-model aligned with the Goal x Knowledge Base flow.
 */

import {
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

/**
 * Additional metadata carried by a tab. It is intentionally loose to allow
 * future view types to enrich their contextual identity (goal, asset, etc.).
 */
export interface TabContext {
  goalId?: string;
  [key: string]: string | undefined;
}

export interface AppTab {
  id: string;
  view: Page;
  identity: string;
  title: string;
  icon?: string;
  pinned: boolean;
  closable: boolean;
  reloadToken: number;
  context?: TabContext;
}

interface TabBlueprint {
  icon: string;
  pinned?: boolean;
}

interface TabOpenOptions {
  identity?: string;
  title?: string;
  icon?: string;
  pinned?: boolean;
  closable?: boolean;
  context?: TabContext;
}

const TAB_ICON_FALLBACK = '📄';

const TAB_BLUEPRINTS: Record<Page, TabBlueprint> = {
  goalDashboard: { icon: '📌', pinned: true },
  goalCreation: { icon: '📝' },
  goalWorkspace: { icon: '🗂️' },
  learningWorkspace: { icon: '🧠' },
  knowledgeBase: { icon: '📚' },
};

const createTabId = (): string =>
  `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface ViewSnapshot extends LearningOsState {
  activeGoal: StudyGoal | null;
  dashboardSummary: DashboardSummary;
  tabs: AppTab[];
  activeTabId: string | null;
}

export type ViewUpdateListener = (snapshot: ViewSnapshot) => void;
export type ToastListener = (toast: Toast) => void;

export class LearningOsViewModel {
  private state: LearningOsState = createInitialState();
  private tabs: AppTab[] = [];
  private activeTabId: string | null = null;
  private readonly viewListeners = new Set<ViewUpdateListener>();
  private readonly toastListeners = new Set<ToastListener>();

  constructor(private readonly nowProvider: () => Date = () => new Date()) {
    this.bootstrapTabs();
  }

  public subscribe(listener: ViewUpdateListener): () => void {
    this.viewListeners.add(listener);
    this.syncTabTitles();
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
    if (this.activeTabId === tabId) return;
    const target = this.tabs.find((tab) => tab.id === tabId);
    if (!target) return;
    this.activeTabId = target.id;
    this.assignState({ page: target.view });
    this.publish();
  }

  public closeTab(tabId: string): void {
    const targetIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    if (targetIndex === -1) return;
    const target = this.tabs[targetIndex];
    if (!target.closable) return;
    const remaining = this.tabs.filter((tab) => tab.id !== tabId);
    if (remaining.length === 0) {
      const fallback = this.createTab('goalDashboard');
      this.tabs = [fallback];
      this.activeTabId = fallback.id;
      this.assignState({ page: fallback.view });
      this.publish();
      return;
    }
    this.tabs = remaining;
    if (this.activeTabId === tabId) {
      const fallbackIndex = Math.max(0, targetIndex - 1);
      const nextActive = this.tabs[fallbackIndex] ?? this.tabs[0];
      this.activeTabId = nextActive.id;
      this.assignState({ page: nextActive.view });
      this.publish();
      return;
    }
    this.publish();
  }

  public closeAllTabs(): void {
    const pinnedTabs = this.tabs.filter((tab) => tab.pinned);
    if (pinnedTabs.length > 0) {
      this.tabs = pinnedTabs;
      this.activeTabId = pinnedTabs[0].id;
      this.assignState({ page: pinnedTabs[0].view });
      this.publish();
      return;
    }
    const fallback = this.createTab('goalDashboard');
    this.tabs = [fallback];
    this.activeTabId = fallback.id;
    this.assignState({ page: fallback.view });
    this.publish();
  }

  public reloadTab(tabId: string): void {
    const target = this.tabs.find((tab) => tab.id === tabId);
    if (!target) return;
    const updated = { ...target, reloadToken: target.reloadToken + 1 };
    this.tabs = this.tabs.map((tab) => (tab.id === tabId ? updated : tab));
    this.publish();
  }

  public toggleTabPin(tabId: string, pinned?: boolean): void {
    const target = this.tabs.find((tab) => tab.id === tabId);
    if (!target) return;
    const nextPinned = pinned ?? !target.pinned;
    if (nextPinned === target.pinned) return;
    const updated = { ...target, pinned: nextPinned };
    this.tabs = this.tabs.map((tab) => (tab.id === tabId ? updated : tab));
    this.enforcePinGrouping();
    this.publish();
  }

  public reorderTabs(order: string[]): void {
    if (!order.length) return;
    const ordered: AppTab[] = [];
    const visited = new Set<string>();
    order.forEach((id) => {
      const tab = this.tabs.find((item) => item.id === id);
      if (tab && !visited.has(id)) {
        ordered.push(tab);
        visited.add(id);
      }
    });
    const remainder = this.tabs.filter((tab) => !visited.has(tab.id));
    const next = [...ordered, ...remainder];
    const changed = next.some((tab, index) => tab.id !== this.tabs[index]?.id);
    if (!changed) return;
    this.tabs = next;
    this.enforcePinGrouping();
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

  private bootstrapTabs(): void {
    if (this.tabs.length > 0) return;
    const initialTab = this.createTab(this.state.page);
    this.tabs = [initialTab];
    this.activeTabId = initialTab.id;
  }

  private focusOrCreateTab(view: Page, options: TabOpenOptions = {}): void {
    const identity = options.identity ?? this.buildTabIdentity(view, options.context);
    const existing = this.tabs.find((tab) => tab.identity === identity);
    if (existing) {
      this.activeTabId = existing.id;
      this.assignState({ page: existing.view });
      this.publish();
      return;
    }
    const tab = this.createTab(view, { ...options, identity });
    this.tabs = [...this.tabs, tab];
    this.enforcePinGrouping();
    this.activeTabId = tab.id;
    this.assignState({ page: view });
    this.publish();
  }

  private createTab(view: Page, options: TabOpenOptions = {}): AppTab {
    const blueprint = TAB_BLUEPRINTS[view];
    const identity = options.identity ?? this.buildTabIdentity(view, options.context);
    return {
      id: createTabId(),
      view,
      identity,
      title: options.title ?? '',
      icon: options.icon ?? blueprint?.icon ?? TAB_ICON_FALLBACK,
      pinned: options.pinned ?? blueprint?.pinned ?? false,
      closable: options.closable ?? true,
      reloadToken: 0,
      context: options.context ? { ...options.context } : undefined,
    };
  }

  private buildTabIdentity(view: Page, context?: TabContext): string {
    if (context?.goalId) {
      return `${view}:${context.goalId}`;
    }
    return view;
  }

  private enforcePinGrouping(): void {
    if (this.tabs.length <= 1) return;
    const pinned = this.tabs.filter((tab) => tab.pinned);
    const unpinned = this.tabs.filter((tab) => !tab.pinned);
    this.tabs = [...pinned, ...unpinned];
  }

  private cloneTabs(): AppTab[] {
    return this.tabs.map((tab) => ({
      ...tab,
      context: tab.context ? { ...tab.context } : undefined,
    }));
  }

  private syncTabTitles(): void {
    this.tabs = this.tabs.map((tab) => {
      const nextTitle = this.resolveTabTitle(tab);
      if (nextTitle === tab.title) return tab;
      return { ...tab, title: nextTitle };
    });
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
      tabs: this.cloneTabs(),
      activeTabId: this.activeTabId,
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
    this.syncTabTitles();
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
