/**
 * Shared type definitions for the Learning OS domain model.
 */

export type Page =
  | 'goalDashboard'
  | 'goalCreation'
  | 'goalWorkspace'
  | 'learningWorkspace'
  | 'knowledgeBase'
  | 'noteEditor';

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
  noteId?: string;
}

export interface KnowledgeCategory {
  id: string;
  title: string;
  kind: KnowledgeCategoryKind;
  isFixed: boolean;
  icon: string;
  color: string;
  items: KnowledgeItem[];
}

export interface KnowledgeBaseState {
  categories: KnowledgeCategory[];
}

export interface KnowledgeBaseTemplate {
  connectedVaults: {
    activeGoal: string[];
    newGoal: string[];
  };
  categories: KnowledgeCategory[];
}

export interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  knowledgeItemId: string;
}

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

export interface LearningOsState {
  page: Page;
  goals: StudyGoal[];
  activeGoalId: string | null;
  creationDraft: GoalCreationDraft;
  knowledgeBase: KnowledgeBaseState;
  workspace: WorkspaceState;
  notes: KnowledgeNote[];
}

export interface Toast {
  message: string;
  tone: ToastTone;
}

export type ToastTone = 'success' | 'info' | 'warning';
