/**
 * Learning OS view-model aligned with the Goal x Knowledge Base flow.
 */

import {
  AppConfiguration,
  GoalCreationDraft,
  GoalCreationFlowState,
  GoalProfile,
  KnowledgeCategory,
  KnowledgeBaseState,
  KnowledgeItem,
  KnowledgeNote,
  LearningOsState,
  Page,
  ResourceHighlight,
  StudyGoal,
  StudyRouteItem,
  TaskNode,
  TaskStatus,
  Toast,
  ToastTone,
  WorkspaceAsset,
  createGoalCreationFlowState,
  createGoalDraft,
  createInitialState,
  createKnowledgeBase,
  buildNotesFromKnowledgeBase,
  NEW_GOAL_CONNECTED_VAULTS,
  createStudyRoute,
  createTaskTree,
  createWeeklyPlan,
  nextDeadlineIso,
  KNOWLEDGE_NOTES_CATEGORY_ID,
  getKnowledgeLibraryTemplate,
} from '../models/learningOsModel';
import {
  ensureAdvancedSettings,
  getGoalCreationPreset,
  getGoalCreationSubject,
} from '../models/learningOs/goalCreationConfig';
import { KnowledgeManager } from './learningOs/knowledgeManager';
import { TabController } from './learningOs/tabController';
import type { AppTab, TabContext, TabOpenOptions } from './learningOs/tabController';
import type { DashboardSummary, KnowledgeCategoryDraft, ViewSnapshot } from './learningOs/types';
import { isPrimaryNavPage } from '../config/navigation';

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
    if (!isPrimaryNavPage(this.state.page)) {
      this.tabController.bootstrap(this.state.page);
    }
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
    if (isPrimaryNavPage(page)) {
      this.tabController.clearActiveTab();
      this.assignState({ page });
      this.publish();
      return;
    }
    this.focusOrCreateTab(page, { context });
  }

  public setNotePreviewEnabled(enabled: boolean): void {
    if (this.state.configuration.notePreviewEnabled === enabled) {
      return;
    }
    const configuration: AppConfiguration = {
      ...this.state.configuration,
      notePreviewEnabled: enabled,
    };
    this.updateState({ configuration });
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

  public updateGoalCreationFlow(partial: Partial<GoalCreationFlowState>): void {
    this.updateState({ creationFlow: { ...this.state.creationFlow, ...partial } });
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
    if (this.state.creationFlow.generationPhase === 'running') {
      this.emitToast('AI 正在生成方案，请稍候再提交～', 'info');
      return;
    }
    const newGoal = this.createGoalFromDraft(draft);
    this.state = {
      ...this.state,
      goals: [newGoal, ...this.state.goals],
      activeGoalId: newGoal.id,
      creationDraft: createGoalDraft(),
      creationFlow: createGoalCreationFlowState(),
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

  public markTaskNodeComplete(nodeId: string): void {
    if (!nodeId) return;
    this.mutateActiveGoal((goal) => {
      const [taskTree, updated] = this.applyTaskNodeCompletion(goal.taskTree, nodeId);
      return updated ? { ...goal, taskTree } : goal;
    });
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
      if (routeItem) {
        const activeAsset = this.buildWorkspaceAsset(routeItem);
        this.updateState({ workspace: { activeAsset } });
      }
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

  public createNote(): void {
    const timestamp = new Date().toISOString();
    const note: KnowledgeNote = {
      id: this.createNoteId(),
      title: this.generateNoteTitle(),
      content: '# 新建笔记\n\n在这里使用 **Markdown** 记录灵感、待办和学习要点。',
      createdAt: timestamp,
      updatedAt: timestamp,
      knowledgeItemId: `kb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    };
    const notes = [note, ...this.state.notes];
    const knowledgeBase = this.syncKnowledgeNoteEntry(note, true);
    this.updateState({ notes, knowledgeBase });
    this.openNote(note.id);
  }

  public openNote(noteId: string): void {
    const note = this.getNoteById(noteId);
    if (!note) return;
    this.focusOrCreateTab('noteEditor', {
      context: { noteId },
      title: note.title,
    });
  }

  public renameNote(noteId: string, title: string): void {
    const trimmed = title.trim() || '未命名笔记';
    this.mutateNote(noteId, (note) => {
      if (note.title === trimmed) {
        return null;
      }
      return { ...note, title: trimmed, updatedAt: new Date().toISOString() };
    });
  }

  public updateNoteContent(noteId: string, content: string): void {
    this.mutateNote(noteId, (note) => {
      if (note.content === content) {
        return null;
      }
      return { ...note, content, updatedAt: new Date().toISOString() };
    });
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

  public setKnowledgeLibrary(libraryId: string): void {
    if (!libraryId || this.state.knowledgeLibraryId === libraryId) {
      return;
    }
    let knowledgeBase = this.state.knowledgeLibraryStates[libraryId];
    if (!knowledgeBase) {
      const template = getKnowledgeLibraryTemplate(libraryId);
      knowledgeBase = createKnowledgeBase(template);
    }
    const notes =
      this.state.knowledgeLibraryNotes?.[libraryId] ??
      buildNotesFromKnowledgeBase(knowledgeBase);
    this.updateState({
      knowledgeLibraryId: libraryId,
      knowledgeBase,
      notes,
    });
  }

  private createGoalFromDraft(draft: GoalCreationDraft): StudyGoal {
    const id = `goal-${Date.now()}`;
    const preset = getGoalCreationPreset(draft.presetId);
    const subject = getGoalCreationSubject(draft.subjectId);
    const subjectLabel = draft.subjectLabel?.trim() || subject.label;
    const subjectId = draft.subjectId || subject.id;
    const targetType = draft.targetType.trim() || preset.label;
    const deadline = this.resolveGoalDeadline(draft);
    const todayRoute = createStudyRoute().map((item, index) =>
      index < 2 ? { ...item, status: 'available' as const } : { ...item, status: 'locked' as const }
    );
    const weeklyPlan = createWeeklyPlan().map((plan, index) =>
      index === 0 ? { ...plan, focus: `${targetType} · ${plan.focus}` } : plan
    );
    const profile = this.buildGoalProfile({
      draft,
      deadline,
      presetId: preset.id,
      subjectId,
      subjectLabel,
      targetType,
    });
    return {
      id,
      name: this.buildGoalName(subjectLabel, targetType),
      focus: this.buildGoalFocus(preset),
      status: 'active',
      profile,
      progress: {
        percent: 0,
        xp: 0,
        remainingDays: this.computeRemainingDays(deadline),
      },
      todayRoute,
      weeklyPlan,
      taskTree: createTaskTree(),
      highlights: [],
      connectedKnowledgeVaults: [...NEW_GOAL_CONNECTED_VAULTS],
    };
  }

  private buildGoalName(subjectLabel: string, targetType: string): string {
    const normalizedSubject = subjectLabel.trim();
    const normalizedTarget = targetType.trim();
    if (normalizedSubject && normalizedTarget) {
      return `${normalizedSubject} · ${normalizedTarget}`;
    }
    if (normalizedTarget) {
      return normalizedTarget;
    }
    if (normalizedSubject) {
      return `${normalizedSubject} · 学习目标`;
    }
    return '自定义学习目标';
  }

  private buildGoalFocus(preset: ReturnType<typeof getGoalCreationPreset>): string {
    const systemFocus = preset.systemFocus?.trim();
    const ragFocus = preset.ragFocus?.trim();
    if (systemFocus && ragFocus) {
      return `${systemFocus} · ${ragFocus}`;
    }
    return systemFocus || ragFocus || 'AI 根据资料持续生成任务树';
  }

  private buildGoalProfile({
    draft,
    deadline,
    presetId,
    subjectId,
    subjectLabel,
    targetType,
  }: {
    draft: GoalCreationDraft;
    deadline: string;
    presetId: string;
    subjectId: string;
    subjectLabel: string;
    targetType: string;
  }): GoalProfile {
    const advancedSettings = ensureAdvancedSettings(draft.advancedSettings, presetId);
    return {
      targetType,
      deadline,
      mastery: draft.mastery,
      dailyMinutes: draft.dailyMinutes,
      materials: draft.materials,
      resourcesCaptured: 0,
      subjectId,
      subjectLabel,
      presetId,
      advancedSettings,
      timeMode: draft.timeMode,
      countdownHours: draft.timeMode === 'countdown' ? draft.countdownHours : null,
    };
  }

  private resolveGoalDeadline(draft: GoalCreationDraft): string {
    if (draft.timeMode === 'countdown' && draft.countdownHours) {
      const now = this.nowProvider();
      const target = new Date(now.getTime() + draft.countdownHours * 60 * 60 * 1000);
      return target.toISOString().slice(0, 16);
    }
    return draft.deadline || nextDeadlineIso();
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
      case 'noteEditor': {
        const note = this.getNoteById(tab.context?.noteId);
        return note ? note.title : '笔记';
      }
      case 'settings':
        return '系统设置';
      default:
        return '工作区';
    }
  }

  private mutateNote(
    noteId: string,
    mutator: (note: KnowledgeNote) => KnowledgeNote | null
  ): void {
    const index = this.state.notes.findIndex((candidate) => candidate.id === noteId);
    if (index === -1) return;
    const current = this.state.notes[index];
    const next = mutator(current);
    if (!next) return;
    const notes = this.state.notes.map((note, idx) => (idx === index ? next : note));
    const knowledgeBase = this.syncKnowledgeNoteEntry(next);
    this.updateState({ notes, knowledgeBase });
  }

  private syncKnowledgeNoteEntry(note: KnowledgeNote, insertIfMissing = true): KnowledgeBaseState {
    const baseline = this.state.knowledgeBase;
    const categories = this.ensureNotesCategory(baseline.categories);
    const summary = note.title.trim() || '未命名笔记';
    const detail = this.buildNoteSnippet(note.content);
    const updatedAt = this.formatTime();
    let exists = false;
    const mapped = categories.map((category) => {
      if (category.id !== KNOWLEDGE_NOTES_CATEGORY_ID) {
        return category;
      }
      const items = category.items.map((item) => {
        if (item.id === note.knowledgeItemId) {
          exists = true;
          return { ...item, summary, detail, updatedAt, noteId: note.id };
        }
        return item;
      });
      if (!exists && insertIfMissing) {
        const newItem: KnowledgeItem = {
          id: note.knowledgeItemId,
          summary,
          detail,
          source: 'Markdown 笔记',
          updatedAt,
          goalId: this.state.activeGoalId ?? undefined,
          noteId: note.id,
        };
        return { ...category, items: [newItem, ...items] };
      }
      return { ...category, items };
    });
    return { ...baseline, categories: mapped };
  }

  private ensureNotesCategory(categories: KnowledgeCategory[]): KnowledgeCategory[] {
    if (categories.some((category) => category.id === KNOWLEDGE_NOTES_CATEGORY_ID)) {
      return categories;
    }
    const fallback: KnowledgeCategory = {
      id: KNOWLEDGE_NOTES_CATEGORY_ID,
      title: '笔记',
      kind: 'notes',
      isFixed: false,
      icon: '📝',
      color: '#34d399',
      items: [],
    };
    return [...categories, fallback];
  }

  private buildNoteSnippet(content: string): string {
    const compact = content.replace(/\s+/g, ' ').trim();
    if (!compact) return '空白笔记';
    return compact.slice(0, 140);
  }

  private createNoteId(): string {
    return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private generateNoteTitle(): string {
    return `未命名笔记 ${this.state.notes.length + 1}`;
  }

  private getNoteById(noteId?: string | null): KnowledgeNote | null {
    if (!noteId) return null;
    return this.state.notes.find((note) => note.id === noteId) ?? null;
  }

  private getGoalById(goalId?: string | null): StudyGoal | null {
    if (!goalId) return null;
    return this.state.goals.find((goal) => goal.id === goalId) ?? null;
  }

  private applyTaskNodeCompletion(nodes: TaskNode[], targetId: string): [TaskNode[], boolean] {
    let changed = false;
    const nextNodes = nodes.map((node) => {
      let children = node.children;
      let childChanged = false;
      if (node.children && node.children.length > 0) {
        const [updatedChildren, subtreeChanged] = this.applyTaskNodeCompletion(node.children, targetId);
        children = updatedChildren;
        childChanged = subtreeChanged;
      }
      if (node.id === targetId) {
        changed = true;
        return { ...node, status: 'complete' as TaskStatus, children };
      }
      if (childChanged) {
        changed = true;
        return { ...node, children };
      }
      return node;
    });
    return [changed ? nextNodes : nodes, changed];
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
    const nextPartial: Partial<LearningOsState> = { ...partial };
    const fallbackLibraryId = this.state.knowledgeLibraryId ?? 'knowledge-library-default';
    const targetLibraryId = nextPartial.knowledgeLibraryId ?? fallbackLibraryId;
    if (nextPartial.knowledgeBase) {
      const states = { ...(this.state.knowledgeLibraryStates ?? {}) };
      states[targetLibraryId] = nextPartial.knowledgeBase;
      nextPartial.knowledgeLibraryStates = states;
    }
    if (nextPartial.notes) {
      const notesMap = { ...(this.state.knowledgeLibraryNotes ?? {}) };
      notesMap[targetLibraryId] = nextPartial.notes;
      nextPartial.knowledgeLibraryNotes = notesMap;
    }
    this.assignState(nextPartial);
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

  private buildWorkspaceAsset(routeItem: StudyRouteItem): WorkspaceAsset {
    const base = this.state.workspace.activeAsset;
    const metadata = `${this.describeRouteKind(routeItem.kind)} · 预计 ${routeItem.etaMinutes} 分钟`;
    const progress =
      routeItem.status === 'complete'
        ? 100
        : Math.max(Math.min(base.progress + 5, 95), base.progress || 20);
    return {
      ...base,
      id: `route-${routeItem.id}`,
      title: routeItem.title,
      chapter: routeItem.detail || base.chapter,
      metadata,
      progress,
      content: this.composeWorkspaceMarkdown(routeItem),
      lastUpdated: this.formatTime(),
    };
  }

  private composeWorkspaceMarkdown(routeItem: StudyRouteItem): string {
    const detail = routeItem.detail ? `> ${routeItem.detail}` : '';
    return [
      `# ${routeItem.title}`,
      detail,
      '## 学习计划',
      `- 类型：${this.describeRouteKind(routeItem.kind)}`,
      `- 预计耗时：${routeItem.etaMinutes} 分钟`,
      '',
      '## 笔记区',
      '- 写下推导、例题、思考',
      '- 记录下一步行动',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private describeRouteKind(kind: StudyRouteItem['kind']): string {
    switch (kind) {
      case 'concept':
        return '概念理解';
      case 'practice':
        return '练习巩固';
      case 'review':
        return '复盘总结';
      case 'quiz':
        return '测验';
      case 'project':
        return '项目实践';
      default:
        return '学习任务';
    }
  }
}
