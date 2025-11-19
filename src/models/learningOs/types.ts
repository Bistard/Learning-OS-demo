/**
 * Shared type definitions for the Learning OS domain model.
 */

export type Page =
  | 'goalDashboard'
  | 'goalCreation'
  | 'goalWorkspace'
  | 'learningWorkspace'
  | 'knowledgeBase'
  | 'noteEditor'
  | 'settings';

export type TaskKind = 'concept' | 'practice' | 'review' | 'quiz' | 'project';

export type TaskStatus = 'locked' | 'available' | 'in-progress' | 'complete';

export type TaskBenefitLevel = 'high' | 'medium' | 'low';

export type TaskOrigin = 'aiGenerated' | 'curated';

export type LearningStrategyId =
  | 'priorityLearning'
  | 'chunking'
  | 'feynman'
  | 'predictionBased'
  | 'aiQuizLoop'
  | 'paceAdjust'
  | 'activeRecall';

export type PersonaSignalKey =
  | 'weakFoundation'
  | 'likesPractice'
  | 'prefersAiMentor'
  | 'fearDifficulty'
  | 'targetScore90'
  | 'targetScore60'
  | 'remaining12h'
  | 'remaining3h';

export interface TaskPersonaBinding {
  signal: PersonaSignalKey;
  label: string;
  action: string;
}

export interface TaskNodeTag {
  id: string;
  label: string;
  description: string;
  type: 'persona' | 'strategy' | 'origin' | 'benefit';
  order: number;
}

export interface TaskWhyBlock {
  statement: string;
  evidence: string[];
}

export interface PersonaSignal {
  id: PersonaSignalKey;
  label: string;
  description: string;
}

export interface LearningPersona {
  remainingHours: number;
  targetScore: number;
  preferences: PersonaSignal[];
  weaknesses: PersonaSignal[];
  constraints: PersonaSignal[];
  strategyLine: string;
}

export type GoalCreationStep = 'base' | 'materials' | 'generation';

export type GoalCreationTimeMode = 'deadline' | 'countdown';

export type GoalGenerationPhase = 'idle' | 'running' | 'ready';

export type GoalAdvancedSettings = Record<string, string>;

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
  etaMinutes: number;
  summary: string;
  benefitLevel: TaskBenefitLevel;
  origin: TaskOrigin;
  personaBindings: TaskPersonaBinding[];
  tagSequence: TaskNodeTag[];
  chunkSteps: string[];
  strategies: LearningStrategyId[];
  why: TaskWhyBlock;
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
  subjectId?: string;
  subjectLabel?: string;
  presetId?: string;
  advancedSettings?: GoalAdvancedSettings;
  timeMode?: GoalCreationTimeMode;
  countdownHours?: number | null;
  persona?: LearningPersona;
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
  subjectId: string;
  subjectLabel: string;
  presetId: string;
  targetType: string;
  deadline: string;
  timeMode: GoalCreationTimeMode;
  countdownHours: number | null;
  mastery: number;
  materials: string[];
  dailyMinutes: number;
  advancedSettings: GoalAdvancedSettings;
}

export interface GoalCreationFlowState {
  step: GoalCreationStep;
  advancedOpen: boolean;
  generationPhase: GoalGenerationPhase;
  generationMessageIndex: number;
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

export interface KnowledgeLibrarySummary {
  id: string;
  title: string;
  description: string;
}

export interface KnowledgeLibraryTemplate extends KnowledgeBaseTemplate, KnowledgeLibrarySummary {}

export interface AppConfiguration {
  notePreviewEnabled: boolean;
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
  content: string;
  lastUpdated: string;
}

export interface WorkspaceState {
  activeAsset: WorkspaceAsset;
}

export interface LearningOsState {
  page: Page;
  goals: StudyGoal[];
  activeGoalId: string | null;
  creationDraft: GoalCreationDraft;
  creationFlow: GoalCreationFlowState;
  knowledgeBase: KnowledgeBaseState;
  knowledgeLibraryId: string;
  knowledgeLibraries: KnowledgeLibrarySummary[];
  knowledgeLibraryStates: Record<string, KnowledgeBaseState>;
  knowledgeLibraryNotes: Record<string, KnowledgeNote[]>;
  workspace: WorkspaceState;
  notes: KnowledgeNote[];
  configuration: AppConfiguration;
}

export interface Toast {
  message: string;
  tone: ToastTone;
}

export type ToastTone = 'success' | 'info' | 'warning';
