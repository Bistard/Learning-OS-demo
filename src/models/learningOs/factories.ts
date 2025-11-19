/**
 * Factory helpers that construct concrete Learning OS state slices.
 */
import {
  DEFAULT_DAILY_MINUTES,
  DEFAULT_GOAL_ID,
  KNOWLEDGE_UNSORTED_CATEGORY_ID,
  COUNTDOWN_LOOKAHEAD_DAYS,
  KNOWLEDGE_NOTES_CATEGORY_ID,
} from './constants';
import {
  GoalCreationDraft,
  GoalCreationFlowState,
  GoalProfile,
  GoalProgress,
  AppConfiguration,
  KnowledgeBaseState,
  KnowledgeCategory,
  KnowledgeItem,
  KnowledgeNote,
  KnowledgeLibraryTemplate,
  LearningOsState,
  ResourceHighlight,
  StudyGoal,
  StudyRouteItem,
  TaskNode,
  WeeklyPlanItem,
  WorkspaceState,
} from './types';
import {
  goalSeed,
  knowledgeBaseTemplate,
  knowledgeLibraryTemplates,
  defaultKnowledgeLibraryId,
  resourceHighlightsData,
  studyRouteData,
  weeklyPlanData,
  workspaceTemplate,
  resolveTaskTreeTemplate,
} from './templates';
import { defaultConfiguration } from '../../config/configuration';
import {
  ensureAdvancedSettings,
  getDefaultPreset,
  getDefaultSubject,
} from './goalCreationConfig';

export const NEW_GOAL_CONNECTED_VAULTS = Object.freeze([...knowledgeBaseTemplate.connectedVaults.newGoal]);

const daysUntil = (deadline: string): number => {
  const target = new Date(deadline);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const nextDeadlineIso = (daysAhead = COUNTDOWN_LOOKAHEAD_DAYS, hour = 21): string => {
  const candidate = new Date();
  candidate.setDate(candidate.getDate() + daysAhead);
  candidate.setHours(hour, 0, 0, 0);
  return candidate.toISOString().slice(0, 16);
};

export const createStudyRoute = (): StudyRouteItem[] =>
  studyRouteData.map((item) => ({ ...item }));

export const createWeeklyPlan = (): WeeklyPlanItem[] =>
  weeklyPlanData.map((plan) => ({ ...plan }));

const cloneTaskNode = (node: TaskNode): TaskNode => ({
  ...node,
  children: node.children?.map(cloneTaskNode),
});

export const createTaskTree = (categoryId?: string): TaskNode[] =>
  resolveTaskTreeTemplate(categoryId).map(cloneTaskNode);

export const createResourceHighlights = (): ResourceHighlight[] =>
  resourceHighlightsData.map((highlight) => ({ ...highlight }));

export const createKnowledgeBase = (
  template: KnowledgeLibraryTemplate = knowledgeBaseTemplate
): KnowledgeBaseState => ({
  categories: template.categories.map<KnowledgeCategory>((category: KnowledgeCategory) => ({
    ...category,
    items: category.items.map((item: KnowledgeItem) => ({ ...item })),
  })),
});

export const buildNotesFromKnowledgeBase = (knowledgeBase: KnowledgeBaseState): KnowledgeNote[] => {
  const notesCategory = knowledgeBase.categories.find(
    (category) => category.id === KNOWLEDGE_NOTES_CATEGORY_ID
  );
  if (!notesCategory) {
    return [];
  }
  const now = Date.now();
  return notesCategory.items.map<KnowledgeNote>((item: KnowledgeItem, index: number) => {
    const noteId = item.noteId ?? `note-seed-${item.id}`;
    item.noteId = noteId;
    const timestamp = new Date(now - index * 60_000).toISOString();
    return {
      id: noteId,
      title: item.summary,
      content: item.detail,
      createdAt: timestamp,
      updatedAt: timestamp,
      knowledgeItemId: item.id,
    };
  });
};

const createGoal = (): StudyGoal => {
  const deadline = nextDeadlineIso(goalSeed.profile.deadlineDaysFromNow);
  const subjectId = goalSeed.profile.subjectId ?? 'calculus';
  const subjectLabel = goalSeed.profile.subjectLabel ?? '微积分';
  const profile: GoalProfile = {
    targetType: goalSeed.profile.targetType,
    deadline,
    mastery: goalSeed.profile.mastery,
    dailyMinutes: goalSeed.profile.dailyMinutes,
    materials: [...goalSeed.profile.materials],
    resourcesCaptured: goalSeed.profile.resourcesCaptured,
    subjectId,
    subjectLabel,
    persona: goalSeed.profile.persona,
  };
  const progress: GoalProgress = {
    percent: goalSeed.progress.percent,
    xp: goalSeed.progress.xp,
    remainingDays: daysUntil(deadline),
  };
  return {
    id: goalSeed.id ?? DEFAULT_GOAL_ID,
    name: goalSeed.name,
    focus: goalSeed.focus,
    status: goalSeed.status,
    profile,
    progress,
    todayRoute: createStudyRoute(),
    weeklyPlan: createWeeklyPlan(),
    taskTree: createTaskTree(subjectId),
    highlights: createResourceHighlights(),
    connectedKnowledgeVaults: [...knowledgeBaseTemplate.connectedVaults.activeGoal],
  };
};

export const createGoalDraft = (): GoalCreationDraft => {
  const preset = getDefaultPreset();
  const subject = getDefaultSubject();
  return {
    subjectId: subject.id,
    subjectLabel: subject.label,
    presetId: preset.id,
    targetType: preset.label,
    deadline: nextDeadlineIso(),
    timeMode: 'deadline',
    countdownHours: null,
    mastery: preset.defaultMastery ?? 0,
    materials: [],
    dailyMinutes: preset.defaultDailyMinutes ?? DEFAULT_DAILY_MINUTES,
    advancedSettings: ensureAdvancedSettings(preset.advancedDefaults, preset.id),
  };
};

export const createGoalCreationFlowState = (): GoalCreationFlowState => ({
  step: 'base',
  advancedOpen: false,
  generationPhase: 'idle',
  generationMessageIndex: 0,
});

const createWorkspaceState = (): WorkspaceState => ({
  activeAsset: { ...workspaceTemplate.activeAsset },
});

/**
 * Provides the aggregate application state used by the view-model.
 */
export const createInitialState = (): LearningOsState => {
  const librarySummaries = knowledgeLibraryTemplates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
  }));
  const knowledgeLibraryStates: Record<string, KnowledgeBaseState> = {};
  const knowledgeLibraryNotes: Record<string, KnowledgeNote[]> = {};
  knowledgeLibraryTemplates.forEach((template) => {
    const state = createKnowledgeBase(template);
    knowledgeLibraryStates[template.id] = state;
    knowledgeLibraryNotes[template.id] = buildNotesFromKnowledgeBase(state);
  });
  const preferredLibraryId =
    knowledgeLibraryStates[defaultKnowledgeLibraryId]
      ? defaultKnowledgeLibraryId
      : librarySummaries[0]?.id ?? defaultKnowledgeLibraryId;
  const knowledgeBase =
    knowledgeLibraryStates[preferredLibraryId] ?? { categories: [] };
  const notes = knowledgeLibraryNotes[preferredLibraryId] ?? [];
  const goal = createGoal();
  return {
    page: 'goalDashboard',
    goals: [goal],
    activeGoalId: goal.id,
    creationDraft: createGoalDraft(),
    creationFlow: createGoalCreationFlowState(),
    knowledgeBase,
    knowledgeLibraryId: preferredLibraryId,
    knowledgeLibraries: librarySummaries,
    knowledgeLibraryStates,
    knowledgeLibraryNotes,
    workspace: createWorkspaceState(),
    notes,
    configuration: createConfiguration(),
  };
};

export const ensureUnsortedCategory = (categories: KnowledgeCategory[]): KnowledgeCategory[] => {
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
};

export const prependKnowledgeItem = (
  knowledgeBase: KnowledgeBaseState,
  categoryId: string,
  item: KnowledgeItem
): KnowledgeBaseState => {
  const categories = ensureUnsortedCategory(knowledgeBase.categories);
  const exists = categories.some((category) => category.id === categoryId);
  const targetId = exists ? categoryId : KNOWLEDGE_UNSORTED_CATEGORY_ID;
  return {
    ...knowledgeBase,
    categories: categories.map((category) =>
      category.id === targetId ? { ...category, items: [item, ...category.items] } : category
    ),
  };
};
const createConfiguration = (): AppConfiguration => ({
  ...defaultConfiguration,
});
