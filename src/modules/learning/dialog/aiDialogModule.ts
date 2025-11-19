import { Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { RenderRegions, UiModule } from '../../types';

type AiDialogRole = 'student' | 'ai';

interface AiDialogMessage {
  role: AiDialogRole;
  content: string;
  sources?: string[];
  thinking?: string;
}

interface AiDialogRecord {
  id: string;
  title: string;
  tags: string[];
  persona: string;
  brief: string;
  messages: AiDialogMessage[];
}

const AI_DIALOG_RECORDS: ReadonlyArray<AiDialogRecord> = [
  {
    id: 'chain-rule',
    title: '我看不懂链式法则',
    tags: ['【剩4小时】', '【基础薄弱】', '【目标：80 分】'],
    persona: '复读理工生 · 微积分目标 80 · 喜欢拆步骤',
    brief: '冲刺链式法则却老是漏乘内函数，心态快崩了。',
    messages: [
      {
        role: 'student',
        content: '小墨，我链式法则还是不懂，f(g(x)) 那层总是算乱。',
      },
      {
        role: 'ai',
        thinking: '检索《微积分讲义》的标注……',
        content: `我在《微积分讲义》第 12 页看到你标注的原句：「d/dx f(g(x)) = f'(g(x)) · g'(x)」，我们就照它拆。先把外函数 f(u)=sin u 求导得到 cos u，再把 u=g(x)=3x^2-1 代回，最后乘以内函数的导数 6x。按这个顺序打一遍草稿，顺手把三个步骤写成三行，手会稳很多。`,
        sources: ['来源｜来自你上传的《微积分讲义》第 12 页', '来源｜链式法则例题 PDF · 例 2'],
      },
      {
        role: 'student',
        content: '我笔记里写了“外导数+内导数”，但写出来还是错。',
      },
      {
        role: 'ai',
        thinking: '核对课堂笔记的手写错误……',
        content: `你 10.03 课堂笔记里把“+”圈成了“乘以后写内导数”，但真正应是乘号。等式下方你抄的例题少乘了 g'(x)，所以答案才差一个 6x。我在笔记旁标了红框，直接改成「cos(g(x)) × g'(x)」就不会漏。`,
        sources: ['来源｜课堂笔记 2024-10-03（链式法则）'],
      },
      {
        role: 'student',
        content: '错题本第 3 题我又写成了 x^3，你能帮我对一下吗？',
      },
      {
        role: 'ai',
        thinking: '对照错题本记录……',
        content: `错题本·导数篇第 3 题的标准答案把分母写成 (x^3+1)^2，而你还停留在 x^3。其实它是 (x^3+1)^{-1} 的链式法则应用，我把这题和你当前练习并排放，帮你框出“内函数 = x^3+1”的位置，照着把平方保留下来。`,
        sources: ['来源｜错题本·导数篇（第 3 题）', '来源｜错题批注截图（2024-11-02）'],
      },
      {
        role: 'student',
        content: '明天会不会考链式法则大题？我怕押不中。',
      },
      {
        role: 'ai',
        thinking: '交叉比对冲刺讲义与真题……',
        content: `我比对了《冲刺讲义 Vol.5》第 8 页和 2023 真题解析 PPT（slide 17），两个资料都在链式法则后立即安排“复合函数 + ln”的填空题。近 5 年考点统计显示链式法则 80% 出现在填空或大题第一问，而且常和 ln 或 e^x 绑定，所以明天很可能考「ln(1+g(x))」这种结构。把示例 2 里的写法直接套进 ln 版本，你就能在考场把第一问抢下。`,
        sources: [
          '来源｜冲刺讲义 Vol.5 第 8 页',
          '来源｜2023 真题解析 PPT · Slide 17',
          '来源｜考前预测 · 近 5 年考点统计',
        ],
      },
      {
        role: 'student',
        content: '我 4 小时要上考场了，能给我一个顺序吗？',
      },
      {
        role: 'ai',
        thinking: '重排最后 4 小时的学习路径……',
        content: `根据你学习画像里勾的「基础薄弱」「喜欢拆步骤」，我把路径重排成 3 个 20 分钟循环：
1. 讲义模板抄一遍，框出外函数/内函数。
2. 做错题本 3、7、9 号题，只要写错的行，旁边标注漏掉的因子。
3. 回到 10.03 课堂笔记，把「+」全部改成「×」，并在 Workspace 自动生成校正版。
我已经加了倒计时提示，完成 3 轮就能覆盖 18 道题。`,
        sources: [
          '来源｜学习画像 2024-11-12',
          '来源｜错题本·导数篇（题号 3/7/9）',
          '来源｜课堂笔记 2024-10-03',
        ],
      },
    ],
  },
  {
    id: 'countdown-review',
    title: '剩 4 小时怎么复习？',
    tags: ['【剩4小时】', '【目标：及格线】', '【偏科：概率】'],
    persona: '跨考工管生 · 白天实习 · 喜欢清单式任务',
    brief: '概率统计最后 4 小时抱佛脚，条件概率还在混淆。',
    messages: [
      {
        role: 'student',
        content: '我等会儿就去考概率了，只剩 4 小时，条件概率还乱。',
      },
      {
        role: 'ai',
        thinking: '定位《概率统计临考速览》的高亮……',
        content: `我打开你高亮的《概率统计临考速览》第 5 页，原句写着：「P(A|B)=P(A∩B)/P(B)」。再结合你速记卡片里的“机器 A 抽中次品”那个例子，第一步列交集 0.12，第二步除以 P(B)=0.3，第三步整理。等下遇到题就照这三步，不要一上来就算数字。`,
        sources: ['来源｜《概率统计临考速览》P5 高亮区', '来源｜条件概率速记卡片 · 机器检验例'],
      },
      {
        role: 'student',
        content: '我 9.28 课堂笔记写了 P(B|A) 互换，好像记错了。',
      },
      {
        role: 'ai',
        thinking: '对照 9.28 的手写笔记……',
        content: `9.28 的课堂笔记里你把箭头画成 A→B，导致代公式时下意识把条件倒过来。我用红笔在那一页写了“已知：B，求：A”，并补了一行“先写已知事件”。截图已经贴到 Workspace 右栏，做题前瞄一眼，就不会再互换。`,
        sources: ['来源｜课堂笔记 2024-09-28（条件概率）'],
      },
      {
        role: 'student',
        content: '错题本条件概率第 2 题还是算成 1.2。',
      },
      {
        role: 'ai',
        thinking: '复盘错题本的树状图……',
        content: `错题本·条件概率第 2 题你在树状图最后一层忘了乘 0.4，所以概率和超过 1。我把树状图三层节点补完，并在节点旁写了“概率守恒=1”。同样的错误在第 5 题也出现，等下做题先把两个节点补齐再算。`,
        sources: ['来源｜错题本·条件概率（第 2/5 题）'],
      },
      {
        role: 'student',
        content: '今年卷子会考什么？',
      },
      {
        role: 'ai',
        thinking: '比对模考卷与真题趋势……',
        content: `我把《模考卷 B》第 19 题和 2022 真题压轴并排，两个都考“贝叶斯 + 树状图 + 医疗筛查”。近五年数据也显示考前 24 小时最爱出“假阳性”场景。预测：今年大概率还是三段筛查，且给出两个条件概率，请准备把树画成三层并写出两次贝叶斯公式。`,
        sources: [
          '来源｜模考卷 B（第 19 题）',
          '来源｜2022 真题卷（概率统计第 4 题）',
          '来源｜考前预测 · 五年考点分布',
        ],
      },
      {
        role: 'student',
        content: '那 4 小时我怎么安排？',
      },
      {
        role: 'ai',
        thinking: '重排 4 小时 checklist……',
        content: `你在学习画像里勾了「喜欢 checklist」「晚上效率高」，所以我把 4 小时拆成 3 轮 75 分钟 + 15 分钟复盘：
- 30 分钟：速览 P5-P8 公式，跟着我标的顺序抄一遍；
- 30 分钟：做错题本 2、5、9 题，只写“列式 + 第一行运算”；
- 15 分钟：做模考卷 B 第 19 题，画完整树状图；
- 15 分钟：复盘并把正确公式写回速记卡片。
这个顺序已经同步到倒计时提醒里。`,
        sources: ['来源｜学习画像 2024-11-10', '来源｜错题本·条件概率', '来源｜模考卷 B（第 19 题）'],
      },
    ],
  },
  {
    id: 'reading-lock',
    title: '阅读理解总是卡住选项',
    tags: ['【偏科：英语】', '【剩2天】', '【目标：105】'],
    persona: '英语六级考生 · 喜欢例子 · 词汇够但判断慢',
    brief: 'AI 医疗阅读篇的主旨抓不稳，常在选项间摇摆。',
    messages: [
      {
        role: 'student',
        content: '阅读那篇 AI 医疗的文章我还是看不出来主旨，选项都像。',
      },
      {
        role: 'ai',
        thinking: '定位阅读原文的高亮句……',
        content: `在《六级阅读真题手册》第 41 页你标了那句 “AI systems assist doctors rather than replace them.”，这就是作者真正的立场。把这句话抄到题干旁，然后优先找包含“assist/augment”语义的选项，立刻能排除“取代医生”的干扰项。`,
        sources: ['来源｜六级阅读真题手册 P41', '来源｜课堂笔记 2024-11-18（AI 医疗篇）'],
      },
      {
        role: 'student',
        content: '我课堂笔记写了“转折词后是真观点”，可第二段还是选错。',
      },
      {
        role: 'ai',
        thinking: '回看 11.18 的结构笔记……',
        content: `11.18 笔记里你把 however 后的非限定从句划成“补充信息”，其实那一句才是作者强调的“需要监管”。我在那行笔记加了提醒：“转折词 + 非限定从句也要读完”，并同步到阅读 checklist。`,
        sources: ['来源｜课堂笔记 2024-11-18（阅读技巧）'],
      },
      {
        role: 'student',
        content: '错题本阅读第 11 篇我还是被选项 B 的“完全替代”骗了。',
      },
      {
        role: 'ai',
        thinking: '同步错题本与注释的同义词……',
        content: `错题本阅读篇第 11 篇里你写了“B 说 replace，原文说 assist”，却因为词形不同没排除。我把真题手册 P41 注释里的“assist = help = support”贴到错题本对应段落，并打上橙色「词义统一」标签，下次做题看到同色提示就能联想起来。`,
        sources: ['来源｜错题本·阅读篇（第 11 篇）', '来源｜六级阅读真题手册 P41 注释'],
      },
      {
        role: 'student',
        content: '今年阅读会考什么话题？',
      },
      {
        role: 'ai',
        thinking: '交叉检索预测卷与剑桥真题……',
        content: `我对照《2024 预测卷》第 2 套与《Cambridge 16》Test 3，两份资料都把“AI 医疗 + 伦理”排进第三篇，且问法集中在“作者态度 + 举例题”。根据近三年真题，第三篇 70% 出科技伦理，所以预测今年仍强调“辅助而非取代”。做题时把“态度=找态度词”写在草稿顶端。`,
        sources: [
          '来源｜2024 预测卷（阅读套 2）',
          '来源｜Cambridge 16 Test 3',
          '来源｜历年真题统计 · 阅读话题',
        ],
      },
      {
        role: 'student',
        content: '能给我一个阅读练习路径吗？我喜欢举例的那种。',
      },
      {
        role: 'ai',
        thinking: '按学习画像重排 25 分钟循环……',
        content: `你的学习画像写了「喜欢例子驱动」「一次最多 25 分钟」，所以我把路径调成「例子→题→反思」：
1. 10 分钟：复盘 P41 段落，把“assist vs replace”例子抄在卡片。
2. 10 分钟：错题本第 11、12 篇各做前两题，写下定位句。
3. 5 分钟：把今天定位到的句子贴到 Workspace 的“引用资料”列，备注来源。
循环两轮就能覆盖 4 篇文章。`,
        sources: [
          '来源｜学习画像 2024-11-05',
          '来源｜错题本·阅读篇（第 11/12 篇）',
          '来源｜六级阅读真题手册 P41',
        ],
      },
    ],
  },
  {
    id: 'linear-proof',
    title: '线代证明题太慢',
    tags: ['【目标：90】', '【卡点：线代】', '【剩6天】'],
    persona: '数分转专业生 · 喜欢推导 · 写作细致但慢',
    brief: '线性代数证明题抓不到骨架，总担心写不完。',
    messages: [
      {
        role: 'student',
        content: '线代证明题写太慢，尤其是向量空间那题，写到一半就忘了条件。',
      },
      {
        role: 'ai',
        thinking: '抓取《线代强化讲义》的原句……',
        content: `在《线代强化讲义》第 42 页你标了命题：「若子空间 U,V 维数相加大于 n，则 U∩V ≠ {0}」。证明第一行应该直接写出这个条件。我把原句贴在题目上方，并在模板里加了“先写条件”提示，你照着抄就不会丢信息。`,
        sources: ['来源｜线代强化讲义 P42', '来源｜课堂投影片 2024-10-21（向量空间）'],
      },
      {
        role: 'student',
        content: '我课堂笔记把维数公式写成 dim(U∪V) 了，是不是错了？',
      },
      {
        role: 'ai',
        thinking: '修正文档里的笔记……',
        content: `10.21 的课堂笔记里你确实把“交”写成“并”，导致整页都引用了 dim(U∪V)。我已经在 Workspace 的同一条笔记上替换为 dim U + dim V = dim(U+V) + dim(U∩V)，并在旁边写“∪→+”。抄回纸质本时记得连同公式一起改。`,
        sources: ['来源｜课堂笔记 2024-10-21（向量空间）'],
      },
      {
        role: 'student',
        content: '错题本向量空间第 6 题我老是忘记写“非零向量”。',
      },
      {
        role: 'ai',
        thinking: '调出错题本和批注……',
        content: `错题本第 6 题的判定里你漏写“存在非零向量 w ∈ U∩V”。我把老师在 10-30 留的批注贴上，并把“取 w∈U∩V, w≠0”复制进证明模板的第一行。以后写类似题就直接粘贴，不会漏前提。`,
        sources: ['来源｜错题本·向量空间（第 6 题）', '来源｜错题批注 2024-10-30'],
      },
      {
        role: 'student',
        content: '学校讲义和历年卷顺序不一样，我怕记混。',
      },
      {
        role: 'ai',
        thinking: '比对多份课件的一致性……',
        content: `我把《学校讲义》第 7 讲和 2021 校内卷第 2 题放在同一张对照表：两者都先写“设 w ∈ U∩V”，再写维数公式。我用相同颜色标出对应句，说明其实逻辑是一致的。预测：今年依旧先考“写出 w”再谈维数，所以抓住这两句就能拿时间。`,
        sources: [
          '来源｜学校讲义·线代第 7 讲',
          '来源｜2021 校内卷（线代第 2 题）',
          '来源｜多份课件一致性对照表',
        ],
      },
      {
        role: 'student',
        content: '能给我一个写证明的顺序吗？我怕写不完。',
      },
      {
        role: 'ai',
        thinking: '按画像调节节奏……',
        content: `你在学习画像里写了“喜欢模板”“怕写不完”，所以我把路线做成「模板-错题-真题」各 15 分钟：
1. 模板：抄 P42 的证明骨架，只写框架句。
2. 错题：重写第 6 题，但要求 120 秒内写完开头两行。
3. 真题：照 2021 校内卷第 2 题写，练习“框架 + 关键句”组合。
系统已经把顺序同步到 Workspace 的侧边计划，计时提醒帮你控制速度。`,
        sources: [
          '来源｜学习画像 2024-11-08',
          '来源｜线代强化讲义 P42',
          '来源｜错题本·向量空间（第 6 题）',
          '来源｜2021 校内卷（线代第 2 题）',
        ],
      },
    ],
  },
  {
    id: 'lab-design',
    title: '实验设计题不会搭建',
    tags: ['【剩3天】', '【实验设计】', '【目标：85】'],
    persona: '物理二战生 · 擅长计算 · 害怕实验描述',
    brief: '实验搭建步骤写不全，常被扣规范分。',
    messages: [
      {
        role: 'student',
        content: '物理实验设计题我还是不会搭建，写不到考官要的细节。',
      },
      {
        role: 'ai',
        thinking: '引用实验攻略里的模板……',
        content: `你上传的《物理实验攻略》第 28 页写着“用传感器记录小车位移，取三次平均”。把这段原文抄成三行：器材、操作、记录。再对照 11.01 的课堂笔记“倾角测重力”，其实流程一致——写出“多次测量并平均”就能拿满规范分。`,
        sources: ['来源｜物理实验攻略 P28', '来源｜课堂笔记 2024-11-01（倾角实验）'],
      },
      {
        role: 'student',
        content: '我笔记里把“激光测距”写成“激光指示”，老师说扣分。',
      },
      {
        role: 'ai',
        thinking: '同步笔记与资料的术语……',
        content: `11.01 的课堂笔记确实写成“激光指示”，而资料要求写“激光测距仪”。我已经把 Workspace 中对应段落改成“激光测距仪（精度 1 mm）”，并在旁写上“器材需带精度”。抄回纸质笔记就不会再扣术语分。`,
        sources: ['来源｜课堂笔记 2024-11-01', '来源｜物理实验攻略 P28'],
      },
      {
        role: 'student',
        content: '错题本实验第 3 题我总忘记写“控制变量”。',
      },
      {
        role: 'ai',
        thinking: '复用错题批注的提醒……',
        content: `错题本实验篇第 3 题里“控制变量”一栏空着，老师批注“扣 2 分”。我把批注截图贴进模板，并把“控制变量：倾角不变、起点相同”写进预设文本。以后看到空格就会主动补。`,
        sources: ['来源｜错题本·实验篇（第 3 题）', '来源｜老师批注截图 2024-10-25'],
      },
      {
        role: 'student',
        content: '多份课件里写法不一样，我到底跟哪个？',
      },
      {
        role: 'ai',
        thinking: '汇总课件共识并做考前预测……',
        content: `我对照《校本讲义》第 6 讲和《实验指导 PPT》第 3 章，两份资料虽然举例不同，但共识是：① 器材列出规格；② 操作写“多次测量”；③ 数据注明平均值。我把三条共识写在侧边提示卡，也顺便写入考前预测：近三年 70% 在实验题问“误差来源”，所以最后补一句“比较理论值并指出误差”就稳。`,
        sources: [
          '来源｜校本讲义·实验第 6 讲',
          '来源｜实验指导 PPT 第 3 章',
          '来源｜考前预测 · 实验题趋势',
        ],
      },
      {
        role: 'student',
        content: '能帮我排个练习路径吗？我只剩 3 天。',
      },
      {
        role: 'ai',
        thinking: '依据画像排 3 天循环……',
        content: `学习画像里写着“擅长计算、怕写描述”，所以我把 3 天各安排一个「搭建-描述-检查」循环：
- Day1 晚：照 P28 模板写“器材+操作”，10 分钟一题；
- Day2 早：错题本第 3、4 题集中补“控制变量”；
- Day3 晚：做 2023 模拟卷实验题，只写文字，不算数值；
路线已经同步到 Workspace，并在错题本里插入「检查：器材/操作/数据/误差」清单，确保你每次写满四项。`,
        sources: [
          '来源｜学习画像 2024-11-03',
          '来源｜物理实验攻略 P28',
          '来源｜错题本·实验篇（第 3/4 题）',
          '来源｜2023 模拟卷·实验题',
        ],
      },
    ],
  },
];

class AiDialogView {
  private readonly records = AI_DIALOG_RECORDS;
  private activeRecordId: string | null = this.records[0]?.id ?? null;
  private listHost: HTMLElement | null = null;
  private messageHost: HTMLElement | null = null;
  private thinkingHost: HTMLElement | null = null;
  private thinkingHint: HTMLElement | null = null;
  private metaHost: HTMLElement | null = null;
  private playbackTimers: number[] = [];
  private playbackIntervals: number[] = [];
  private playbackToken = 0;

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.cancelPlayback();
    regions.content.innerHTML = this.renderLayout(snapshot);
    this.listHost = regions.content.querySelector<HTMLElement>('[data-dialog-list]');
    this.messageHost = regions.content.querySelector<HTMLElement>('[data-dialog-messages]');
    this.thinkingHost = regions.content.querySelector<HTMLElement>('[data-thinking]');
    this.thinkingHint = regions.content.querySelector<HTMLElement>('[data-thinking-hint]');
    this.metaHost = regions.content.querySelector<HTMLElement>('[data-record-meta]');
    this.renderRecordList();
    this.bindListClicks();
    const initialId = this.activeRecordId ?? this.records[0]?.id ?? null;
    if (initialId) {
      this.selectRecord(initialId);
    }
  }

  private renderLayout(snapshot: ViewSnapshot): string {
    const activeGoal = snapshot.activeGoal;
    const heroLabel = activeGoal
      ? `${activeGoal.name} · ${activeGoal.profile.subjectLabel}`
      : '示例目标：微积分冲刺';
    const heroSummary = activeGoal
      ? `连接资料 ${activeGoal.connectedKnowledgeVaults.length} 份 · 剩余 ${activeGoal.progress.remainingDays} 天`
      : '演示数据 · 引用上传资料 / 笔记 / 错题 / 画像';
    return `
      <section class="ai-dialog">
        <aside class="ai-dialog-list-panel">
          <header>
            <p class="eyebrow">历史对话</p>
            <h2>AI 对话</h2>
            <p class="microcopy">点击任意对话即可回放“个性化 + RAG 爆点”</p>
          </header>
          <div class="ai-dialog-list" data-dialog-list></div>
        </aside>
        <section class="ai-dialog-stage">
          <div class="ai-dialog-player-head">
            <div>
              <p class="eyebrow">${heroLabel}</p>
              <h2>小墨 · AI 对话实验室</h2>
              <p class="microcopy">${heroSummary}</p>
            </div>
            <div class="ai-dialog-thinking" data-thinking hidden>
              <div>
                <span class="label">AI 正在思考</span>
                <span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>
              </div>
              <p class="microcopy" data-thinking-hint></p>
            </div>
          </div>
          <div class="ai-dialog-meta" data-record-meta></div>
          <div class="ai-dialog-messages" data-dialog-messages role="log" aria-live="polite"></div>
        </section>
      </section>
    `;
  }

  private renderRecordList(): void {
    if (!this.listHost) return;
    if (!this.records.length) {
      this.listHost.innerHTML = `<p class="microcopy">暂无对话，稍后再试。</p>`;
      return;
    }
    this.listHost.innerHTML = this.records
      .map(
        (record) => `
          <button class="ai-dialog-record ${record.id === this.activeRecordId ? 'is-active' : ''}" type="button" data-record-id="${record.id}">
            <div class="ai-dialog-record-title">
              <strong>${record.title}</strong>
              <p class="microcopy">${record.brief}</p>
            </div>
            <div class="ai-dialog-tags">
              ${record.tags.map((tag) => `<span>${tag}</span>`).join('')}
            </div>
            <p class="ai-dialog-record-persona">${record.persona}</p>
          </button>`
      )
      .join('');
  }

  private bindListClicks(): void {
    this.listHost?.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-record-id]');
      if (!target) return;
      const recordId = target.getAttribute('data-record-id');
      if (recordId) {
        this.selectRecord(recordId);
      }
    });
  }

  private selectRecord(recordId: string): void {
    const record = this.records.find((item) => item.id === recordId) ?? this.records[0];
    if (!record) return;
    this.activeRecordId = record.id;
    this.highlightActiveRecord();
    this.renderActiveMeta(record);
    this.playConversation(record);
  }

  private highlightActiveRecord(): void {
    if (!this.listHost) return;
    this.listHost
      .querySelectorAll<HTMLElement>('[data-record-id]')
      .forEach((element) => element.classList.toggle('is-active', element.getAttribute('data-record-id') === this.activeRecordId));
  }

  private renderActiveMeta(record: AiDialogRecord): void {
    if (!this.metaHost) return;
    this.metaHost.innerHTML = `
      <div class="ai-dialog-meta-title">
        <span class="badge">正在播放</span>
        <h3>${record.title}</h3>
      </div>
      <p class="microcopy">${record.brief}</p>
      <p class="microcopy">${record.persona}</p>
      <div class="ai-dialog-tags compact">
        ${record.tags.map((tag) => `<span>${tag}</span>`).join('')}
      </div>
    `;
  }

  private playConversation(record: AiDialogRecord): void {
    this.cancelPlayback();
    if (!this.messageHost) return;
    this.messageHost.innerHTML = '';
    if (!record.messages.length) return;
    this.playbackToken += 1;
    const token = this.playbackToken;
    const queue = [...record.messages];
    const step = (): void => {
      if (token !== this.playbackToken) {
        return;
      }
      const next = queue.shift();
      if (!next) {
        this.hideThinking();
        return;
      }
      if (next.role === 'student') {
        this.appendMessage(next);
        const timer = window.setTimeout(step, 400);
        this.playbackTimers.push(timer);
        return;
      }
      this.showThinking(next);
      const wait = this.randomBetween(450, 900);
      const waitTimer = window.setTimeout(() => {
        if (token !== this.playbackToken) {
          return;
        }
        this.hideThinking();
        const bubble = this.appendMessage(next, '');
        this.typeMessage(bubble, next.content, token, () => {
          const timer = window.setTimeout(step, 320);
          this.playbackTimers.push(timer);
        });
      }, wait);
      this.playbackTimers.push(waitTimer);
    };
    step();
  }

  private appendMessage(message: AiDialogMessage, initialText?: string): HTMLElement {
    if (!this.messageHost) {
      return document.createElement('article');
    }
    const element = this.buildMessageElement(message, initialText);
    this.messageHost.appendChild(element);
    this.messageHost.scrollTop = this.messageHost.scrollHeight;
    return element;
  }

  private buildMessageElement(message: AiDialogMessage, textOverride?: string): HTMLElement {
    const container = document.createElement('article');
    container.className = `ai-message ${message.role === 'ai' ? 'ai' : 'student'}`;
    const speaker = message.role === 'ai' ? '小墨 · AI' : '学生';
    const stamp = message.role === 'ai' ? 'RAG 推理中' : '真实困境';
    const text = typeof textOverride === 'string' ? textOverride : message.content;
    const sourcesMarkup = message.sources?.length
      ? `<ul class="ai-message-sources">${message.sources.map((source) => `<li>${source}</li>`).join('')}</ul>`
      : '';
    container.innerHTML = `
      <header>
        <div class="ai-message-speaker">${speaker}</div>
        <div class="ai-message-stamp">${stamp}</div>
      </header>
      <div class="ai-message-text" data-text>${text}</div>
      ${sourcesMarkup}
    `;
    return container;
  }

  private typeMessage(target: HTMLElement, content: string, token: number, done: () => void): void {
    const textElement = target.querySelector<HTMLElement>('[data-text]');
    if (!textElement) {
      done();
      return;
    }
    textElement.textContent = '';
    if (!content.length) {
      done();
      return;
    }
    let index = 0;
    let buffer = '';
    const interval = window.setInterval(() => {
      if (token !== this.playbackToken) {
        window.clearInterval(interval);
        return;
      }
      buffer += content.charAt(index);
      textElement.textContent = buffer;
      index += 1;
      if (index >= content.length) {
        window.clearInterval(interval);
        done();
      }
    }, this.randomBetween(15, 32));
    this.playbackIntervals.push(interval);
  }

  private cancelPlayback(): void {
    this.playbackTimers.forEach((timer) => window.clearTimeout(timer));
    this.playbackIntervals.forEach((interval) => window.clearInterval(interval));
    this.playbackTimers = [];
    this.playbackIntervals = [];
    this.hideThinking();
  }

  private showThinking(message: AiDialogMessage): void {
    if (!this.thinkingHost) return;
    this.thinkingHost.hidden = false;
    if (this.thinkingHint) {
      this.thinkingHint.textContent = message.thinking ?? '检索你的资料中……';
    }
  }

  private hideThinking(): void {
    if (!this.thinkingHost) return;
    this.thinkingHost.hidden = true;
    if (this.thinkingHint) {
      this.thinkingHint.textContent = '';
    }
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export class AiDialogModule implements UiModule {
  public readonly page: Page = 'aiDialog';
  private readonly view = new AiDialogView();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_root: LearningOsViewModel) {}

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.view.render(snapshot, regions);
  }
}
