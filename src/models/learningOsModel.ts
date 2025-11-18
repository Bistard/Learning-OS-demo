/**
 * Learning OS domain model definitions refactored for the Goal x Knowledge Base
 * interaction design described in demo_dev_plan.md.
 *
 * Usage:
 * ```ts
 * const state = createInitialState();
 * console.log(state.page); // goalDashboard
 * ```
 */

import initialGoalData from '../data/initialGoal.json';
import studyRouteTemplate from '../data/templates/studyRoute.json';
import weeklyPlanTemplate from '../data/templates/weeklyPlan.json';
import taskTreeTemplate from '../data/templates/taskTree.json';
import resourceHighlightsTemplate from '../data/templates/resourceHighlights.json';
import knowledgeBaseTemplateData from '../data/templates/knowledgeBase.json';
import workspaceTemplateData from '../data/templates/workspace.json';
import chatHistoryTemplate from '../data/templates/chatHistory.json';
import timelineTemplate from '../data/templates/timeline.json';

export type Page =
  | 'goalDashboard'
  | 'goalCreation'
  | 'goalWorkspace'
  | 'learningWorkspace'
  | 'knowledgeBase'
  | 'aiChat'
  | 'calendar'
  | 'settings';

export type TaskKind = 'concept' | 'practice' | 'review' | 'quiz' | 'project';

export type TaskStatus = 'locked' | 'available' | 'in-progress' | 'complete';

export interface StudyRouteItem {
  id: string;
  title: string;
  detail: string;
  etaMinutes: number;
  status: TaskStatus;
  kind: TaskKind;
}

export interface WeeklyPlanItem {
  id: string;
  day: string;
  focus: string;
  hours: number;
  aiTip: string;
}

export interface TaskNode {
  id: string;
  title: string;
  type: TaskKind;
  status: TaskStatus;
  xp: number;
  summary: string;
  children?: TaskNode[];
}

export interface ResourceHighlight {
  id: string;
  title: string;
  type: 'card' | 'note' | 'quiz' | 'insight';
  excerpt: string;
  source: string;
  linkedTaskId?: string;
}

export interface GoalProfile {
  targetType: string;
  deadline: string;
  mastery: number;
  dailyMinutes: number;
  materials: string[];
  resourcesCaptured: number;
}

export interface GoalProgress {
  percent: number;
  xp: number;
  remainingDays: number;
}

export interface StudyGoal {
  id: string;
  name: string;
  focus: string;
  status: 'active' | 'draft' | 'complete';
  profile: GoalProfile;
  progress: GoalProgress;
  todayRoute: StudyRouteItem[];
  weeklyPlan: WeeklyPlanItem[];
  taskTree: TaskNode[];
  highlights: ResourceHighlight[];
  connectedKnowledgeVaults: string[];
}

export interface GoalCreationDraft {
  targetType: string;
  deadline: string;
  mastery: number;
  materials: string[];
  dailyMinutes: number;
}

export type KnowledgeCategoryKind =
  | 'flashcards'
  | 'mistakes'
  | 'aiChats'
  | 'links'
  | 'uploads'
  | 'notes'
  | 'uncategorized'
  | 'custom';

export interface KnowledgeItem {
  id: string;
  summary: string;
  detail: string;
  source: string;
  updatedAt: string;
  goalId?: string;
  href?: string;
}

export interface KnowledgeCategory {
  id: string;
  title: string;
  kind: KnowledgeCategoryKind;
  isFixed: boolean;
  items: KnowledgeItem[];
}

export interface KnowledgeBaseState {
  categories: KnowledgeCategory[];
}

export const KNOWLEDGE_UNSORTED_CATEGORY_ID = 'kb-uncategorized';

export interface WorkspaceAsset {
  id: string;
  title: string;
  type: 'pdf' | 'web' | 'note';
  chapter: string;
  progress: number;
  metadata: string;
}

export interface WorkspaceState {
  activeAsset: WorkspaceAsset;
  noteDraft: string;
  syncedNotes: string[];
  lastSyncedAt: string;
  quizQueue: string[];
  coachFocus: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  relatedGoalId?: string;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  day: string;
  title: string;
  time: string;
  focus: string;
}

export interface LearningOsState {
  page: Page;
  goals: StudyGoal[];
  activeGoalId: string | null;
  creationDraft: GoalCreationDraft;
  knowledgeBase: KnowledgeBaseState;
  chatHistory: ChatMessage[];
  workspace: WorkspaceState;
  timeline: CalendarEvent[];
}

export interface Toast {
  message: string;
  tone: ToastTone;
}

export type ToastTone = 'success' | 'info' | 'warning';

export const COUNTDOWN_LOOKAHEAD_DAYS = 21;

const GOAL_ID_LINEAR = 'goal-linear';
const DEFAULT_DAILY_MINUTES = 120;

interface GoalProfileSeed extends Omit<GoalProfile, 'deadline'> {
  deadlineDaysFromNow: number;
}

interface GoalSeed {
  id: string;
  name: string;
  focus: string;
  status: StudyGoal['status'];
  profile: GoalProfileSeed;
  progress: Omit<GoalProgress, 'remainingDays'>;
}

interface KnowledgeCategoryTemplate extends KnowledgeCategory {
  items: KnowledgeItem[];
}

interface KnowledgeBaseTemplate {
  categories: KnowledgeCategoryTemplate[];
  connectedVaults: {
    activeGoal: string[];
    newGoal: string[];
  };
}

type ChatMessageSeed = Omit<ChatMessage, 'relatedGoalId'>;

const goalSeed = initialGoalData as GoalSeed;
const studyRouteData = studyRouteTemplate as StudyRouteItem[];
const weeklyPlanData = weeklyPlanTemplate as WeeklyPlanItem[];
const taskTreeData = taskTreeTemplate as TaskNode[];
const resourceHighlightsData = resourceHighlightsTemplate as ResourceHighlight[];
const knowledgeBaseTemplate = knowledgeBaseTemplateData as KnowledgeBaseTemplate;
const workspaceTemplate = workspaceTemplateData as WorkspaceState;
const chatHistorySeeds = chatHistoryTemplate as ChatMessageSeed[];
const timelineData = timelineTemplate as CalendarEvent[];

export const NEW_GOAL_CONNECTED_VAULTS = Object.freeze([
  ...knowledgeBaseTemplate.connectedVaults.newGoal,
]);

/**
 * Returns the ISO string used by datetime-local inputs.
 *
 * @param daysAhead Number of days to add relative to now.
 * @param hour Target hour (0-23).
 * @returns ISO string trimmed to minutes.
 */
export const nextDeadlineIso = (daysAhead = COUNTDOWN_LOOKAHEAD_DAYS, hour = 21): string => {
  const candidate = new Date();
  candidate.setDate(candidate.getDate() + daysAhead);
  candidate.setHours(hour, 0, 0, 0);
  return candidate.toISOString().slice(0, 16);
};

const daysUntil = (deadline: string): number => {
  const target = new Date(deadline);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const createStudyRoute = (): StudyRouteItem[] =>
  studyRouteData.map((item) => ({ ...item }));

export const createWeeklyPlan = (): WeeklyPlanItem[] =>
  weeklyPlanData.map((plan) => ({ ...plan }));

const cloneTaskNode = (node: TaskNode): TaskNode => ({
  ...node,
  children: node.children?.map(cloneTaskNode),
});

export const createTaskTree = (): TaskNode[] => taskTreeData.map(cloneTaskNode);

export const createResourceHighlights = (): ResourceHighlight[] =>
  resourceHighlightsData.map((highlight) => ({ ...highlight }));

/**
 * Creates the knowledge base snapshot with cloned categories and items.
 *
 * @returns A KnowledgeBaseState value decoupled from the template file.
 */
export const createKnowledgeBase = (): KnowledgeBaseState => ({
  categories: knowledgeBaseTemplate.categories.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item })),
  })),
});

const createGoal = (): StudyGoal => {
  const deadline = nextDeadlineIso(goalSeed.profile.deadlineDaysFromNow);
  const profile: GoalProfile = {
    targetType: goalSeed.profile.targetType,
    deadline,
    mastery: goalSeed.profile.mastery,
    dailyMinutes: goalSeed.profile.dailyMinutes,
    materials: [...goalSeed.profile.materials],
    resourcesCaptured: goalSeed.profile.resourcesCaptured,
  };
  const progress: GoalProgress = {
    percent: goalSeed.progress.percent,
    xp: goalSeed.progress.xp,
    remainingDays: daysUntil(deadline),
  };
  return {
    id: goalSeed.id ?? GOAL_ID_LINEAR,
    name: goalSeed.name,
    focus: goalSeed.focus,
    status: goalSeed.status,
    profile,
    progress,
    todayRoute: createStudyRoute(),
    weeklyPlan: createWeeklyPlan(),
    taskTree: createTaskTree(),
    highlights: createResourceHighlights(),
    connectedKnowledgeVaults: [...knowledgeBaseTemplate.connectedVaults.activeGoal],
  };
};

export const createGoalDraft = (): GoalCreationDraft => ({
  targetType: '',
  deadline: nextDeadlineIso(),
  mastery: 0,
  materials: [],
  dailyMinutes: DEFAULT_DAILY_MINUTES,
});

const createWorkspaceState = (): WorkspaceState => ({
  activeAsset: { ...workspaceTemplate.activeAsset },
  noteDraft: workspaceTemplate.noteDraft,
  syncedNotes: [...workspaceTemplate.syncedNotes],
  lastSyncedAt: workspaceTemplate.lastSyncedAt,
  quizQueue: [...workspaceTemplate.quizQueue],
  coachFocus: workspaceTemplate.coachFocus,
});

const createChatHistory = (goalId: string): ChatMessage[] =>
  chatHistorySeeds.map((seed) => ({
    ...seed,
    relatedGoalId: goalId,
  }));

const createTimeline = (): CalendarEvent[] => timelineData.map((event) => ({ ...event }));

/**
 * Provides the aggregate application state used by the view-model.
 *
 * @returns A LearningOsState snapshot with initial values.
 */
export const createInitialState = (): LearningOsState => {
  const goal = createGoal();
  return {
    page: 'goalDashboard',
    goals: [goal],
    activeGoalId: goal.id,
    creationDraft: createGoalDraft(),
    knowledgeBase: createKnowledgeBase(),
    chatHistory: createChatHistory(goal.id),
    workspace: createWorkspaceState(),
    timeline: createTimeline(),
  };
};









