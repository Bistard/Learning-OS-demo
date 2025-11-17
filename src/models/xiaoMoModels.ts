/**
 * @fileoverview Shared data models, enums, and factory helpers for the XiaoMo sprint demo.
 */

export type Page =
  | 'landing'
  | 'upload'
  | 'questionnaire'
  | 'tasks'
  | 'learning'
  | 'practice'
  | 'review'
  | 'mock'
  | 'complete';

export type ModePreference = '知识获取 + 备考' | '快速应试';
export type TaskKind = 'learn' | 'practice' | 'review' | 'mock';
export type TaskStatus = 'locked' | 'available' | 'complete';
export type TaskDifficulty = '低' | '中' | '高';

export interface UploadItem {
  readonly name: string;
  readonly type: string;
  readonly pages: number;
  readonly size: string;
  status: 'pending' | 'uploaded';
}

export interface TaskNode {
  readonly id: string;
  readonly title: string;
  readonly difficulty: TaskDifficulty;
  readonly eta: number;
  readonly type: TaskKind;
  status: TaskStatus;
  readonly xp: number;
  readonly summary: string;
}

export interface QuestionnaireState {
  deadline: string;
  dailyHours: number;
  examDuration: number;
  isSchoolCourse: boolean;
  mode: ModePreference;
  aiPrediction: boolean;
}

export interface PracticeFeedback {
  verdict: 'correct' | 'incorrect';
  title: string;
  steps: string[];
  hint: string;
}

export interface MockStatus {
  hasStarted: boolean;
  remainingSeconds: number;
  resultSummary: string | null;
}

export interface XiaoMoState {
  page: Page;
  uploadItems: UploadItem[];
  tasks: TaskNode[];
  questionnaire: QuestionnaireState;
  countdownTarget: Date | null;
  practiceFeedback: PracticeFeedback | null;
  mockStatus: MockStatus;
}

export const INK_THEME = {
  primary: '#111827',
  accent: '#7f8ea3',
  surface: '#f6f5f0',
  success: '#3baa8f',
  warning: '#f59f00',
} as const;

const BASE_UPLOADS: UploadItem[] = [
  { name: 'Lecture slides W1-10.pdf', type: '讲义 PDF', pages: 120, size: '18MB', status: 'pending' },
  { name: 'Linear Algebra Textbook Ch.5-7', type: '教材章节', pages: 200, size: '22MB', status: 'pending' },
  { name: '期末 coverage note.png', type: '期末重点', pages: 1, size: '0.5MB', status: 'pending' },
  { name: 'Past assignments.zip', type: 'past assignment', pages: 45, size: '12MB', status: 'pending' },
  { name: 'Past midterms (no answers).pdf', type: 'past midterm', pages: 30, size: '7MB', status: 'pending' },
  { name: 'Quiz collection', type: 'quiz', pages: 15, size: '2MB', status: 'pending' },
];

const BASE_TASKS: TaskNode[] = [
  {
    id: 'diag',
    title: '特征值 & 对角化',
    difficulty: '中',
    eta: 25,
    type: 'learn',
    status: 'available',
    xp: 30,
    summary: '最低必要知识 + 模板化拆解',
  },
  {
    id: 'rank-nullity',
    title: '秩-零空间联动',
    difficulty: '高',
    eta: 20,
    type: 'practice',
    status: 'locked',
    xp: 25,
    summary: '典型题 + 变式题，附拍照批改',
  },
  {
    id: 'orthogonal',
    title: '正交投影 & 最小二乘',
    difficulty: '高',
    eta: 30,
    type: 'learn',
    status: 'locked',
    xp: 30,
    summary: '模板推导 + 易错点提醒',
  },
  {
    id: 'review',
    title: '错题本强化',
    difficulty: '中',
    eta: 15,
    type: 'review',
    status: 'locked',
    xp: 15,
    summary: '高频错因 + 间隔复习安排',
  },
  {
    id: 'mock',
    title: '终局模拟考',
    difficulty: '高',
    eta: 60,
    type: 'mock',
    status: 'locked',
    xp: 50,
    summary: '仿真考试 + 弱点雷达图',
  },
];

export const createInitialQuestionnaire = (): QuestionnaireState => ({
  deadline: '',
  dailyHours: 3,
  examDuration: 120,
  isSchoolCourse: true,
  mode: '知识获取 + 备考',
  aiPrediction: true,
});

export const createInitialUploads = (): UploadItem[] => BASE_UPLOADS.map((item) => ({ ...item }));
export const createInitialTasks = (): TaskNode[] => BASE_TASKS.map((task) => ({ ...task }));

export const createInitialState = (): XiaoMoState => ({
  page: 'landing',
  uploadItems: createInitialUploads(),
  tasks: createInitialTasks(),
  questionnaire: createInitialQuestionnaire(),
  countdownTarget: null,
  practiceFeedback: null,
  mockStatus: {
    hasStarted: false,
    remainingSeconds: 60 * 60,
    resultSummary: null,
  },
});
