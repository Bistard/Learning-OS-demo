/**
 * Learning OS domain model definitions and helpers.
 *
 * Usage:
 * ```ts
 * const state = createInitialState();
 * console.log(state.page); // landing
 * ```
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

export type TaskDifficulty = '易' | '中' | '难';

export interface UploadItem {
  name: string;
  type: string;
  pages: number;
  size: string;
  status: 'pending' | 'uploaded';
}

export interface TaskNode {
  id: string;
  title: string;
  difficulty: TaskDifficulty;
  eta: number;
  type: TaskKind;
  status: TaskStatus;
  xp: number;
  summary: string;
}

export interface QuestionnaireState {
  deadline: string;
  dailyHours: number;
  examDuration: number;
  isSchoolCourse: boolean;
  mode: ModePreference;
  aiPrediction: boolean;
}

export type MockExamStatus = 'idle' | 'running' | 'complete';

export interface LearningOsState {
  page: Page;
  uploads: UploadItem[];
  tasks: TaskNode[];
  questionnaire: QuestionnaireState;
  countdownTarget: string | null;
  practiceResultVisible: boolean;
  mockStatus: MockExamStatus;
  mockTimerSeconds: number;
  mockResultVisible: boolean;
  isUploading: boolean;
}

export interface Toast {
  message: string;
  tone: ToastTone;
}

export type ToastTone = 'success' | 'info';

export const PLAN_GENERATION_DELAY_MS = 1200;
export const UPLOAD_SIMULATION_INTERVAL_MS = 400;
export const MOCK_EXAM_DURATION_SECONDS = 60 * 60;
export const COUNTDOWN_LOOKAHEAD_DAYS = 3;

const DEFAULT_DAILY_HOURS = 3;
const DEFAULT_EXAM_DURATION = 120;

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

/**
 * Creates upload metadata used to populate the upload list.
 *
 * @returns Immutable list of UploadItem definitions.
 */
export const createInitialUploads = (): UploadItem[] => [
  { name: 'Lecture slides W1-10.pdf', type: '讲义 PDF', pages: 120, size: '18MB', status: 'pending' },
  { name: 'Linear Algebra Textbook Ch.5-7', type: '教材章节', pages: 200, size: '22MB', status: 'pending' },
  { name: '期末 coverage note.png', type: '重点/大纲', pages: 1, size: '0.5MB', status: 'pending' },
  { name: 'Past assignments.zip', type: '练习作业', pages: 45, size: '12MB', status: 'pending' },
  { name: 'Past midterms (no answers).pdf', type: '往年试题', pages: 30, size: '7MB', status: 'pending' },
  { name: 'Quizzes set', type: '随堂测验', pages: 15, size: '2MB', status: 'pending' },
];

/**
 * Builds the default task graph shown after生成.
 *
 * @returns Array of TaskNode definitions.
 */
export const createInitialTasks = (): TaskNode[] => [
  {
    id: 'diag',
    title: '特征值 & 对角化',
    difficulty: '中',
    eta: 25,
    type: 'learn',
    status: 'available',
    xp: 30,
    summary: '最低解题必要知识 + 例题演练',
  },
  {
    id: 'rank-nullity',
    title: '秩-零空间 + 线性相关性',
    difficulty: '中',
    eta: 20,
    type: 'practice',
    status: 'locked',
    xp: 25,
    summary: '典型题 + 常见变式练习，支持拍照批改',
  },
  {
    id: 'orthogonal',
    title: '正交投影 & 最小二乘',
    difficulty: '难',
    eta: 30,
    type: 'learn',
    status: 'locked',
    xp: 30,
    summary: '模板化推导 + 速记要点',
  },
  {
    id: 'review',
    title: '错题本强化',
    difficulty: '易',
    eta: 15,
    type: 'review',
    status: 'locked',
    xp: 15,
    summary: '安排智能复习间隔，批量复刷',
  },
  {
    id: 'mock',
    title: 'Final Mock (倒数第二关)',
    difficulty: '难',
    eta: 60,
    type: 'mock',
    status: 'locked',
    xp: 50,
    summary: '仿真考试 + 小墨逐题批改 + 弱点雷达图',
  },
];

/**
 * Generates the questionnaire defaults before用户调整.
 *
 * @returns QuestionnaireState defaults.
 */
export const createInitialQuestionnaire = (): QuestionnaireState => ({
  deadline: '',
  dailyHours: DEFAULT_DAILY_HOURS,
  examDuration: DEFAULT_EXAM_DURATION,
  isSchoolCourse: true,
  mode: '知识获取 + 备考',
  aiPrediction: true,
});

/**
 * Provides the aggregate application state used by the view-model.
 *
 * @returns A LearningOsState snapshot with initial values.
 */
export const createInitialState = (): LearningOsState => ({
  page: 'landing',
  uploads: createInitialUploads(),
  tasks: createInitialTasks(),
  questionnaire: createInitialQuestionnaire(),
  countdownTarget: null,
  practiceResultVisible: false,
  mockStatus: 'idle',
  mockTimerSeconds: MOCK_EXAM_DURATION_SECONDS,
  mockResultVisible: false,
  isUploading: false,
});

