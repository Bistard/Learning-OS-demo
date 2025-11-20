import { Page, StudyGoal } from '../../models/learningOsModel';
import { ViewSnapshot } from '../../viewModels/learningOsViewModel';
import { RenderRegions, UiModule } from '../types';
import { renderMarkdown as renderMarkdownContent } from '../../utils/markdown';

type ReviewQuestionType =
  | 'flashcard'
  | 'singleChoice'
  | 'multiSelect'
  | 'matching'
  | 'fillBlank'
  | 'shortAnswer';

interface ReviewQuestionFeedback {
  correct?: string;
  incorrect?: string;
  neutral?: string;
  partial?: string;
}

interface ReviewQuestionBase {
  id: string;
  order: number;
  type: ReviewQuestionType;
  title: string;
  focus: string;
  ragSource: string;
  personaHint: string;
  reason: string;
  feedback: ReviewQuestionFeedback;
}

interface FlashcardQuestion extends ReviewQuestionBase {
  type: 'flashcard';
  front: string;
  back: string;
  highlight: string;
}

interface SingleChoiceOption {
  id: string;
  label: string;
  detail?: string;
}

interface SingleChoiceQuestion extends ReviewQuestionBase {
  type: 'singleChoice';
  prompt: string;
  options: SingleChoiceOption[];
  answer: string;
}

interface MultiSelectQuestion extends ReviewQuestionBase {
  type: 'multiSelect';
  prompt: string;
  options: SingleChoiceOption[];
  answers: string[];
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
  helper: string;
}

interface MatchingQuestion extends ReviewQuestionBase {
  type: 'matching';
  prompt: string;
  pairs: MatchingPair[];
}

interface FillBlankField {
  id: string;
  label: string;
  answers: string[];
  placeholder?: string;
}

interface FillBlankQuestion extends ReviewQuestionBase {
  type: 'fillBlank';
  prompt: string;
  blanks: FillBlankField[];
}

interface ShortAnswerQuestion extends ReviewQuestionBase {
  type: 'shortAnswer';
  prompt: string;
  guide: string;
  keywords: string[];
}

type ReviewQuestion =
  | FlashcardQuestion
  | SingleChoiceQuestion
  | MultiSelectQuestion
  | MatchingQuestion
  | FillBlankQuestion
  | ShortAnswerQuestion;

interface ReviewAnswerState {
  status: 'pending' | 'revealed' | 'correct' | 'incorrect' | 'partial';
  response?: unknown;
  timestamp?: number;
}

interface PersonalizationContext {
  subject: string;
  goal: string;
  personaFear: string;
  personaPreference: string;
  resource: string;
  deadlineDays: string;
  focusLine: string;
}

const createDefaultContext = (): PersonalizationContext => ({
  subject: '核心科目',
  goal: '当前目标',
  personaFear: '怕难',
  personaPreference: '喜欢拆步骤',
  resource: 'PPT 第 12 页',
  deadlineDays: '10',
  focusLine: 'AI 会根据资料持续生成任务',
});

const buildContext = (goal?: StudyGoal | null): PersonalizationContext => {
  if (!goal) return createDefaultContext();
  const persona = goal.profile.persona;
  const fear =
    persona?.weaknesses?.[0]?.label ??
    persona?.constraints?.[0]?.label ??
    persona?.preferences?.[0]?.label ??
    '怕难';
  const preference =
    persona?.preferences?.[0]?.label ??
    persona?.strategyLine ??
    '喜欢拆步骤';
  const resource = goal.profile.materials?.[0] ?? 'PPT 第 12 页';
  return {
    subject: goal.profile.subjectLabel ?? '冲刺科目',
    goal: goal.name ?? '当前目标',
    personaFear: fear,
    personaPreference: preference,
    resource,
    deadlineDays: `${goal.progress.remainingDays ?? 10}`,
    focusLine: goal.focus ?? 'AI 会根据资料持续生成任务',
  };
};

const personalize = (text: string | undefined, context: PersonalizationContext): string => {
  if (!text) return '';
  return text
    .replace(/\{\{subject\}\}/g, context.subject)
    .replace(/\{\{goal\}\}/g, context.goal)
    .replace(/\{\{personaFear\}\}/g, context.personaFear)
    .replace(/\{\{personaPreference\}\}/g, context.personaPreference)
    .replace(/\{\{resource\}\}/g, context.resource)
    .replace(/\{\{deadlineDays\}\}/g, context.deadlineDays)
    .replace(/\{\{focusLine\}\}/g, context.focusLine);
};
const REVIEW_DECK: ReadonlyArray<ReviewQuestion> = [
  {
    id: 'fc-chain',
    order: 1,
    type: 'flashcard',
    title: '链式法则 · 3 步模板',
    focus: '微分强化',
    ragSource: '【来自 PPT 第 12 页】',
    personaHint: '【你常错的部分】',
    reason: '错题本第 3 题漏乘内导数，先把模板抄顺。',
    front: '写出 d/dx sin(3x^2-1) 的三步顺序',
    back: '1. 外层 sin→cos\n2. 保留 (3x^2-1)\n3. 乘内导 6x',
    highlight: '“外→保→乘” 来自 PPT 第 12 页红框。',
    feedback: {
      neutral: '翻面后请把 3 步写到草稿区，并在 15 秒内说出“求外导 / 保留内层 / 乘内导”。',
    },
  },
  {
    id: 'fc-limit',
    order: 2,
    type: 'flashcard',
    title: 'ln 复合函数极限',
    focus: '极限巩固',
    ragSource: '【来自 10.03 课堂笔记】',
    personaHint: '【来自你的错题本】',
    reason: '你曾把 ln 展开式当成万能，先确认判别式。',
    front: '记住：lim_{x→0} ln(1+g(x)) / g(x) = ?',
    back: '= 1，只要 g(x) → 0。课堂笔记写着“先确认 g(x)→0 再套公式”。',
    highlight: '把“先判断极限”写在卡片顶部。',
    feedback: {
      neutral: '大声读出“先判断 g(x)→0，再代入 ln 展开式”，帮助肌肉记忆。',
    },
  },
  {
    id: 'fc-mean',
    order: 3,
    type: 'flashcard',
    title: '平均值定理：连-导-商',
    focus: '考试高频',
    ragSource: '【来自错题本·导数篇】',
    personaHint: '【你常错的部分】',
    reason: '画像里写{{personaFear}}，先用最短的口诀稳住心态。',
    front: '平均值定理的三个前提？（函数/闭区间/开区间）',
    back: "1. f(x) 在 [a,b] 连续\n2. 在 (a,b) 可导\n3. ∃c，使 f'(c) = (f(b)-f(a))/(b-a)",
    highlight: '用“连-导-商” 3 个字记忆。',
    feedback: {
      neutral: '写下“连-导-商”贴在错题本封面，下次遇到提示词立刻调用。',
    },
  },
  {
    id: 'sc-chain-error',
    order: 4,
    type: 'singleChoice',
    title: '链式法则错因定位',
    focus: '错因定位',
    ragSource: '【来自错题本第 3 题】',
    personaHint: '【来自你的错题本】',
    reason: '因为{{personaFear}}，我把题目改成一句话判断。',
    prompt: '错题本第 3 题漏掉 6x 的根本原因是？',
    options: [
      { id: 'a', label: '把内函数当常数', detail: '写完 cos(3x^2-1) 就结束了' },
      { id: 'b', label: '把链式法则写成乘积法则', detail: '中途插入多余项' },
      { id: 'c', label: '把 6x 抄成 6x^2', detail: '计算无误只是抄错' },
      { id: 'd', label: '先算内导再算外导', detail: '顺序颠倒导致遗忘' },
    ],
    answer: 'a',
    feedback: {
      correct: '定位准确，等下的多选题会让你补写完整表达。',
      incorrect: '翻到 PPT 第 12 页红框：真正的问题是“把内函数当常数”，不是顺序。',
    },
  },
  {
    id: 'sc-substitution',
    order: 5,
    type: 'singleChoice',
    title: '最稳妥的换元选择',
    focus: '积分策略',
    ragSource: '【来自 PPT 第 18 页】',
    personaHint: '【来自 PPT 第 18 页】',
    reason: '基于{{resource}}上的高亮，我保留相同语境。',
    prompt:
      '求 ∫ (3x^2-1) · e^{x^3 - x} dx 时，更稳妥的换元是？（要求 30 秒内写出）',
    options: [
      { id: 'a', label: 'u = x^3 - x', detail: '导数刚好是 integrand 前半部分' },
      { id: 'b', label: 'u = 3x^2 - 1', detail: '能让 e^{x^3-x} 保持不变' },
      { id: 'c', label: 'u = e^{x^3 - x}', detail: '化指数但导数复杂' },
      { id: 'd', label: 'u = x^2', detail: '最常见但不对称' },
    ],
    answer: 'a',
    feedback: {
      correct: '很好，填空题会继续沿用 u = x^3 - x。',
      incorrect: '参考 PPT 18 页：只要看到 e^{x^3 - x} 和 (3x^2-1) 就优先考虑 u = x^3 - x。',
    },
  },
  {
    id: 'sc-feedback-tone',
    order: 6,
    type: 'singleChoice',
    title: 'AI 反馈语气选择',
    focus: '学习画像',
    ragSource: '【来自学习画像】',
    personaHint: '【{{personaPreference}}】',
    reason: '画像里写了{{personaPreference}}，我需要确认语气偏好。',
    prompt: '对你来说最能稳定情绪的反馈语气是？',
    options: [
      { id: 'a', label: '拆步骤', detail: '告诉你一步一步怎么做' },
      { id: 'b', label: '结果导向', detail: '直接给出答案' },
      { id: 'c', label: '挑战式', detail: '用难题刺激你' },
      { id: 'd', label: '故事型', detail: '引用案例或比喻' },
    ],
    answer: 'a',
    feedback: {
      correct: '收到，后续解析都会维持“先拆步骤再回答”。',
      incorrect: '默认改为拆步骤语气，你可以在设置里再调整。',
    },
  },
  {
    id: 'sc-source-focus',
    order: 7,
    type: 'singleChoice',
    title: '资料来源优先级',
    focus: 'RAG 策略',
    ragSource: '【来自资料索引】',
    personaHint: '【来自 PPT 第 12 页】',
    reason: '当前目标连接了 {{resource}}，判断优先抓哪个来源。',
    prompt: '如果只剩 10 分钟，你会优先翻哪份资料来确认链式法则？',
    options: [
      { id: 'a', label: '课堂笔记 10.03', detail: '有老师手写提示' },
      { id: 'b', label: '错题本·导数篇', detail: '直接提醒易错点' },
      { id: 'c', label: 'PPT 第 12 页', detail: '包含完整推导' },
      { id: 'd', label: '冲刺讲义 Vol.5', detail: '有预测题' },
    ],
    answer: 'b',
    feedback: {
      correct: '先复盘错题再看 PPT，会在 20 分钟内形成闭环。',
      incorrect: '先把错题对齐再看 PPT，才能真正改掉漏项。',
    },
  },
  {
    id: 'ms-route',
    order: 8,
    type: 'multiSelect',
    title: '20 分钟复习路径',
    focus: '节奏控制',
    ragSource: '【来自 Workspace 计划】',
    personaHint: '【{{personaPreference}}】',
    reason: '你勾了“剩{{deadlineDays}}天”，选出最紧凑的组合。',
    prompt: '下列步骤中，哪些组合能在 20 分钟内完成并覆盖链式法则？（多选）',
    options: [
      { id: 'a', label: '抄 PPT 模板 + 重写错题本第 3 题' },
      { id: 'b', label: '做 5 道全新题' },
      { id: 'c', label: '复述课堂笔记 + 完成 1 道填空题' },
      { id: 'd', label: '整理知识库标签' },
    ],
    answers: ['a', 'c'],
    feedback: {
      correct: '完美，模板 + 错题 + 课堂复述刚好 20 分钟。',
      incorrect: '建议“模板/错题/复述”三件事，整理标签留到知识库页再做。',
    },
  },
  {
    id: 'ms-warning',
    order: 9,
    type: 'multiSelect',
    title: '错题再犯的征兆',
    focus: '错误模式',
    ragSource: '【来自错题本标注】',
    personaHint: '【你常错的部分】',
    reason: '我比对错题本与 3 份 PPT，高频征兆如下，选出真正与你有关的。',
    prompt: '哪些行为一出现，你就大概率再次漏掉内导数？（多选）',
    options: [
      { id: 'a', label: '先写下答案，再补步骤' },
      { id: 'b', label: '草稿只写一行' },
      { id: 'c', label: '忽略括号，直接代入数值' },
      { id: 'd', label: '边听歌边刷题' },
    ],
    answers: ['a', 'b', 'c'],
    feedback: {
      correct: '抓到全部征兆，AI 会在检测到这些行为时提示你。',
      incorrect: '错题本批注写得很清楚：一旦草稿少于两行就会漏因子。',
    },
  },
  {
    id: 'ms-materials',
    order: 10,
    type: 'multiSelect',
    title: '资料来源拼图',
    focus: 'RAG 组合',
    ragSource: '【来自知识库】',
    personaHint: '【来自 PPT 第 18 页】',
    reason: '当前目标连接了 4 类资料，选出适合做“复习”模式的组合。',
    prompt: '哪些资料组合最适合生成链式法则测验？（多选）',
    options: [
      { id: 'a', label: 'PPT 第 12-18 页' },
      { id: 'b', label: '错题本·导数篇' },
      { id: 'c', label: '课堂录音' },
      { id: 'd', label: '未整理的网页收藏' },
    ],
    answers: ['a', 'b', 'c'],
    feedback: {
      correct: '有结构 (PPT) + 错因 (错题) + 语气 (录音)，足够生成 5 种题型。',
      incorrect: '网页收藏缺少结构化标签，暂不适合直接生成测验。',
    },
  },
  {
    id: 'match-sources',
    order: 11,
    type: 'matching',
    title: '资料 → 题型匹配',
    focus: 'RAG 映射',
    ragSource: '【来自资料索引】',
    personaHint: '【来自 PPT 第 12 页】',
    reason: '让你一眼看到资料和题型的绑定关系。',
    prompt: '把资料来源与最适合生成的题型连起来。',
    pairs: [
      { id: 'p1', left: 'PPT 第 12 页', right: 'Flashcard 模板', helper: '含 3 步总结' },
      { id: 'p2', left: '错题本·导数篇', right: '多选题', helper: '记录多个错因' },
      { id: 'p3', left: '课堂笔记 10.03', right: '填空题', helper: '原句有空格提示' },
    ],
    feedback: {
      correct: '连线齐全，系统会按同样逻辑生成题。',
      incorrect: '提示：错题本更适合多选，因为它列出多个错因。',
    },
  },
  {
    id: 'match-persona',
    order: 12,
    type: 'matching',
    title: '画像 → 策略连线',
    focus: '个性化',
    ragSource: '【来自学习画像】',
    personaHint: '【{{personaPreference}}】',
    reason: '画像里的信号会映射到不同引导方式。',
    prompt: '把画像信号与使用的提示风格连线。',
    pairs: [
      { id: 'q1', left: '怕难', right: '易→中梯度', helper: '先给最易版' },
      { id: 'q2', left: '喜欢拆步骤', right: '步骤提示卡', helper: '每题都列 3 步' },
      { id: 'q3', left: '剩 12 小时', right: '紧凑倒计时', helper: '每题显示剩余分钟' },
    ],
    feedback: {
      correct: '画像与提示绑定完成，后续反馈会沿用。',
      incorrect: '再看看画像面板：喜欢拆步骤 ≠ 紧凑倒计时。',
    },
  },
  {
    id: 'match-feedback',
    order: 13,
    type: 'matching',
    title: 'AI 反馈 → 资料来源',
    focus: 'RAG 透明度',
    ragSource: '【来自知识库引用】',
    personaHint: '【来自错题本】',
    reason: '让你看到每条反馈背后的引用，建立信任。',
    prompt: '把反馈语句与引用的资料连起来。',
    pairs: [
      { id: 'r1', left: '“我在 PPT 12 页看到…”', right: 'PPT 12 页', helper: '蓝色截图' },
      { id: 'r2', left: '“错题本第 3 题标了 6x”', right: '错题本', helper: '红色批注' },
      { id: 'r3', left: '“课堂笔记 10.03 写了…”', right: '课堂笔记', helper: '橙色高亮' },
    ],
    feedback: {
      correct: '做得好，RAG 解释会继续在每条反馈里呈现。',
      incorrect: '观察颜色：蓝 = PPT，红 = 错题，橙 = 课堂笔记。',
    },
  },
  {
    id: 'fill-chain',
    order: 14,
    type: 'fillBlank',
    title: '弥补漏写的 6x',
    focus: '填空修正',
    ragSource: '【来自错题本第 3 题】',
    personaHint: '【来自你的错题本】',
    reason: '直接把你漏掉的东西填出来。',
    prompt: '补全链式法则的最后一步：',
    blanks: [
      { id: 'b1', label: '空 1', answers: ['6x'], placeholder: '写出缺失的因子' },
      { id: 'b2', label: '空 2', answers: ['cos(3x^2-1)'], placeholder: '写出保留的外层' },
    ],
    feedback: {
      correct: '非常好，下次遇到类似结构时就不会漏。',
      incorrect: '翻到错题本：老师已经在旁边写了“×6x”，照抄就好。',
    },
  },
  {
    id: 'fill-integral',
    order: 15,
    type: 'fillBlank',
    title: '换元填空',
    focus: '积分巩固',
    ragSource: '【来自 PPT 第 18 页】',
    personaHint: '【来自 PPT 第 18 页】',
    reason: '承接单选题的换元设定。',
    prompt: '换元 u = x^3 - x 后，∫ (3x^2-1)·e^{x^3 - x} dx = ∫ ________ du',
    blanks: [{ id: 'b3', label: '空 1', answers: ['e^u', 'e^{u}'], placeholder: '填 integrand' }],
    feedback: {
      correct: '换元完成，后续多选题会继续考察。',
      incorrect: '把 (3x^2-1) dx 直接看成 du，剩下的就是 e^{u}。',
    },
  },
  {
    id: 'fill-warning',
    order: 16,
    type: 'fillBlank',
    title: '识别错误征兆',
    focus: '错因提示',
    ragSource: '【来自错题本批注】',
    personaHint: '【你常错的部分】',
    reason: '错题批注提到两个“警告词”。',
    prompt: '在错题本第 5 题旁边，老师写了两个警告词：________、________。',
    blanks: [
      { id: 'b4', label: '空 1', answers: ['括号', '括号先'], placeholder: '提示 1' },
      { id: 'b5', label: '空 2', answers: ['草稿两行', '至少两行'], placeholder: '提示 2' },
    ],
    feedback: {
      correct: '记得把这两个词写在草稿纸顶端。',
      incorrect: '批注明确写了“括号先写完、草稿至少两行”。',
    },
  },
  {
    id: 'fill-predict',
    order: 17,
    type: 'fillBlank',
    title: '考前预测标签',
    focus: '考点预测',
    ragSource: '【来自预测汇总】',
    personaHint: '【来自 PPT 第 18 页】',
    reason: '预测文档写了两个高频标签。',
    prompt: '考前 24 小时的预测写着：“链式法则 → ________ + ________ 组合最常见”。',
    blanks: [
      { id: 'b6', label: '空 1', answers: ['ln'], placeholder: '函数类型' },
      { id: 'b7', label: '空 2', answers: ['复合函数', '复合'], placeholder: '结构特征' },
    ],
    feedback: {
      correct: '记住“ln + 复合函数”，考场就能先拿第一问。',
      incorrect: '预测文档第 2 行写着“ln + 复合函数配链式”。',
    },
  },
  {
    id: 'sa-micro-plan',
    order: 18,
    type: 'shortAnswer',
    title: '写出 25 分钟循环',
    focus: '节奏规划',
    ragSource: '【来自 Workspace 提示】',
    personaHint: '【{{personaPreference}}】',
    reason: 'Workspace 右侧已经推荐了“模板→错题→复述”的循环。',
    prompt: '用 2 句话写出你接下来 25 分钟的循环计划。',
    guide: '格式示例：① ___ ② ___ ③ ___',
    keywords: ['模板', '错题', '复述'],
    feedback: {
      correct: 'Nice！我会按照这个顺序在下一轮提示你。',
      partial: '再补上“模板 / 错题 / 复述”三个关键词就完美了。',
      incorrect: '试着沿用模板：第一句写模板，第二句写错题，最后一句写复述。',
    },
  },
  {
    id: 'sa-error-story',
    order: 19,
    type: 'shortAnswer',
    title: '把错因说成一句话',
    focus: '反思思路',
    ragSource: '【来自错题本批注】',
    personaHint: '【你常错的部分】',
    reason: '老师批注写着“请用一句话描述错误”。',
    prompt: '用一句话描述你在链式法则中最容易犯的错误，并附上解决动作。',
    guide: '示例：“我常常 ____ ，所以我会 ____”。',
    keywords: ['常常', '所以', '6x'],
    feedback: {
      correct: '保留这句话，下次遇到类似结构 AI 会复述给你听。',
      partial: '记得把“6x” 或 “补写因子”也写进去，才算真正解决。',
      incorrect: '照着批注句型写：“我常常…所以我要…”。',
    },
  },
  {
    id: 'sa-rag-trust',
    order: 20,
    type: 'shortAnswer',
    title: '说明你信任哪份资料',
    focus: 'RAG 透明度',
    ragSource: '【来自资料索引】',
    personaHint: '【来自 PPT 第 12 页】',
    reason: '确认你最信任哪份资料，好让后面的反馈引用它。',
    prompt: '写出你希望 AI 在判错时优先引用哪份资料，并说明原因。',
    guide: '示例：“优先引用 ___ ，因为 ___”。',
    keywords: ['PPT', '错题', '课堂'],
    feedback: {
      correct: '收到，后续反馈会优先引用你写的资料。',
      partial: '说说“为什么”更信任那份资料，AI 才能把语气对准。',
      incorrect: '举出一份资料 + 一个原因即可，例如“错题本，因为记录了我的真实错误”。',
    },
  },
];
interface ReviewSessionState {
  index: number;
  answers: Map<string, ReviewAnswerState>;
}

interface MatchingDraft {
  order: string[];
  connections: Array<{ left: string; right: string }>;
}

class ReviewLabExperience {
  private readonly questions = REVIEW_DECK;
  private readonly total = this.questions.length;
  private context: PersonalizationContext = createDefaultContext();
  private state: ReviewSessionState = { index: 0, answers: new Map() };
  private stageEl: HTMLElement | null = null;
  private timelineEl: HTMLElement | null = null;
  private progressValueEl: HTMLElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private heroTitleEl: HTMLElement | null = null;
  private transitionToken = 0;
  private drafts = {
    multi: new Map<string, Set<string>>(),
    fill: new Map<string, string[]>(),
    short: new Map<string, string>(),
  };
  private matchingDrafts = new Map<string, MatchingDraft>();

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.context = buildContext(snapshot.activeGoal);
    this.ensureLayout(regions);
    this.updateHero(snapshot.activeGoal);
    this.updateProgress();
    this.renderTimeline();
    this.renderQuestion();
  }

  private ensureLayout(regions: RenderRegions): void {
    const container = regions.content.querySelector<HTMLElement>('.review-lab');
    if (!container) {
      regions.content.innerHTML = this.buildLayout();
    }
    this.stageEl = regions.content.querySelector('[data-quiz-stage]');
    this.timelineEl = regions.content.querySelector('[data-question-timeline]');
    this.progressValueEl = regions.content.querySelector('[data-progress-value]');
    this.progressBarEl = regions.content.querySelector('[data-progress-bar]');
    this.heroTitleEl = regions.content.querySelector('[data-hero-title]');
  }

  private buildLayout(): string {
    return `
      <section class="review-lab">
        <header class="review-hero">
          <div>
            <p class="eyebrow">复习模式</p>
            <h1 data-hero-title></h1>
          </div>
          <div class="review-hero-panel">
            <div class="review-progress">
              <div class="review-progress-head">
                <span>完成度</span>
                <span data-progress-value>0/${this.total}</span>
              </div>
              <div class="review-progress-bar">
                <div data-progress-bar></div>
              </div>
            </div>
          </div>
        </header>
        <div class="review-body">
          <div class="quiz-stage" data-quiz-stage></div>
          <aside class="quiz-sidebar">
            <div class="quiz-sidebar-card">
              <h3>题目节奏</h3>
              <div class="question-timeline" data-question-timeline></div>
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  private updateHero(goal: StudyGoal | null): void {
    if (this.heroTitleEl) {
      this.heroTitleEl.textContent = goal ? `${goal.name} \u00b7 \u7ec3\u4e60\u5b9e\u9a8c` : '\u5f53\u524d\u76ee\u6807 \u00b7 \u7ec3\u4e60\u5b9e\u9a8c';
    }
    const deadline = this.heroTitleEl?.parentElement?.querySelector<HTMLElement>('[data-hero-deadline]');
    if (deadline) {
      deadline.textContent = this.context.deadlineDays;
    }
  }

  private updateProgress(): void {
    const answered = Array.from(this.state.answers.values()).filter((item) => item.status !== 'pending').length;
    const percent = Math.round((answered / this.total) * 100);
    if (this.progressValueEl) {
      this.progressValueEl.textContent = `${answered}/${this.total}`;
    }
    if (this.progressBarEl) {
      this.progressBarEl.style.setProperty('--quiz-progress', `${percent}%`);
    }
  }

  private renderTimeline(): void {
    if (!this.timelineEl) return;
    this.timelineEl.innerHTML = this.questions
      .map((question, index) => {
        const status = this.state.answers.get(question.id)?.status ?? 'pending';
        const active = index === this.state.index ? 'active' : '';
        return `
          <button
            type="button"
            class="timeline-dot ${status} ${active}"
            data-jump="${index}"
            aria-label="跳转到第 ${index + 1} 题"
          >
            <span>${index + 1}</span>
          </button>
        `;
      })
      .join('');
    this.timelineEl.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = Number(button.dataset.jump);
        this.goTo(target);
      });
    });
  }

  private goTo(index: number): void {
    if (index < 0 || index >= this.total) return;
    this.state.index = index;
    this.renderTimeline();
    this.renderQuestion();
  }

  private renderQuestion(): void {
    const stage = this.stageEl;
    const question = this.questions[this.state.index];
    if (!stage || !question) return;
    const token = ++this.transitionToken;
    stage.classList.add('is-transitioning');
    window.setTimeout(() => {
      if (token !== this.transitionToken) return;
      stage.innerHTML = this.composeQuestionCard(question);
      stage.classList.remove('is-transitioning');
      this.bindQuestionHandlers(question);
      this.updateFeedback(question);
      this.updateNavState(question);
    }, 200);
  }

  private composeQuestionCard(question: ReviewQuestion): string {
    return `
      <article class="quiz-card" data-question="${question.id}">
        <header class="quiz-card-head">
          <div>
            <p class="eyebrow">${question.focus}</p>
            <h2>${question.title}</h2>
          </div>
          <div class="quiz-card-tags">
            <span class="pill info">${personalize(question.ragSource, this.context)}</span>
            <span class="pill warning">${personalize(question.personaHint, this.context)}</span>
            <span class="pill ghost">${personalize(question.reason, this.context)}</span>
          </div>
        </header>
        <div class="quiz-interaction" data-interaction>
          ${this.renderInteraction(question)}
        </div>
        <div class="quiz-feedback" data-feedback-block hidden>
          <p class="label">AI 反馈</p>
          <div class="quiz-feedback-body" data-feedback-body></div>
        </div>
        <footer class="quiz-card-footer">
          <button class="btn ghost" data-nav="prev">上一题</button>
          <div class="quiz-card-progress">题目 ${question.order}/${this.total}</div>
          <button class="btn primary" data-nav="next">${this.state.index === this.total - 1 ? '回到开头' : '下一题'}</button>
        </footer>
      </article>
    `;
  }

  private renderRichText(raw: string | undefined): string {
    const content = personalize(raw, this.context).trim();
    if (!content) return '';
    return renderMarkdownContent(content, {
      emptyClassName: 'quiz-md-empty',
      emptyMessage: '',
    });
  }

  private renderInteraction(question: ReviewQuestion): string {
    const answer = this.state.answers.get(question.id);
    switch (question.type) {
      case 'flashcard': {
        const data = question as FlashcardQuestion;
        const front = this.renderRichText(data.front);
        const back = this.renderRichText(data.back);
        const highlight = this.renderRichText(data.highlight);
        const isFlipped = this.getFlashcardFlipState(answer);
        const focus = personalize(question.focus, this.context);
        const hintBubble = highlight
          ? `
            <div class="flashcard-hint-bubble" data-flashcard-hint aria-hidden="true">
              <span class="hint-label">AI 提示</span>
              <div class="hint-body quiz-md">${highlight}</div>
            </div>
          `
          : '';
        const hintButtonAttrs = highlight ? '' : ' disabled';
        return `
          <div class="flashcard-shell">
            <div class="flashcard ${isFlipped ? 'is-flipped' : ''}" data-flashcard>
              <div class="flashcard-face flashcard-front">
                <div class="flashcard-meta">
                  <span class="pill subtle">记忆卡片</span>
                  <span class="flashcard-focus">${focus}</span>
                </div>
                <div class="flashcard-content quiz-md">${front}</div>
              </div>
              <div class="flashcard-face flashcard-back">
                <div class="flashcard-meta">
                  <span class="pill subtle ghost">答案</span>
                  <span class="flashcard-focus">${focus}</span>
                </div>
                <div class="flashcard-content quiz-md">${back}</div>
              </div>
            </div>
            ${hintBubble}
            <div class="flashcard-actions">
              <button class="pill-btn" type="button" data-action="flip-card">翻转卡片</button>
              <button class="pill-btn ghost" type="button" data-action="toggle-hint"${hintButtonAttrs} aria-pressed="false">AI 提示</button>
              <button class="pill-btn ghost" type="button">收藏</button>
            </div>
          </div>
        `;
      }
      case 'singleChoice': {
        const data = question as SingleChoiceQuestion;
        const prompt = this.renderRichText(data.prompt);
        return `
          <div class="quiz-prompt quiz-md">${prompt}</div>
          <div class="quiz-options" data-option-list>
            ${data.options
              .map(
                (option) => {
                  const label = this.renderRichText(option.label);
                  const detail = option.detail ? `<div class="quiz-option-detail quiz-md">${this.renderRichText(option.detail)}</div>` : '';
                  return `
                    <button class="quiz-option" data-option="${option.id}" type="button">
                      <div class="quiz-option-label quiz-md">${label}</div>
                      ${detail}
                    </button>
                  `;
                }
              )
              .join('')}
          </div>
        `;
      }
      case 'multiSelect': {
        const data = question as MultiSelectQuestion;
        const draft = this.drafts.multi.get(question.id);
        const prompt = this.renderRichText(data.prompt);
        return `
          <div class="quiz-prompt quiz-md">${prompt}</div>
          <div class="quiz-options multi" data-option-list>
            ${data.options
              .map(
                (option) => {
                  const isSelected = draft?.has(option.id) ? 'is-selected' : '';
                  const label = this.renderRichText(option.label);
                  const detail = option.detail ? `<div class="quiz-option-detail quiz-md">${this.renderRichText(option.detail)}</div>` : '';
                  return `
                    <button class="quiz-option ${isSelected}" data-option="${option.id}" type="button">
                      <div class="quiz-option-label quiz-md">${label}</div>
                      ${detail}
                    </button>
                  `;
                }
              )
              .join('')}
          </div>
          <button class="btn slim" data-action="submit-multi">提交答案</button>
        `;
      }
      case 'matching': {
        const data = question as MatchingQuestion;
        const draft = this.ensureMatchingDraft(data);
        const rightColumn = draft.order
          .map((id) => data.pairs.find((pair) => pair.id === id))
          .filter(Boolean) as MatchingPair[];
        const prompt = this.renderRichText(data.prompt);
        return `
          <div class="quiz-prompt quiz-md">${prompt}</div>
          <div class="matching-board" data-matching-board>
            <div class="matching-column left">
              ${data.pairs
                .map((pair) => {
                  const helper = personalize(pair.helper, this.context);
                  return `
                    <button class="matching-chip" data-left="${pair.id}">
                      <div class="matching-chip-label quiz-md">${this.renderRichText(pair.left)}</div>
                      <small>${helper}</small>
                    </button>
                  `;
                })
                .join('')}
            </div>
            <div class="matching-column right">
              ${rightColumn
                .map((pair) => {
                  const helper = personalize(pair.helper, this.context);
                  return `
                    <button class="matching-chip" data-right="${pair.id}">
                      <div class="matching-chip-label quiz-md">${this.renderRichText(pair.right)}</div>
                      <small>${helper}</small>
                    </button>
                  `;
                })
                .join('')}
            </div>
            <svg class="matching-lines" data-matching-svg></svg>
          </div>
          <button class="pill-btn" data-action="clear-matching">清除连线</button>
        `;
      }
      case 'fillBlank': {
        const data = question as FillBlankQuestion;
        const draft = this.drafts.fill.get(question.id) ?? [];
        const prompt = this.renderRichText(data.prompt);
        return `
          <div class="quiz-prompt quiz-md">${prompt}</div>
          <div class="fill-grid">
            ${data.blanks
              .map((blank, index) => {
                const label = personalize(blank.label, this.context);
                const placeholder = personalize(blank.placeholder ?? '', this.context);
                return `
                  <label class="fill-field">
                    <span>${label}</span>
                    <input type="text" data-blank="${blank.id}" value="${draft[index] ?? ''}" placeholder="${placeholder}" />
                  </label>
                `;
              })
              .join('')}
          </div>
          <button class="btn slim" data-action="submit-fill">提交答案</button>
        `;
      }
      case 'shortAnswer': {
        const data = question as ShortAnswerQuestion;
        const draft = this.drafts.short.get(question.id) ?? '';
        const prompt = this.renderRichText(data.prompt);
        const guide = personalize(data.guide, this.context);
        return `
          <div class="quiz-prompt quiz-md">${prompt}</div>
          <textarea class="short-answer" data-short-answer placeholder="${guide}">${draft}</textarea>
          <button class="btn slim" data-action="submit-short">提交答案</button>
        `;
      }
      default:
        return '';
    }
  }
  private getFlashcardFlipState(answer: ReviewAnswerState | undefined): boolean {
    if (!answer) return false;
    const payload = answer?.response as { flipped?: boolean } | undefined;
    if (payload && typeof payload.flipped === 'boolean') {
      return payload.flipped;
    }
    return answer.status === 'revealed';
  }

  private commitFlashcardReveal(questionId: string, flipped: boolean): void {
    const previous = this.state.answers.get(questionId);
    this.state.answers.set(questionId, {
      status: 'revealed',
      response: { flipped },
      timestamp: previous?.timestamp ?? Date.now(),
    });
  }

  private bindQuestionHandlers(question: ReviewQuestion): void {
    const card = this.stageEl?.querySelector<HTMLElement>('[data-question]');
    if (!card) return;
    const next = card.querySelector<HTMLButtonElement>('[data-nav="next"]');
    const prev = card.querySelector<HTMLButtonElement>('[data-nav="prev"]');
    next?.addEventListener('click', () => this.goTo(this.state.index === this.total - 1 ? 0 : this.state.index + 1));
    prev?.addEventListener('click', () => this.goTo(this.state.index - 1));

    switch (question.type) {
      case 'flashcard':
        this.bindFlashcard(card, question as FlashcardQuestion);
        break;
      case 'singleChoice':
        this.bindSingleChoice(card, question as SingleChoiceQuestion);
        break;
      case 'multiSelect':
        this.bindMultiSelect(card, question as MultiSelectQuestion);
        break;
      case 'matching':
        this.bindMatching(card, question as MatchingQuestion);
        break;
      case 'fillBlank':
        this.bindFillBlank(card, question as FillBlankQuestion);
        break;
      case 'shortAnswer':
        this.bindShortAnswer(card, question as ShortAnswerQuestion);
        break;
      default:
        break;
    }
  }

  private bindFlashcard(card: HTMLElement, question: FlashcardQuestion): void {
    const flashcard = card.querySelector<HTMLElement>('[data-flashcard]');
    const flipButton = card.querySelector<HTMLButtonElement>('[data-action="flip-card"]');
    const hintButton = card.querySelector<HTMLButtonElement>('[data-action="toggle-hint"]');
    const hintBubble = card.querySelector<HTMLElement>('[data-flashcard-hint]');
    if (flashcard) {
      const initialState = this.getFlashcardFlipState(this.state.answers.get(question.id));
      flashcard.classList.toggle('is-flipped', initialState);
    }
    const handleFlip = (event?: Event) => {
      event?.preventDefault();
      if (!flashcard) return;
      const shouldFlip = !flashcard.classList.contains('is-flipped');
      flashcard.classList.toggle('is-flipped', shouldFlip);
      this.commitFlashcardReveal(question.id, shouldFlip);
      this.updateFeedback(question);
      this.updateNavState(question);
      this.updateProgress();
    };
    flashcard?.addEventListener('click', handleFlip);
    flipButton?.addEventListener('click', handleFlip);
    if (hintButton && hintBubble && !hintButton.disabled) {
      hintButton.addEventListener('click', (event) => {
        event.preventDefault();
        const nextState = !hintBubble.classList.contains('is-visible');
        hintBubble.classList.toggle('is-visible', nextState);
        hintBubble.setAttribute('aria-hidden', nextState ? 'false' : 'true');
        hintButton.setAttribute('aria-pressed', nextState ? 'true' : 'false');
        hintButton.classList.toggle('is-active', nextState);
      });
    }
  }

  private bindSingleChoice(card: HTMLElement, question: SingleChoiceQuestion): void {
    card.querySelectorAll<HTMLButtonElement>('[data-option]').forEach((option) => {
      option.addEventListener('click', () => {
        const choice = option.dataset.option ?? '';
        const isCorrect = choice === question.answer;
        this.state.answers.set(question.id, {
          status: isCorrect ? 'correct' : 'incorrect',
          response: choice,
          timestamp: Date.now(),
        });
        card.querySelectorAll<HTMLButtonElement>('[data-option]').forEach((candidate) => {
          const id = candidate.dataset.option;
          candidate.classList.toggle('is-correct', id === question.answer);
          candidate.classList.toggle('is-incorrect', id === choice && !isCorrect);
        });
        this.updateFeedback(question);
        this.updateNavState(question);
        this.updateProgress();
      });
    });
  }

  private bindMultiSelect(card: HTMLElement, question: MultiSelectQuestion): void {
    let draft = this.drafts.multi.get(question.id);
    if (!draft) {
      draft = new Set();
      this.drafts.multi.set(question.id, draft);
    }
    card.querySelectorAll<HTMLButtonElement>('[data-option]').forEach((option) => {
      option.addEventListener('click', () => {
        const id = option.dataset.option ?? '';
        if (!id) return;
        if (draft!.has(id)) {
          draft!.delete(id);
          option.classList.remove('is-selected');
        } else {
          draft!.add(id);
          option.classList.add('is-selected');
        }
      });
    });
    card.querySelector<HTMLButtonElement>('[data-action="submit-multi"]')?.addEventListener('click', () => {
      if (!draft || draft.size === 0) return;
      const selection = Array.from(draft.values());
      const expected = new Set(question.answers);
      const correct = selection.length === expected.size && selection.every((value) => expected.has(value));
      this.state.answers.set(question.id, {
        status: correct ? 'correct' : 'incorrect',
        response: selection,
        timestamp: Date.now(),
      });
        this.updateFeedback(question);
      this.updateNavState(question);
      this.updateProgress();
    });
  }

  private ensureMatchingDraft(question: MatchingQuestion): MatchingDraft {
    const existing = this.matchingDrafts.get(question.id);
    if (existing) return existing;
    const order = [...question.pairs]
      .map((pair) => pair.id)
      .sort(() => (Math.random() > 0.5 ? 1 : -1));
    const draft: MatchingDraft = { order, connections: [] };
    this.matchingDrafts.set(question.id, draft);
    return draft;
  }

  private bindMatching(card: HTMLElement, question: MatchingQuestion): void {
    const board = card.querySelector<HTMLElement>('[data-matching-board]');
    const svg = card.querySelector<SVGSVGElement>('[data-matching-svg]');
    if (!board || !svg) return;
    const draft = this.ensureMatchingDraft(question);
    svg.innerHTML = '';
    draft.connections = [];
    let activeLeft: HTMLElement | null = null;
    let tempLine: SVGLineElement | null = null;

    const move = (event: PointerEvent) => {
      if (!tempLine) return;
      const rect = svg.getBoundingClientRect();
      tempLine.setAttribute('x2', `${event.clientX - rect.left}`);
      tempLine.setAttribute('y2', `${event.clientY - rect.top}`);
    };

    const reset = () => {
      board.querySelectorAll('.matching-chip').forEach((chip) => chip.classList.remove('armed'));
      if (tempLine) {
        tempLine.remove();
        tempLine = null;
      }
      activeLeft = null;
      board.removeEventListener('pointermove', move);
    };

    const createLine = (x: number, y: number): SVGLineElement => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', `${x}`);
      line.setAttribute('y1', `${y}`);
      line.setAttribute('x2', `${x}`);
      line.setAttribute('y2', `${y}`);
      line.classList.add('matching-line');
      svg.appendChild(line);
      return line;
    };

    board.querySelectorAll<HTMLElement>('[data-left]').forEach((chip) => {
      chip.addEventListener('click', () => {
        reset();
        activeLeft = chip;
        chip.classList.add('armed');
        const rectBoard = svg.getBoundingClientRect();
        const rect = chip.getBoundingClientRect();
        tempLine = createLine(rect.right - rectBoard.left, rect.top - rectBoard.top + rect.height / 2);
        board.addEventListener('pointermove', move);
      });
    });

    board.querySelectorAll<HTMLElement>('[data-right]').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (!activeLeft || !tempLine) return;
        const rectBoard = svg.getBoundingClientRect();
        const rect = chip.getBoundingClientRect();
        tempLine.setAttribute('x2', `${rect.left - rectBoard.left}`);
        tempLine.setAttribute('y2', `${rect.top - rectBoard.top + rect.height / 2}`);
        tempLine.classList.add('solid');
        draft.connections.push({ left: activeLeft.dataset.left ?? '', right: chip.dataset.right ?? '' });
        tempLine = null;
        activeLeft = null;
        board.removeEventListener('pointermove', move);
        board.querySelectorAll('.matching-chip').forEach((node) => node.classList.remove('armed'));
        if (draft.connections.length === question.pairs.length) {
          const correct = draft.connections.every((pair) =>
            question.pairs.some((target) => target.id === pair.left && target.id === pair.right)
          );
          this.state.answers.set(question.id, {
            status: correct ? 'correct' : 'incorrect',
            response: draft.connections.slice(),
            timestamp: Date.now(),
          });
          this.updateFeedback(question);
          this.updateNavState(question);
          this.updateProgress();
        }
      });
    });

    card.querySelector<HTMLButtonElement>('[data-action="clear-matching"]')?.addEventListener('click', () => {
      svg.innerHTML = '';
      draft.connections = [];
      reset();
      this.state.answers.delete(question.id);
      this.updateFeedback(question);
      this.updateNavState(question);
      this.updateProgress();
    });
  }

  private bindFillBlank(card: HTMLElement, question: FillBlankQuestion): void {
    const inputs = card.querySelectorAll<HTMLInputElement>('[data-blank]');
    card.querySelector<HTMLButtonElement>('[data-action="submit-fill"]')?.addEventListener('click', () => {
      const values = Array.from(inputs).map((input) => input.value.trim());
      this.drafts.fill.set(question.id, values);
      const correct = question.blanks.every((blank, index) => {
        const normalized = values[index]?.replace(/\s+/g, '').toLowerCase();
        return (
          normalized &&
          blank.answers.some((candidate) => candidate.replace(/\s+/g, '').toLowerCase() === normalized)
        );
      });
      this.state.answers.set(question.id, {
        status: correct ? 'correct' : 'incorrect',
        response: values,
        timestamp: Date.now(),
      });
      this.updateFeedback(question);
      this.updateNavState(question);
      this.updateProgress();
    });
  }

  private bindShortAnswer(card: HTMLElement, question: ShortAnswerQuestion): void {
    const textarea = card.querySelector<HTMLTextAreaElement>('[data-short-answer]');
    card.querySelector<HTMLButtonElement>('[data-action="submit-short"]')?.addEventListener('click', () => {
      const value = textarea?.value.trim();
      if (!value) return;
      this.drafts.short.set(question.id, value);
      const normalized = value.replace(/\s+/g, '');
      const hits = question.keywords.filter((keyword) => normalized.includes(keyword));
      let status: ReviewAnswerState['status'] = 'partial';
      if (hits.length === question.keywords.length) {
        status = 'correct';
      } else if (hits.length === 0) {
        status = 'incorrect';
      }
      this.state.answers.set(question.id, {
        status,
        response: value,
        timestamp: Date.now(),
      });
      this.updateFeedback(question);
      const feedbackBlock = card.querySelector<HTMLElement>('[data-feedback-block]');
      feedbackBlock?.classList.add('feedback-bounce');
      window.setTimeout(() => {
        feedbackBlock?.classList.remove('feedback-bounce');
      }, 600);
      this.updateNavState(question);
      this.updateProgress();
    });
  }

  private updateFeedback(question: ReviewQuestion): void {
    const feedbackNode = this.stageEl?.querySelector<HTMLElement>('[data-feedback-block]');
    const feedbackBody = feedbackNode?.querySelector<HTMLElement>('[data-feedback-body]');
    if (!feedbackNode || !feedbackBody) return;
    const answer = this.state.answers.get(question.id);
    if (!answer) {
      feedbackBody.textContent = '';
      feedbackNode.setAttribute('hidden', 'true');
      feedbackNode.classList.remove('feedback-bounce', 'feedback-enter', 'is-visible');
      return;
    }
    const text = personalize(this.pickFeedbackText(question.feedback, answer.status), this.context);
    feedbackBody.textContent = text;
    feedbackNode.removeAttribute('hidden');
    feedbackNode.classList.add('is-visible');
    feedbackNode.classList.remove('feedback-enter');
    void feedbackNode.offsetWidth;
    feedbackNode.classList.add('feedback-enter');
  }

  private pickFeedbackText(
    feedback: ReviewQuestionFeedback,
    status: ReviewAnswerState['status'] | undefined
  ): string {
    if (!status || status === 'pending') {
      return feedback.neutral ?? '';
    }
    if (status === 'correct') {
      return feedback.correct ?? '好样的，继续保持节奏。';
    }
    if (status === 'partial') {
      return feedback.partial ?? feedback.incorrect ?? '还差一点点，照着提示再完善。';
    }
    if (status === 'revealed') {
      return feedback.neutral ?? '记住卡片上的顺序就好。';
    }
    return feedback.incorrect ?? '再对照资料看一次，我已经帮你高亮错因。';
  }

  private updateNavState(question: ReviewQuestion): void {
    const card = this.stageEl?.querySelector<HTMLElement>('[data-question]');
    if (!card) return;
    const next = card.querySelector<HTMLButtonElement>('[data-nav="next"]');
    const prev = card.querySelector<HTMLButtonElement>('[data-nav="prev"]');
    const answer = this.state.answers.get(question.id);
    const allowNext =
      answer &&
      answer.status !== 'pending' &&
      (question.type !== 'flashcard' || answer.status === 'revealed');
    if (next) {
      next.disabled = !allowNext;
      next.textContent = this.state.index === this.total - 1 ? '回到开头' : '下一题';
    }
    if (prev) {
      prev.disabled = this.state.index === 0;
    }
  }
}

export class ReviewLabModule implements UiModule {
  public readonly page: Page = 'reviewLab';
  private readonly experience = new ReviewLabExperience();

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.experience.render(snapshot, regions);
  }
}
