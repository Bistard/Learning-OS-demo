import { Page, StudyGoal, TaskNode } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindListClick } from '../../../utils/dom';
import { RenderRegions, UiModule } from '../../types';

interface GoalWorkspaceViewState {
  goal: StudyGoal | null;
}

const TASK_KIND_LABEL: Record<TaskNode['type'], string> = {
  concept: '概念',
  practice: '练习',
  review: '复盘',
  quiz: '测验',
  project: '项目',
};

class GoalWorkspaceViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): GoalWorkspaceViewState {
    return { goal: snapshot.activeGoal };
  }

  public startLearningWorkspace(taskId?: string): void {
    this.root.startLearningWorkspace(taskId);
  }

  public markTaskNodeComplete(nodeId: string): void {
    this.root.markTaskNodeComplete(nodeId);
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
    regions.content.innerHTML = `
      <section class="panel task-tree">
        <div class="panel-head">
          <p class="eyebrow">任务树</p>
          <h3>学习路径节点</h3>
        </div>
        <div>${this.renderTaskTree(goal.taskTree)}</div>
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
          <div class="node-content">
            <div class="node-copy">
              <p class="label">${TASK_KIND_LABEL[node.type] ?? '任务'}</p>
              <strong>${node.title}</strong>
              <p class="microcopy">${node.summary}</p>
            </div>
            <div class="node-meta">
              <span class="pill node-eta">${node.etaMinutes} 分钟</span>
              <div class="node-actions">
                <button class="btn ghost" data-node-workspace="${node.id}" ${
                  startDisabled ? 'disabled' : ''
                }>开始学习</button>
                <button class="btn primary" data-node-complete="${node.id}" ${
                  completeDisabled ? 'disabled' : ''
                }>标记完成</button>
              </div>
            </div>
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
