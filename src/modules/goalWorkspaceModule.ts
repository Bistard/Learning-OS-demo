import { Page, StudyGoal, TaskNode } from '../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';
import { bindClick, bindListClick } from '../utils/dom';
import { RenderRegions, UiModule } from './types';

interface GoalWorkspaceViewState {
  goal: StudyGoal | null;
}

class GoalWorkspaceViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): GoalWorkspaceViewState {
    return { goal: snapshot.activeGoal };
  }

  public openKnowledgeBase(): void {
    this.root.navigate('knowledgeBase');
  }

  public startLearningWorkspace(taskId?: string): void {
    this.root.startLearningWorkspace(taskId);
  }

  public markRouteItemComplete(routeId: string): void {
    this.root.markRouteItemComplete(routeId);
  }
}

class GoalWorkspaceView {
  constructor(private readonly viewModel: GoalWorkspaceViewModel) {}

  public render(state: GoalWorkspaceViewState, regions: RenderRegions): void {
    if (!state.goal) {
      regions.content.innerHTML = '<p class="microcopy">选择一个目标以查看任务树。</p>';
      return;
    }
    const goal = state.goal;
    const routeList = goal.todayRoute
      .map(
        (item) => `
        <li class="route-item ${item.status}">
          <div>
            <p class="label">${item.kind}</p>
            <strong>${item.title}</strong>
            <p class="microcopy">${item.detail}</p>
          </div>
          <div class="route-meta">
            <span class="pill">${item.etaMinutes} min</span>
            <button class="btn ghost" data-route-learn="${item.id}" ${
              item.status === 'locked' ? 'disabled' : ''
            }>进入三栏</button>
            <button class="btn primary" data-route-complete="${item.id}" ${
              item.status === 'available' || item.status === 'in-progress' ? '' : 'disabled'
            }>标记完成</button>
          </div>
        </li>`
      )
      .join('');

    const weekly = goal.weeklyPlan
      .map(
        (plan) => `
        <article>
          <p class="eyebrow">${plan.day}</p>
          <strong>${plan.focus}</strong>
          <p class="microcopy">投入 ${plan.hours} 小时 · ${plan.aiTip}</p>
        </article>`
      )
      .join('');

    const highlights =
      goal.highlights.length > 0
        ? goal.highlights
            .map(
              (highlight) => `
          <article>
            <p class="eyebrow">${highlight.type}</p>
            <strong>${highlight.title}</strong>
            <p class="microcopy">${highlight.excerpt}</p>
            <p class="label">${highlight.source}</p>
          </article>`
            )
            .join('')
        : '<p class="microcopy">学习过程中生成的对话、笔记、Quiz 会自动沉入知识库。</p>';

    regions.content.innerHTML = `
      <section class="panel today-route">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Step 2</p>
            <h3>今日路线 · 任务树入口</h3>
          </div>
          <button class="btn ghost" id="route-open-kb">查看关联知识库</button>
        </div>
        <ul class="route-list">${routeList}</ul>
      </section>

      <section class="panel weekly-plan">
        <div class="panel-head">
          <p class="eyebrow">Step 3</p>
          <h3>AI 排好的本周计划</h3>
        </div>
        <div class="grid-4">${weekly}</div>
      </section>

      <section class="panel task-tree">
        <div class="panel-head">
          <p class="eyebrow">任务树</p>
          <h3>所有节点均可链接知识库</h3>
        </div>
        <div>${this.renderTaskTree(goal.taskTree)}</div>
      </section>

      <section class="panel highlights">
        <div class="panel-head">
          <p class="eyebrow">自动整理</p>
          <h3>知识库即时沉淀</h3>
        </div>
        <div class="grid-3">${highlights}</div>
      </section>
    `;

    bindClick(regions.content, '#route-open-kb', () => this.viewModel.openKnowledgeBase());
    bindListClick(regions.content, '[data-route-learn]', (element) => {
      const id = element.getAttribute('data-route-learn');
      this.viewModel.startLearningWorkspace(id || undefined);
    });
    bindListClick(regions.content, '[data-route-complete]', (element) => {
      const id = element.getAttribute('data-route-complete');
      if (id) this.viewModel.markRouteItemComplete(id);
    });
    bindListClick(regions.content, '[data-node-workspace]', (element) => {
      const id = element.getAttribute('data-node-workspace');
      this.viewModel.startLearningWorkspace(id || undefined);
    });
  }

  private renderTaskTree(nodes: TaskNode[]): string {
    if (!nodes) return '';
    const renderNode = (node: TaskNode): string => `
      <div class="tree-node ${node.status}">
        <div>
          <p class="label">${node.type}</p>
          <strong>${node.title}</strong>
          <p class="microcopy">${node.summary}</p>
        </div>
        <div class="node-meta">
          <span>${node.xp} XP</span>
          <button class="btn ghost" data-node-workspace="${node.id}" ${
            node.status === 'locked' ? 'disabled' : ''
          }>开启三栏</button>
        </div>
        ${
          node.children ? `<div class="tree-children">${node.children.map(renderNode).join('')}</div>` : ''
        }
      </div>
    `;
    return nodes.map(renderNode).join('');
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
