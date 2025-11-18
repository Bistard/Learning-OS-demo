import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindClick } from '../../../utils/dom';

export class ContextHeaderModule {
  constructor(private readonly viewModel: LearningOsViewModel) {}

  public render(snapshot: ViewSnapshot, host: HTMLElement): void {
    const goal = snapshot.activeGoal;
    const summary = snapshot.dashboardSummary;
    if (!goal) {
      host.innerHTML = `
        <div class="context-empty">
          <h1>还没有目标</h1>
          <p class="microcopy">以目标为入口，知识库作为自动沉淀的载体</p>
          <button class="btn primary" id="header-create-goal">创建目标</button>
        </div>
      `;
      bindClick(host, '#header-create-goal', () => this.viewModel.navigate('goalCreation'));
      return;
    }
    host.innerHTML = `
      <div class="context-primary">
        <p class="eyebrow">当前目标</p>
        <h1>${goal.name}</h1>
        <p class="microcopy">${goal.focus}</p>
      </div>
      <div class="context-metrics">
        <div>
          <p class="label">总体进度</p>
          <p class="strong">${goal.progress.percent}%</p>
        </div>
        <div>
          <p class="label">剩余天数</p>
          <p class="strong">${goal.progress.remainingDays} 天</p>
        </div>
        <div>
          <p class="label">每日投入</p>
          <p class="strong">${Math.round(goal.profile.dailyMinutes / 60)} 小时</p>
        </div>
        <div>
          <p class="label">知识库连接</p>
          <p class="strong">${summary.knowledgeVaults}</p>
        </div>
      </div>
      <div class="context-actions">
        <button class="btn primary" id="header-open-workspace">进入任务树</button>
      </div>
    `;
    bindClick(host, '#header-open-workspace', () => this.viewModel.openGoalWorkspace());
  }
}
