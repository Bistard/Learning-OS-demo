import { KnowledgeNote, Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindClick } from '../../../utils/dom';
import { renderMarkdown } from '../../../utils/markdown';
import { RenderRegions, UiModule } from '../../types';

export interface NoteEditorViewState {
  note: KnowledgeNote | null;
  createdLabel: string;
  updatedLabel: string;
  wordCount: number;
  showPreview: boolean;
}

export type NoteResolver = (snapshot: ViewSnapshot) => KnowledgeNote | null;

export interface NoteEditorViewModelOptions {
  resolveNote: NoteResolver;
  createNote?: () => void;
}

export class NoteEditorViewModel {
  constructor(
    private readonly root: LearningOsViewModel,
    private readonly options: NoteEditorViewModelOptions
  ) {}

  public buildState(snapshot: ViewSnapshot): NoteEditorViewState {
    const note = this.options.resolveNote(snapshot);
    return {
      note,
      createdLabel: note ? this.formatTimestamp(note.createdAt) : '—',
      updatedLabel: note ? this.formatTimestamp(note.updatedAt) : '—',
      wordCount: note ? this.countCharacters(note.content) : 0,
      showPreview: snapshot.configuration.notePreviewEnabled,
    };
  }

  public rename(noteId: string, title: string): void {
    this.root.renameNote(noteId, title);
  }

  public updateContent(noteId: string, content: string): void {
    this.root.updateNoteContent(noteId, content);
  }

  public createNote(): void {
    if (this.options.createNote) {
      this.options.createNote();
      return;
    }
    this.root.createNote();
  }

  public openKnowledgeBase(): void {
    this.root.navigate('knowledgeBase');
  }

  private formatTimestamp(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  private countCharacters(content: string): number {
    return content.replace(/\s+/g, '').length;
  }
}

export class NoteEditorView {
  private host: HTMLElement | null = null;
  private pendingFocus:
    | { noteId: string; field: 'title' | 'body'; selectionStart: number; selectionEnd: number }
    | null = null;
  private composingField: { noteId: string; field: 'title' | 'body' } | null = null;

  constructor(private readonly viewModel: NoteEditorViewModel) {}

  public render(state: NoteEditorViewState, regions: RenderRegions): void {
    if (!state.note) {
      this.host = regions.content;
      this.pendingFocus = null;
      regions.content.innerHTML = this.renderEmpty();
      bindClick(regions.content, '#note-create-empty', () => this.viewModel.createNote());
      return;
    }
    this.host = regions.content;
    regions.content.innerHTML = this.renderNote(state);
    const editor = regions.content.querySelector<HTMLTextAreaElement>('#note-body-input');
    if (editor) {
      editor.value = state.note.content;
    }
    this.bindNoteInputs(state);
    this.restoreFocus(state.note.id);
  }

  private renderEmpty(): string {
    return `
      <section class="note-empty">
        <div class="note-empty-card">
          <h3>还没有可编辑的笔记</h3>
          <p>点击下方按钮创建第一篇 Markdown 笔记</p>
          <button class="btn primary" id="note-create-empty" type="button">新建笔记</button>
        </div>
      </section>
    `;
  }

  private renderNote(state: NoteEditorViewState): string {
    const note = state.note!;
    const preview = state.showPreview ? renderMarkdown(note.content) : '';
    const workspaceClass = state.showPreview ? 'note-workspace' : 'note-workspace single';
    return `
      <section class="${workspaceClass}">
        <div class="note-pane note-pane-editor">
          <input
            id="note-title-input"
            class="note-title-input"
            type="text"
            maxlength="80"
            value="${this.escapeHtml(note.title)}"
            placeholder="输入标题"
          />
          <div class="note-meta-line">
            <span>创建：${state.createdLabel}</span>
            <span>更新：${state.updatedLabel}</span>
            <span>字数：${state.wordCount}</span>
          </div>
          <textarea
            id="note-body-input"
            class="note-editor-area"
            placeholder="# 记录灵感..."
          >${this.escapeHtml(note.content)}</textarea>
        </div>
        ${state.showPreview ? this.renderPreviewPane(preview) : ''}
      </section>
    `;
  }

  private renderPreviewPane(preview: string): string {
    return `
      <div class="note-pane note-pane-preview">
        <div class="note-preview" data-note-preview>${preview}</div>
      </div>
    `;
  }

  private bindNoteInputs(state: NoteEditorViewState): void {
    if (!state.note || !this.host) return;
    const noteId = state.note.id;
    const titleInput = this.host.querySelector<HTMLInputElement>('#note-title-input');
    const bodyInput = this.host.querySelector<HTMLTextAreaElement>('#note-body-input');
    if (titleInput) {
      titleInput.addEventListener('compositionstart', () => {
        this.composingField = { field: 'title', noteId };
      });
      titleInput.addEventListener('compositionend', () => {
        this.composingField = null;
        this.captureFocus('title', titleInput, noteId);
        this.viewModel.rename(noteId, titleInput.value);
      });
      titleInput.addEventListener('input', (event) => {
        if (this.shouldDeferInput(event as InputEvent, 'title', noteId)) {
          return;
        }
        const value = (event.target as HTMLInputElement).value;
        this.captureFocus('title', titleInput, noteId);
        this.viewModel.rename(noteId, value);
      });
    }
    if (bodyInput) {
      bodyInput.addEventListener('compositionstart', () => {
        this.composingField = { field: 'body', noteId };
      });
      bodyInput.addEventListener('compositionend', () => {
        this.composingField = null;
        this.captureFocus('body', bodyInput, noteId);
        this.viewModel.updateContent(noteId, bodyInput.value);
      });
      bodyInput.addEventListener('input', (event) => {
        if (this.shouldDeferInput(event as InputEvent, 'body', noteId)) {
          return;
        }
        const value = (event.target as HTMLTextAreaElement).value;
        this.captureFocus('body', bodyInput, noteId);
        this.viewModel.updateContent(noteId, value);
      });
    }
  }

  private captureFocus(
    field: 'title' | 'body',
    element: HTMLInputElement | HTMLTextAreaElement,
    noteId: string
  ): void {
    const selectionStart = element.selectionStart ?? element.value.length;
    const selectionEnd = element.selectionEnd ?? element.value.length;
    this.pendingFocus = { field, noteId, selectionStart, selectionEnd };
  }

  private restoreFocus(noteId: string): void {
    if (!this.pendingFocus || this.pendingFocus.noteId !== noteId || !this.host) {
      if (this.pendingFocus && this.pendingFocus.noteId !== noteId) {
        this.pendingFocus = null;
      }
      return;
    }
    const selector =
      this.pendingFocus.field === 'title' ? '#note-title-input' : '#note-body-input';
    const element = this.host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
    if (!element) return;
    element.focus();
    if (typeof element.setSelectionRange === 'function') {
      element.setSelectionRange(this.pendingFocus.selectionStart, this.pendingFocus.selectionEnd);
    }
    this.pendingFocus = null;
  }

  private shouldDeferInput(
    event: InputEvent,
    field: 'title' | 'body',
    noteId: string
  ): boolean {
    if (event.isComposing) {
      return true;
    }
    if (this.composingField && this.composingField.field === field && this.composingField.noteId === noteId) {
      return true;
    }
    return false;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

const resolveNoteFromActiveTab: NoteResolver = (snapshot: ViewSnapshot): KnowledgeNote | null => {
  const activeTab = snapshot.tabs.find((tab) => tab.id === snapshot.activeTabId);
  if (!activeTab || activeTab.view !== 'noteEditor') {
    return null;
  }
  const noteId = activeTab.context?.noteId;
  if (!noteId) return null;
  return snapshot.notes.find((note) => note.id === noteId) ?? null;
};

export class NoteEditorModule implements UiModule {
  public readonly page: Page = 'noteEditor';
  private readonly viewModel: NoteEditorViewModel;
  private readonly view: NoteEditorView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new NoteEditorViewModel(root, { resolveNote: resolveNoteFromActiveTab });
    this.view = new NoteEditorView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
