import { Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindClick, bindInput } from '../../../utils/dom';
import { RenderRegions, UiModule } from '../../types';

interface LearningWorkspaceViewState {
  workspace: ViewSnapshot['workspace'];
}

class LearningWorkspaceViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): LearningWorkspaceViewState {
    return { workspace: snapshot.workspace };
  }

  public backToGoalWorkspace(): void {
    this.root.openGoalWorkspace();
  }

  public openKnowledgeBase(): void {
    this.root.navigate('knowledgeBase');
  }

  public syncNote(): void {
    this.root.syncWorkspaceNote();
  }

  public openChat(): void {
    this.root.navigate('aiChat');
  }

  public updateNote(value: string): void {
    this.root.updateWorkspaceNote(value);
  }
}

class LearningWorkspaceView {
  constructor(private readonly viewModel: LearningWorkspaceViewModel) {}

  public render(state: LearningWorkspaceViewState, regions: RenderRegions): void {
    const asset = state.workspace.activeAsset;
    regions.content.innerHTML = `
      <section class="workspace">
        <div class="workspace-col reader">
          <p class="eyebrow">左栏 · 多媒体阅读器</p>
          <h3>${asset.title}</h3>
          <p class="microcopy">${asset.metadata}</p>
          <p class="label">章节</p>
          <p>${asset.chapter}</p>
          <p class="label">进度 ${asset.progress}%</p>
          <progress value="${asset.progress}" max="100"></progress>
          <div class="actions">
            <button class="btn ghost" id="workspace-back">返回任务树</button>
            <button class="btn primary" id="workspace-open-kb">查看沉淀</button>
          </div>
        </div>
        <div class="workspace-col notes">
          <p class="eyebrow">中栏 · 即时笔记</p>
          <textarea id="note-editor">${state.workspace.noteDraft}</textarea>
          <div class="note-meta">
            <p>最近收录：${state.workspace.syncedNotes.join(' · ') || '暂无'}</p>
            <button class="btn primary" id="sync-note">一键收录</button>
          </div>
        </div>
        <div class="workspace-col coach">
          <p class="eyebrow">右栏 · AI 个性化教师</p>
          <div class="coach-card">
            <p>${state.workspace.coachFocus}</p>
            <ul>
              ${state.workspace.quizQueue.map((item) => `<li>${item}</li>`).join('')}
            </ul>
            <div class="actions">
              <button class="btn ghost" id="workspace-go-chat">打开 AI 对话</button>
              <button class="btn primary" id="workspace-sync">同步到知识库</button>
            </div>
          </div>
        </div>
      </section>
    `;

    bindClick(regions.content, '#workspace-back', () => this.viewModel.backToGoalWorkspace());
    bindClick(regions.content, '#workspace-open-kb', () => this.viewModel.openKnowledgeBase());
    bindClick(regions.content, '#sync-note', () => this.viewModel.syncNote());
    bindClick(regions.content, '#workspace-sync', () => this.viewModel.syncNote());
    bindClick(regions.content, '#workspace-go-chat', () => this.viewModel.openChat());
    bindInput(regions.content, '#note-editor', (value) =>
      this.viewModel.updateNote(String(value))
    );
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
