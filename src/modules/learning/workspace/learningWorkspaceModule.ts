import { Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindClick } from '../../../utils/dom';
import { renderMarkdown } from '../../../utils/markdown';
import { RenderRegions, UiModule } from '../../types';
import {
  NoteEditorView,
  NoteEditorViewModel,
  NoteResolver,
} from '../../knowledge/notes/noteEditorModule';

interface LearningWorkspaceViewState {
  asset: ViewSnapshot['workspace']['activeAsset'] | null;
  noteTitle: string;
  noteHelper: string;
  hasNote: boolean;
  activeNoteId: string | null;
  isNotesCollapsed: boolean;
}

const resolveWorkspaceNote: NoteResolver = (snapshot: ViewSnapshot) => {
  const noteId = snapshot.workspace?.activeNoteId;
  if (!noteId) return null;
  return snapshot.notes.find((note) => note.id === noteId) ?? null;
};

class LearningWorkspaceViewModel {
  private notesCollapsed = false;

  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): LearningWorkspaceViewState {
    const asset = snapshot.workspace?.activeAsset ?? null;
    const activeNoteId = snapshot.workspace?.activeNoteId ?? null;
    const note = activeNoteId
      ? snapshot.notes.find((candidate) => candidate.id === activeNoteId) ?? null
      : null;
    return {
      asset,
      noteTitle: note?.title ?? '暂无关联笔记',
      noteHelper: note
        ? this.formatNoteMeta(note.updatedAt)
        : '开启学习后自动生成任务专属笔记',
      hasNote: Boolean(note),
      activeNoteId: note?.id ?? null,
      isNotesCollapsed: this.notesCollapsed,
    };
  }

  public backToGoalWorkspace(): void {
    this.root.openGoalWorkspace();
  }

  public captureNote(noteId?: string | null): void {
    this.root.captureWorkspaceNote(noteId ?? undefined);
  }

  public toggleNotesPanel(collapsed?: boolean): boolean {
    this.notesCollapsed = typeof collapsed === 'boolean' ? collapsed : !this.notesCollapsed;
    return this.notesCollapsed;
  }

  private formatNoteMeta(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '最近更新：--';
    }
    return `最近更新：${date.toLocaleString('zh-CN', { hour12: false })}`;
  }
}

class LearningWorkspaceView {
  private host: HTMLElement | null = null;
  private splitPercent = 50;
  private dragPointerId: number | null = null;

  constructor(private readonly viewModel: LearningWorkspaceViewModel) {}

  public render(state: LearningWorkspaceViewState, regions: RenderRegions): HTMLElement | null {
    if (!state.asset) {
      regions.content.innerHTML = this.renderEmpty();
      bindClick(regions.content, '#workspace-back', () => this.viewModel.backToGoalWorkspace());
      return null;
    }
    regions.content.innerHTML = this.renderSystem(state);
    this.host = regions.content.querySelector<HTMLElement>('.learning-system');
    this.applySplit();
    this.applyCollapseState(state.isNotesCollapsed);
    this.bindActions(regions.content, state);
    if (this.host) {
      this.bindResizer(this.host);
    }
    return regions.content.querySelector<HTMLElement>('[data-note-panel-body]');
  }

  private bindActions(scope: HTMLElement, state: LearningWorkspaceViewState): void {
    bindClick(scope, '#workspace-back', () => this.viewModel.backToGoalWorkspace());
    bindClick(scope, '[data-note-capture]', () => {
      if (!state.hasNote) return;
      this.viewModel.captureNote(state.activeNoteId);
    });
    bindClick(scope, '[data-note-collapse]', () => {
      const collapsed = this.viewModel.toggleNotesPanel(true);
      this.applyCollapseState(collapsed);
    });
    bindClick(scope, '[data-note-expand]', () => {
      const collapsed = this.viewModel.toggleNotesPanel(false);
      this.applyCollapseState(collapsed);
    });
  }

  private renderSystem(state: LearningWorkspaceViewState): string {
    const collapseClass = state.isNotesCollapsed ? 'notes-collapsed' : '';
    return `
      <section class="learning-system ${collapseClass}" data-learning-system>
        <div class="learning-system-reader">
          ${this.renderReaderCard(state.asset!)}
        </div>
        <div
          class="learning-system-handle"
          data-note-resizer
          role="separator"
          aria-label="调整阅读器与笔记系统的宽度"
          aria-orientation="vertical"
        ></div>
        <aside class="learning-system-notes" data-note-panel>
          ${this.renderNotePanel(state)}
          <div class="learning-note-body" data-note-panel-body></div>
        </aside>
        <button class="note-panel-expander" data-note-expand type="button">展开笔记系统</button>
      </section>
    `;
  }

  private bindResizer(system: HTMLElement): void {
    const handle = system.querySelector<HTMLElement>('[data-note-resizer]');
    if (!handle) return;
    const onMove = (event: PointerEvent) => {
      if (this.dragPointerId === null) return;
      this.updateSplit(event, system);
    };
    const onUp = () => {
      if (this.dragPointerId !== null) {
        try {
          handle.releasePointerCapture(this.dragPointerId);
        } catch {
          // ignore
        }
      }
      this.dragPointerId = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.dragPointerId = event.pointerId;
      handle.setPointerCapture(event.pointerId);
      this.updateSplit(event, system);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  private updateSplit(event: PointerEvent, system: HTMLElement): void {
    const rect = system.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const ratio = relativeX / rect.width;
    const clamped = Math.min(0.8, Math.max(0.2, ratio));
    this.applySplit(clamped * 100);
  }

  private applySplit(percent?: number): void {
    if (percent !== undefined) {
      this.splitPercent = Math.min(80, Math.max(20, percent));
    }
    if (!this.host) return;
    const reader = this.splitPercent;
    const notes = 100 - reader;
    this.host.style.setProperty('--reader-percent', `${reader}%`);
    this.host.style.setProperty('--notes-percent', `${notes}%`);
  }

  private renderReaderCard(asset: NonNullable<LearningWorkspaceViewState['asset']>): string {
    const preview = renderMarkdown(asset.content, {
      emptyClassName: 'reader-preview-empty',
      emptyMessage: '暂无可阅读的学习内容。',
    });
    return `
      <section class="note-reader">
        <article class="note-reader-card">
          <div>
            <p class="eyebrow">笔记阅读器</p>
            <h3>${this.escape(asset.title)}</h3>
            <p class="microcopy">${this.escape(asset.metadata)}</p>
          </div>
          <div class="note-reader-meta">
            <span>章节：${this.escape(asset.chapter)}</span>
            <span>更新时间：${this.escape(asset.lastUpdated)}</span>
          </div>
          <div class="note-reader-progress">
            <progress value="${asset.progress}" max="100"></progress>
            <span>${asset.progress}% 完成</span>
          </div>
          <div class="note-reader-preview">
            ${preview}
          </div>
        </article>
        <div class="note-reader-actions">
          <button class="btn primary" id="workspace-back" type="button">返回任务树</button>
        </div>
      </section>
    `;
  }

  private renderNotePanel(state: LearningWorkspaceViewState): string {
    const disabled = state.hasNote ? '' : 'disabled';
    return `
      <header class="note-panel-header">
        <div>
          <p class="eyebrow">笔记系统</p>
          <h4>${this.escape(state.noteTitle)}</h4>
          <p class="microcopy">${this.escape(state.noteHelper)}</p>
        </div>
        <div class="note-panel-actions">
          <button class="btn ghost slim" data-note-capture type="button" ${disabled}>
            收录知识库
          </button>
          <button class="btn ghost slim" data-note-collapse type="button">收起</button>
        </div>
      </header>
    `;
  }

  private renderEmpty(): string {
    return `
      <section class="note-reader note-reader-empty">
        <div class="empty-card">
          <h3>尚未选择学习任务</h3>
          <p class="microcopy">返回任务树，点击「开始学习」即可生成阅读内容与专属笔记。</p>
          <button class="btn primary" id="workspace-back" type="button">回到任务树</button>
        </div>
      </section>
    `;
  }

  private applyCollapseState(collapsed: boolean): void {
    this.host?.classList.toggle('notes-collapsed', collapsed);
    if (!collapsed) {
      this.applySplit();
    }
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
  private readonly noteViewModel: NoteEditorViewModel;
  private readonly noteView: NoteEditorView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new LearningWorkspaceViewModel(root);
    this.view = new LearningWorkspaceView(this.viewModel);
    this.noteViewModel = new NoteEditorViewModel(root, {
      resolveNote: resolveWorkspaceNote,
      createNote: () => root.createWorkspaceNote(),
    });
    this.noteView = new NoteEditorView(this.noteViewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    const noteState = this.noteViewModel.buildState(snapshot);
    const noteHost = this.view.render(state, regions);
    if (noteHost) {
      const headerStub = document.createElement('div');
      const sidebarStub = document.createElement('div');
      this.noteView.render(noteState, {
        header: headerStub,
        sidebar: sidebarStub,
        content: noteHost,
      });
    }
  }
}
