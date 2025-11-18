import { Page, StudyGoal } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindClick, bindListClick } from '../../../utils/dom';
import { RenderRegions, UiModule } from '../../types';

interface GoalDashboardViewState {
  summary: ViewSnapshot['dashboardSummary'];
  goals: StudyGoal[];
}

class GoalDashboardViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): GoalDashboardViewState {
    return {
      summary: snapshot.dashboardSummary,
      goals: snapshot.goals,
    };
  }

  public openGoalCreation(): void {
    this.root.navigate('goalCreation');
  }

  public openKnowledgeBase(): void {
    this.root.navigate('knowledgeBase');
  }

  public openGoal(goalId: string): void {
    this.root.openGoalWorkspace(goalId);
  }

}

class GoalDashboardView {
  constructor(private readonly viewModel: GoalDashboardViewModel) {}

  public render(state: GoalDashboardViewState, regions: RenderRegions): void {
    regions.content.innerHTML = `
      <section class="panel hero-goal">
        <div>
          <p class="eyebrow">Step 0</p>
          <h2>你现在最重要的学习目标是什么？</h2>
          <div class="cta-group">
            <button class="btn primary" id="dashboard-create-goal">创建目标</button>
            <button class="btn ghost" id="dashboard-open-kb">查看知识库</button>
          </div>
        </div>
        <div class="hero-stats">
          <div>
            <p class="label">目标总数</p>
            <p class="strong">${state.summary.totalGoals}</p>
          </div>
          <div>
            <p class="label">活跃目标</p>
            <p class="strong">${state.summary.activeGoals}</p>
          </div>
          <div>
            <p class="label">最近截止</p>
            <p class="strong">${state.summary.nearestDeadlineLabel}</p>
          </div>
        </div>
      </section>

      <section class="goal-grid">
        ${
          state.goals.length > 0
            ? state.goals
                .map(
                  (goal) => `
              <article class="goal-card">
                <div>
                  <p class="eyebrow">${goal.profile.targetType}</p>
                  <h3>${goal.name}</h3>
                  <p class="microcopy">截止 ${new Date(goal.profile.deadline).toLocaleDateString()}</p>
                </div>
                <div class="goal-progress">
                  <p class="label">进度</p>
                  <progress value="${goal.progress.percent}" max="100"></progress>
                  <p class="microcopy">剩余 ${goal.progress.remainingDays} 天 · 每日 ${
                    Math.round(goal.profile.dailyMinutes / 60) || 0
                  } 小时</p>
                </div>
                <div class="goal-actions">
                  <button class="btn primary" data-goal-open="${goal.id}">进入任务树</button>
                </div>
              </article>`
                )
                .join('')
            : '<p class="microcopy">创建目标后，这里会展示任务树与今日路线。</p>'
        }
      </section>
    `;

    bindClick(regions.content, '#dashboard-create-goal', () => this.viewModel.openGoalCreation());
    bindClick(regions.content, '#dashboard-open-kb', () => this.viewModel.openKnowledgeBase());
    bindListClick(regions.content, '[data-goal-open]', (element) => {
      const id = element.getAttribute('data-goal-open');
      if (id) this.viewModel.openGoal(id);
    });
  }
}

export class GoalDashboardModule implements UiModule {
  public readonly page: Page = 'goalDashboard';
  private readonly viewModel: GoalDashboardViewModel;
  private readonly view: GoalDashboardView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new GoalDashboardViewModel(root);
    this.view = new GoalDashboardView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
