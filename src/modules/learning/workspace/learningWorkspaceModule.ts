import { Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindClick } from '../../../utils/dom';
import { renderMarkdown } from '../../../utils/markdown';
import { RenderRegions, UiModule } from '../../types';

interface LearningWorkspaceViewState {
  asset: ViewSnapshot['workspace']['activeAsset'] | null;
}

class LearningWorkspaceViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): LearningWorkspaceViewState {
    return { asset: snapshot.workspace?.activeAsset ?? null };
  }

  public backToGoalWorkspace(): void {
    this.root.openGoalWorkspace();
  }
}

class LearningWorkspaceView {
  constructor(private readonly viewModel: LearningWorkspaceViewModel) {}

  public render(state: LearningWorkspaceViewState, regions: RenderRegions): void {
    if (!state.asset) {
      regions.content.innerHTML = this.renderEmpty();
      bindClick(regions.content, '#workspace-back', () => this.viewModel.backToGoalWorkspace());
      return;
    }
    const asset = state.asset;
    const preview = renderMarkdown(asset.content, {
      emptyClassName: 'reader-preview-empty',
      emptyMessage: '暂无可阅读的学习内容～',
    });
    regions.content.innerHTML = `
      <section class="note-reader">
        <article class="note-reader-card">
          <div>
            <p class="eyebrow">笔记阅读器</p>
            <h3>${this.escape(asset.title)}</h3>
            <p class="microcopy">${this.escape(asset.metadata)}</p>
          </div>
          <div class="note-reader-meta">
            <span>章节：${this.escape(asset.chapter)}</span>
            <span>最近更新：${this.escape(asset.lastUpdated)}</span>
          </div>
          <div class="note-reader-progress">
            <progress value="${asset.progress}" max="100"></progress>
            <span>${asset.progress}% 完成</span>
          </div>
          <div class="note-reader-preview">
            ${preview}
          </div>
        </article>
      </section>
    `;
  }

  private renderEmpty(): string {
    return `
      <section class="note-reader note-reader-empty">
        <div class="empty-card">
          <h3>暂无学习内容</h3>
          <p class="microcopy">回到任务树选择一个节点，即可开启笔记阅读器。</p>
          <button class="btn primary" id="workspace-back" type="button">返回任务树</button>
        </div>
      </section>
    `;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export class LearningWorkspaceModule implements UiModule {
  public readonly page: Page = 'learningWorkspace';
  private readonly viewModel: LearningWorkspaceViewModel;
  private readonly view: LearningWorkspaceView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new LearningWorkspaceViewModel(root);
    this.view = new LearningWorkspaceView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
