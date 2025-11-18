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

export type KnowledgeFolderType =
  | 'cards'
  | 'errors'
  | 'chat'
  | 'notes'
  | 'uploads'
  | 'independent'
  | 'community';

export interface KnowledgeFolder {
  id: string;
  title: string;
  description: string;
  type: KnowledgeFolderType;
  items: number;
  relatedGoalId?: string;
  lastSynced: string;
}

export interface KnowledgeSection {
  id: string;
  title: string;
  description: string;
  folders: KnowledgeFolder[];
}

export interface KnowledgeBaseState {
  sections: KnowledgeSection[];
  autoCaptureEnabled: boolean;
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

export const createStudyRoute = (): StudyRouteItem[] => [
  {
    id: 'route-diagnose',
    title: 'AI 诊断 · 10 题探底',
    detail: '锁定线代弱项，用错题本回填知识库',
    etaMinutes: 15,
    status: 'available',
    kind: 'concept',
  },
  {
    id: 'route-ch3',
    title: '章节 3 · 向量空间',
    detail: '左栏阅读教材 PDF，右栏问 AI 输出例题',
    etaMinutes: 40,
    status: 'available',
    kind: 'concept',
  },
  {
    id: 'route-ch4',
    title: '章节 4 · 矩阵分解练习',
    detail: '10 道变换题 + 即时批改',
    etaMinutes: 35,
    status: 'locked',
    kind: 'practice',
  },
  {
    id: 'route-review',
    title: '错题本复盘',
    detail: 'AI 总结解题模板，沉入知识库',
    etaMinutes: 20,
    status: 'locked',
    kind: 'review',
  },
];

export const createWeeklyPlan = (): WeeklyPlanItem[] => [
  { id: 'week-mon', day: '周一', focus: '概念精读 + 例题', hours: 2, aiTip: '优先攻克抽象向量空间' },
  { id: 'week-wed', day: '周三', focus: '拍照批改作业', hours: 1.5, aiTip: '针对 rank-nullity 追加题单' },
  { id: 'week-fri', day: '周五', focus: '错题巩固 + Quiz', hours: 1, aiTip: '右栏生成 5 题小测' },
  { id: 'week-sun', day: '周日', focus: '仿真模拟 + 复盘', hours: 2, aiTip: '输出雷达图反馈 Knowledge Base' },
];

export const createTaskTree = (): TaskNode[] => [
  {
    id: 'node-foundation',
    title: '基础刷新 · 行列式 / 向量空间',
    type: 'concept',
    status: 'available',
    xp: 120,
    summary: '补齐概念盲区，生成精华卡片',
    children: [
      {
        id: 'node-eigen',
        title: '特征值、特征向量',
        type: 'concept',
        status: 'available',
        xp: 40,
        summary: 'AI 推导 + 可视化理解',
      },
      {
        id: 'node-rank',
        title: 'Rank-Nullity 应用',
        type: 'practice',
        status: 'locked',
        xp: 30,
        summary: '自动抽题 + 逐题批改',
      },
    ],
  },
  {
    id: 'node-application',
    title: '应用强化 · 最小二乘 & 正交投影',
    type: 'project',
    status: 'locked',
    xp: 160,
    summary: '结合 PDF、PPT、错题本，输出总结',
  },
  {
    id: 'node-mock',
    title: '仿真冲刺 · Final Mock',
    type: 'quiz',
    status: 'locked',
    xp: 200,
    summary: '60 分钟限时 · AI 监考 + 自动归档',
  },
];

export const createResourceHighlights = (): ResourceHighlight[] => [
  {
    id: 'highlight-cards',
    title: '5 张精华卡片 · 线性无关速查',
    type: 'card',
    excerpt: 'AI 自动提炼定义 + 常考变式，已推送到 KB',
    source: '知识库 · 精华卡片',
    linkedTaskId: 'node-foundation',
  },
  {
    id: 'highlight-notes',
    title: '即时笔记 · 拉格朗日乘子突破',
    type: 'note',
    excerpt: '已入错题本，AI 标记易错步骤，并提示复习时间',
    source: '左栏 Lecture slides W5',
  },
  {
    id: 'highlight-quiz',
    title: '自适应 Quiz · 正交投影',
    type: 'quiz',
    excerpt: '完成率 80%，AI 建议 2 天后复刷',
    source: 'AI 个性化教师',
  },
];

const createGoal = (): StudyGoal => {
  const deadline = nextDeadlineIso(18);
  return {
    id: GOAL_ID_LINEAR,
    name: '微积分期末考试',
    focus: '线性代数核心 + 冲刺 Mock',
    status: 'active',
    profile: {
      targetType: '期末考试',
      deadline,
      mastery: 42,
      dailyMinutes: 150,
      materials: ['Lecture slides', 'Past midterms', '拍照错题'],
      resourcesCaptured: 36,
    },
    progress: {
      percent: 42,
      xp: 780,
      remainingDays: daysUntil(deadline),
    },
    todayRoute: createStudyRoute(),
    weeklyPlan: createWeeklyPlan(),
    taskTree: createTaskTree(),
    highlights: createResourceHighlights(),
    connectedKnowledgeVaults: ['kb-current-goal', 'kb-unsorted'],
  };
};

export const createGoalDraft = (): GoalCreationDraft => ({
  targetType: '',
  deadline: nextDeadlineIso(),
  mastery: 0,
  materials: [],
  dailyMinutes: DEFAULT_DAILY_MINUTES,
});

export const createKnowledgeSections = (goal: StudyGoal): KnowledgeSection[] => [
  {
    id: 'kb-current',
    title: `当前目标 · ${goal.name}`,
    description: '所有学习痕迹自动归档，小墨代劳整理',
    folders: [
      {
        id: 'kb-cards',
        title: '精华卡片',
        description: 'AI 自动提炼定义、推导、例题',
        type: 'cards',
        items: 24,
        relatedGoalId: goal.id,
        lastSynced: '今日 08:26',
      },
      {
        id: 'kb-errors',
        title: '错题本',
        description: 'Quiz & 作业错题自动回流，含复习提醒',
        type: 'errors',
        items: 17,
        relatedGoalId: goal.id,
        lastSynced: '昨日 22:41',
      },
      {
        id: 'kb-chat',
        title: 'AI 对话记录',
        description: '右栏所有追问按主题归档，可复用',
        type: 'chat',
        items: 48,
        relatedGoalId: goal.id,
        lastSynced: '今日 07:55',
      },
      {
        id: 'kb-notes',
        title: '即时笔记',
        description: '中栏 Markdown 自动沉淀并分类',
        type: 'notes',
        items: 32,
        relatedGoalId: goal.id,
        lastSynced: '今日 07:52',
      },
      {
        id: 'kb-uploads',
        title: '上传资料',
        description: 'PDF / PPT / 拍照笔记自动 OCR + 章节抽取',
        type: 'uploads',
        items: 11,
        relatedGoalId: goal.id,
        lastSynced: '本周二',
      },
    ],
  },
  {
    id: 'kb-independent',
    title: '独立知识库',
    description: '无需绑定目标的长期主题',
    folders: [
      {
        id: 'kb-ind-writing',
        title: '英语写作素材库',
        description: '独立维护，随时引用到任意目标',
        type: 'independent',
        items: 55,
        lastSynced: '3 天前',
      },
      {
        id: 'kb-ind-ml',
        title: '机器学习自学笔记',
        description: '尚未绑定目标，可邀请协作者共写',
        type: 'independent',
        items: 12,
        lastSynced: '上周',
      },
    ],
  },
  {
    id: 'kb-community',
    title: '社区知识库',
    description: '可分享 / 订阅他人公开知识库',
    folders: [
      {
        id: 'kb-community-linear',
        title: '线代真题精解合集（社区）',
        description: '引用后自动关联当前目标',
        type: 'community',
        items: 89,
        lastSynced: '今日 06:15',
      },
    ],
  },
];

const createWorkspaceState = (): WorkspaceState => ({
  activeAsset: {
    id: 'asset-pdf-w5',
    title: 'Lecture Slides · Week 5 正交投影',
    type: 'pdf',
    chapter: 'Chapter 5 Projection',
    progress: 62,
    metadata: '120 页 · 已高亮 14 处 · 自动章节提取完成',
  },
  noteDraft:
    '## 最小二乘推导\n- 从 Ax=b 开始，构造正规方程 `AᵀAx = Aᵀb`\n- 记得区分“投影点 P”与“坐标 x”\n',
  syncedNotes: ['正交基构造 3 步模板', 'Quiz 重点错题总结'],
  lastSyncedAt: '08:12',
  quizQueue: ['生成 5 题判断题', '拍照错题，自动出解析'],
  coachFocus: '当前问题集中在「约束条件翻译」与「符号混淆」。',
});

const createChatHistory = (goalId: string): ChatMessage[] => [
  {
    id: 'chat-1',
    role: 'user',
    content: '我要在 12 月结束前搞定线性代数，今天重点该学什么？',
    relatedGoalId: goalId,
    timestamp: '07:45',
  },
  {
    id: 'chat-2',
    role: 'ai',
    content:
      '已读取你上传的 Week5 PDF + 错题本。建议路线：1) 先复盘“投影矩阵”错题，2) 打开三栏学习空间执行 20 分钟推导练习，3) 结束后生成 Quiz 并沉入知识库。',
    relatedGoalId: goalId,
    timestamp: '07:45',
  },
];

const createTimeline = (): CalendarEvent[] => [
  { id: 'cal-1', day: '周三', title: 'AI 诊断 Quiz', time: '19:30', focus: '10 题冲刺 + 自动复盘' },
  { id: 'cal-2', day: '周五', title: '错题本复刷', time: '20:00', focus: '拍照错题 + RAG 解析' },
  { id: 'cal-3', day: '周日', title: 'Final Mock', time: '09:00', focus: '60 分钟仿真 + 知识库整理' },
];

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
    knowledgeBase: {
      autoCaptureEnabled: true,
      sections: createKnowledgeSections(goal),
    },
    chatHistory: createChatHistory(goal.id),
    workspace: createWorkspaceState(),
    timeline: createTimeline(),
  };
};
