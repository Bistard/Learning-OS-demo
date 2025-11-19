import { Page, PersonaSignal, StudyGoal, TaskNode } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindListClick } from '../../../utils/dom';
import { RenderRegions, UiModule } from '../../types';

interface GoalWorkspaceViewState {
  goal: StudyGoal | null;
  personaPanel: PersonaPanelState | null;
  showMockExamCta: boolean;
}

interface PersonaPanelState {
  remainingTimeLabel: string;
  targetScoreLabel: string;
  preferences: PersonaSignal[];
  weaknesses: PersonaSignal[];
  constraints: PersonaSignal[];
  strategyLine: string;
  progress: PersonaProgressState;
  cadenceNote: string;
}

interface PersonaProgressState {
  percent: number;
  label: string;
  completedMinutes: number;
  totalMinutes: number;
}

const TASK_KIND_LABEL: Record<TaskNode['type'], string> = {
  concept: '概念',
  practice: '练习',
  review: '复盘',
  quiz: '测验',
  project: '项目',
};

const BENEFIT_LABEL: Record<TaskNode['benefitLevel'], string> = {
  high: '收益高',
  medium: '收益中',
  low: '收益低',
};

class GoalWorkspaceViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): GoalWorkspaceViewState {
    const goal = snapshot.activeGoal;
    if (!goal) {
      return { goal: null, personaPanel: null, showMockExamCta: false };
    }
    return {
      goal,
      personaPanel: this.buildPersonaPanel(goal),
      showMockExamCta: goal.taskTree.length > 0,
    };
  }

  public startLearningWorkspace(taskId?: string): void {
    this.root.startLearningWorkspace(taskId);
  }

  public markTaskNodeComplete(nodeId: string): void {
    this.root.markTaskNodeComplete(nodeId);
  }

  private buildPersonaPanel(goal: StudyGoal): PersonaPanelState {
    const persona = goal.profile.persona;
    const remainingHours = persona?.remainingHours ?? this.estimateRemainingHours(goal);
    const targetScore = persona?.targetScore ?? Math.round(goal.profile.mastery);
    return {
      remainingTimeLabel: `${remainingHours} 小时`,
      targetScoreLabel: `冲刺 ${targetScore}+`,
      preferences: persona?.preferences ?? [],
      weaknesses: persona?.weaknesses ?? [],
      constraints: persona?.constraints ?? [],
      strategyLine:
        persona?.strategyLine ??
        '优先啃高收益节点 → Chunking 拆题 → Active Recall 快速回顾。',
      progress: this.computeEtaProgress(goal.taskTree),
      cadenceNote: '每 1 小时自动触发 Quick Review / 重新规划学习节奏。',
    };
  }

  private estimateRemainingHours(goal: StudyGoal): number {
    const days = goal.progress.remainingDays ?? 0;
    const hoursPerDay = Math.max(1, Math.round(goal.profile.dailyMinutes / 60));
    return Math.max(hoursPerDay, days * hoursPerDay);
  }

  private computeEtaProgress(nodes: TaskNode[]): PersonaProgressState {
    const totals = this.sumEta(nodes);
    const percent = totals.totalMinutes
      ? Math.min(100, Math.round((totals.completedMinutes / totals.totalMinutes) * 100))
      : 0;
    return {
      percent,
      label: `已完成 ${totals.completedMinutes}/${totals.totalMinutes} 分钟（预计耗时）`,
      completedMinutes: totals.completedMinutes,
      totalMinutes: totals.totalMinutes,
    };
  }

  private sumEta(nodes: TaskNode[]): { totalMinutes: number; completedMinutes: number } {
    return nodes.reduce(
      (acc, node) => {
        const childTotals = node.children ? this.sumEta(node.children) : { totalMinutes: 0, completedMinutes: 0 };
        const totalMinutes = acc.totalMinutes + node.etaMinutes + childTotals.totalMinutes;
        const completedMinutes =
          acc.completedMinutes + (node.status === 'complete' ? node.etaMinutes : 0) + childTotals.completedMinutes;
        return { totalMinutes, completedMinutes };
      },
      { totalMinutes: 0, completedMinutes: 0 }
    );
  }
}

class GoalWorkspaceView {
  constructor(private readonly viewModel: GoalWorkspaceViewModel) {}

  public render(state: GoalWorkspaceViewState, regions: RenderRegions): void {
    if (!state.goal) {
      regions.content.innerHTML = '<p class="microcopy">选择一个目标以查看 AI 任务树和画像洞察。</p>';
      return;
    }

    const personaPanel = state.personaPanel ? this.renderPersonaPanel(state.personaPanel) : '';
    regions.content.innerHTML = `
      ${personaPanel}
      <section class="panel task-tree">
        <div class="panel-head">
          <p class="eyebrow">任务树</p>
          <h3>学习路径节点</h3>
        </div>
        <div>${this.renderTaskTree(state.goal.taskTree)}</div>
        ${state.showMockExamCta ? this.renderMockExamCta() : ''}
      </section>
    `;

    bindListClick(regions.content, '[data-node-workspace]', (element) => {
      const id = element.getAttribute('data-node-workspace');
      this.viewModel.startLearningWorkspace(id || undefined);
    });

    bindListClick(regions.content, '[data-node-complete]', (element) => {
      const id = element.getAttribute('data-node-complete');
      if (id) this.viewModel.markTaskNodeComplete(id);
    });
  }

  private renderPersonaPanel(panel: PersonaPanelState): string {
    return `
      <section class="panel persona-panel">
        <div class="panel-head">
          <p class="eyebrow">用户画像</p>
          <h3>冲刺策略总览</h3>
        </div>
        <div class="persona-metrics">
          <div class="persona-metric">
            <p class="label">剩余时间</p>
            <strong>${panel.remainingTimeLabel}</strong>
          </div>
          <div class="persona-metric">
            <p class="label">目标成绩</p>
            <strong>${panel.targetScoreLabel}</strong>
          </div>
        </div>
        <div class="persona-tags">
          <div>
            <p class="label">偏好</p>
            <div class="chip-row">${this.renderSignals(panel.preferences)}</div>
          </div>
          <div>
            <p class="label">薄弱点</p>
            <div class="chip-row">${this.renderSignals(panel.weaknesses)}</div>
          </div>
        </div>
        ${
          panel.constraints.length
            ? `<div class="persona-tags persona-constraints">
                <div>
                  <p class="label">约束</p>
                  <div class="chip-row">${this.renderSignals(panel.constraints)}</div>
                </div>
              </div>`
            : ''
        }
        <div class="strategy-card">
          <p>${panel.strategyLine}</p>
          <small>${panel.cadenceNote}</small>
        </div>
        <div class="persona-progress">
          <div class="progress-head">
            <p>全局进度（按预计耗时）</p>
            <span>${panel.progress.label}</span>
          </div>
          <progress value="${panel.progress.percent}" max="100"></progress>
        </div>
      </section>
    `;
  }

  private renderSignals(signals: PersonaSignal[]): string {
    if (!signals || signals.length === 0) {
      return '<span class="persona-chip muted">暂无</span>';
    }
    return signals
      .map((signal) => `<span class="persona-chip" title="${signal.description}">${signal.label}</span>`)
      .join('');
  }

  private renderTaskTree(nodes: TaskNode[]): string {
    if (!nodes?.length) {
      return '<p class="microcopy">暂无任务节点。</p>';
    }

    const renderNode = (node: TaskNode): string => {
      const startDisabled = node.status === 'complete';
      const completeDisabled = node.status === 'complete';
      const statusClass = node.status === 'complete' ? 'complete' : '';
      return `
        <div class="tree-node ${statusClass}">
          <header class="node-header">
            <div>
              <p class="label">${TASK_KIND_LABEL[node.type] ?? '任务'}</p>
              <strong>${node.title}</strong>
            </div>
            <div class="node-meta">
              <span class="pill node-eta">${node.etaMinutes} 分钟</span>
              <span class="pill benefit ${node.benefitLevel}">${BENEFIT_LABEL[node.benefitLevel]}</span>
            </div>
          </header>
          <p class="microcopy">${node.summary}</p>
          ${this.renderTagSequence(node.tagSequence)}
          ${this.renderPersonaBindings(node.personaBindings)}
          ${this.renderChunkSteps(node.chunkSteps)}
          ${this.renderWhy(node.why)}
          <div class="node-actions">
            <button class="btn ghost" data-node-workspace="${node.id}" ${
              startDisabled ? 'disabled' : ''
            }>开始学习</button>
            <button class="btn primary" data-node-complete="${node.id}" ${
              completeDisabled ? 'disabled' : ''
            }>标记完成</button>
          </div>
          ${
            node.children
              ? `<div class="tree-children">${node.children.map(renderNode).join('')}</div>`
              : ''
          }
        </div>
      `;
    };

    return nodes.map(renderNode).join('');
  }

  private renderTagSequence(tags: TaskNode['tagSequence']): string {
    if (!tags || tags.length === 0) return '';
    const sorted = [...tags].sort((a, b) => a.order - b.order);
    return `
      <div class="node-tags">
        ${sorted
          .map(
            (tag) =>
              `<span class="tag-chip tag-${tag.type}" title="${tag.description}">
                ${tag.label}
              </span>`
          )
          .join('')}
      </div>
    `;
  }

  private renderPersonaBindings(bindings: TaskNode['personaBindings']): string {
    if (!bindings || bindings.length === 0) return '';
    return `
      <div class="node-section persona-adapt">
        <p class="section-label">个性化调度</p>
        <ul class="binding-list">
          ${bindings
            .map(
              (binding) =>
                `<li>
                  <span class="binding-label">${binding.label}</span>
                  <span class="binding-action">${binding.action}</span>
                </li>`
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  private renderChunkSteps(steps: string[]): string {
    if (!steps || steps.length === 0) return '';
    return `
      <div class="node-section chunk-plan">
        <p class="section-label">Chunking 计划</p>
        <ol class="chunk-steps">
          ${steps.map((step) => `<li>${step}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  private renderWhy(why: TaskNode['why']): string {
    if (!why) return '';
    return `
      <div class="node-section node-why">
        <p class="section-label">为什么学这个？</p>
        <strong>${why.statement}</strong>
        <ul class="evidence-list">
          ${why.evidence.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private renderMockExamCta(): string {
    return `
      <div class="mock-exam-cta">
        <p class="microcopy">需要整套检验？AI 将提供一键 Mock Exam（即将上线）。</p>
        <button class="btn secondary" type="button" disabled>AI 生成 Mock Exam</button>
      </div>
    `;
  }
}

export class GoalWorkspaceModule implements UiModule {
  public readonly page: Page = 'goalWorkspace';
  private readonly viewModel: GoalWorkspaceViewModel;
  private readonly view: GoalWorkspaceView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new GoalWorkspaceViewModel(root);
    this.view = new GoalWorkspaceView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
