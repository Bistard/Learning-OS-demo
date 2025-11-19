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
  private selectionController: RectangleSelectionController | null = null;
  private readonly selectionMenuGroups = [
    {
      label: '解释类',
      actions: ['这段什么意思？', '能不能讲简单点？', '换一种讲法？', '拆一下步骤'],
    },
    {
      label: '示例类',
      actions: ['举几个例子', '给我一个生活中的例子？'],
    },
    {
      label: '复习类',
      actions: ['这是期末常考的吗？', '我剩 4 小时，这个要不要看？', '能不能 30 秒讲完重点？'],
    },
    {
      label: '关联类',
      actions: ['帮我找相关内容', '这和上一页的定义有什么关系？'],
    },
    {
      label: '笔记/知识库相关',
      actions: ['加入知识库', '转成精华笔记', '加入错题本'],
    },
    {
      label: '练习类',
      actions: ['出几道小题练练', '这能不能出一道期末大题？'],
    },
    {
      label: '实用工具',
      actions: ['复制文字', '翻译一下'],
    },
  ] as const;

  constructor(private readonly viewModel: LearningWorkspaceViewModel) {}

  public render(state: LearningWorkspaceViewState, regions: RenderRegions): HTMLElement | null {
    if (!state.asset) {
      this.selectionController?.dispose();
      this.selectionController = null;
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
      this.initSelectionController(this.host);
    }
    return regions.content.querySelector<HTMLElement>('[data-note-panel-body]');
  }

  private initSelectionController(scope: HTMLElement): void {
    const stage = scope.querySelector<HTMLElement>('[data-selection-stage]');
    const surface = scope.querySelector<HTMLElement>('[data-selection-surface]');
    const toggle = scope.querySelector<HTMLButtonElement>('[data-selection-toggle]');
    const region = scope.querySelector<HTMLElement>('[data-selection-region]');
    const menu = scope.querySelector<HTMLElement>('[data-selection-menu]');
    this.selectionController?.dispose();
    this.selectionController = null;
    if (stage && surface && toggle && region && menu) {
      this.selectionController = new RectangleSelectionController({
        stage,
        surface,
        toggle,
        region,
        menu,
      });
    }
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
          <div class="note-reader-tools">
            <button
              class="btn ghost slim selection-toggle"
              data-selection-toggle
              type="button"
              aria-pressed="false"
            >
              <span class="selection-toggle-dot" aria-hidden="true"></span>
              <span>自由选框模式</span>
              <span class="selection-toggle-hint">Alt</span>
            </button>
            <span class="selection-toggle-helper"
              >按住 Alt 或点击按钮即可框选内容，点击空白处退出</span
            >
          </div>
          <div class="reader-selection-stage" data-selection-stage>
            <div class="note-reader-preview" data-selection-surface>
              ${preview}
            </div>
            <div class="selection-region" data-selection-region hidden></div>
            <div class="selection-menu" data-selection-menu hidden>
              ${this.renderSelectionMenu()}
            </div>
          </div>
        </article>
        <div class="note-reader-actions">
          <button class="btn primary" id="workspace-back" type="button">返回任务树</button>
        </div>
      </section>
    `;
  }

  private renderSelectionMenu(): string {
    return `
      <p class="selection-menu-title">我想问老师：</p>
      <div class="selection-menu-groups">
        ${this.selectionMenuGroups
          .map(
            (group) => `
              <section class="selection-menu-group">
                <p class="selection-menu-label">${group.label}</p>
                ${group.actions
                  .map(
                    (action) =>
                      `<button type="button" class="selection-menu-action" data-selection-action>${action}</button>`
                  )
                  .join('')}
              </section>
            `
          )
          .join('')}
      </div>
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

interface RectangleSelectionElements {
  stage: HTMLElement;
  surface: HTMLElement;
  toggle: HTMLButtonElement;
  region: HTMLElement;
  menu: HTMLElement;
}

type SelectionPoint = { x: number; y: number };
type SelectionBox = { left: number; top: number; width: number; height: number };

class RectangleSelectionController {
  private readonly stage: HTMLElement;
  private readonly surface: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly region: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly MIN_BOX_SIZE = 18;
  private isLocked = false;
  private altActive = false;
  private isPointerSelecting = false;
  private pointerId: number | null = null;
  private startPoint: SelectionPoint | null = null;
  private box: SelectionBox | null = null;

  constructor(elements: RectangleSelectionElements) {
    this.stage = elements.stage;
    this.surface = elements.surface;
    this.toggle = elements.toggle;
    this.region = elements.region;
    this.menu = elements.menu;
    this.toggle.setAttribute('aria-pressed', 'false');
    this.menu.hidden = true;
    this.region.hidden = true;
    this.bind();
  }

  public dispose(): void {
    this.surface.removeEventListener('pointerdown', this.handlePointerDown);
    this.toggle.removeEventListener('click', this.handleToggleClick);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('pointerdown', this.handleOutsidePointer, true);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
  }

  private bind(): void {
    this.surface.addEventListener('pointerdown', this.handlePointerDown);
    this.toggle.addEventListener('click', this.handleToggleClick);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('pointerdown', this.handleOutsidePointer, true);
  }

  private handleToggleClick = (event: MouseEvent): void => {
    event.preventDefault();
    this.isLocked = !this.isLocked;
    if (!this.isLocked) {
      this.clearSelection();
    }
    this.updateModeState();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Alt') return;
    if (this.altActive) return;
    this.altActive = true;
    this.updateModeState();
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Alt') return;
    if (!this.altActive) return;
    this.altActive = false;
    this.updateModeState();
  };

  private handleWindowBlur = (): void => {
    this.altActive = false;
    this.updateModeState();
  };

  private handleOutsidePointer = (event: PointerEvent): void => {
    if (this.isPointerSelecting) return;
    if (!this.isLocked && !this.box) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (this.stage.contains(target) || this.toggle.contains(target)) {
      return;
    }
    const hadLock = this.isLocked;
    const hadSelection = Boolean(this.box);
    if (hadSelection) {
      this.clearSelection();
    }
    this.isLocked = false;
    if (hadLock || hadSelection) {
      this.updateModeState();
    }
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    if (!this.canDraw()) {
      return;
    }
    event.preventDefault();
    this.clearSelection();
    this.isPointerSelecting = true;
    this.pointerId = event.pointerId;
    this.startPoint = this.translateToStage(event);
    this.menu.hidden = true;
    this.region.hidden = false;
    this.applyBox(this.startPoint);
    this.updateModeState();
    try {
      this.surface.setPointerCapture(event.pointerId);
    } catch {
      // ignore capture errors (e.g., Safari)
    }
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isPointerSelecting || event.pointerId !== this.pointerId) {
      return;
    }
    event.preventDefault();
    const point = this.translateToStage(event);
    this.applyBox(point);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.isPointerSelecting || event.pointerId !== this.pointerId) {
      return;
    }
    this.isPointerSelecting = false;
    this.pointerId = null;
    try {
      this.surface.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    if (!this.box || this.box.width < this.MIN_BOX_SIZE || this.box.height < this.MIN_BOX_SIZE) {
      this.clearSelection();
    } else {
      this.positionMenu();
    }
    this.updateModeState();
  };

  private translateToStage(event: PointerEvent): SelectionPoint {
    const rect = this.stage.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    return { x, y };
  }

  private applyBox(point: SelectionPoint): void {
    if (!this.startPoint) {
      return;
    }
    const left = Math.min(this.startPoint.x, point.x);
    const top = Math.min(this.startPoint.y, point.y);
    const width = Math.abs(this.startPoint.x - point.x);
    const height = Math.abs(this.startPoint.y - point.y);
    this.box = { left, top, width, height };
    this.region.hidden = false;
    this.region.style.left = `${left}px`;
    this.region.style.top = `${top}px`;
    this.region.style.width = `${width}px`;
    this.region.style.height = `${height}px`;
    this.stage.classList.add('selection-has-box');
  }

  private positionMenu(): void {
    if (!this.box) return;
    this.menu.hidden = false;
    this.menu.style.visibility = 'hidden';
    this.menu.style.left = '0px';
    this.menu.style.top = '0px';
    const menuWidth = this.menu.offsetWidth;
    const menuHeight = this.menu.offsetHeight;
    const stageWidth = this.stage.clientWidth;
    const stageHeight = this.stage.clientHeight;
    let left = this.box.left + this.box.width + 12;
    if (left + menuWidth > stageWidth) {
      left = Math.max(8, stageWidth - menuWidth - 8);
    }
    let top = this.box.top - menuHeight - 12;
    if (top < 0) {
      top = this.box.top + this.box.height + 12;
      if (top + menuHeight > stageHeight) {
        top = Math.max(8, stageHeight - menuHeight - 8);
      }
    }
    this.menu.style.left = `${left}px`;
    this.menu.style.top = `${top}px`;
    this.menu.style.visibility = 'visible';
  }

  private canDraw(): boolean {
    return this.isLocked || this.altActive;
  }

  private clearSelection(): void {
    this.box = null;
    this.startPoint = null;
    this.region.hidden = true;
    this.menu.hidden = true;
    this.menu.style.visibility = '';
    this.menu.style.left = '0px';
    this.menu.style.top = '0px';
    this.region.style.left = '0px';
    this.region.style.top = '0px';
    this.region.style.width = '0px';
    this.region.style.height = '0px';
    this.stage.classList.remove('selection-has-box');
  }

  private updateModeState(): void {
    const ready = this.canDraw() || this.isPointerSelecting;
    this.stage.classList.toggle('selection-mode-ready', ready);
    this.stage.classList.toggle('selection-dragging', this.isPointerSelecting);
    this.toggle.classList.toggle('is-active', this.isLocked);
    this.toggle.classList.toggle('is-alt', !this.isLocked && this.altActive);
    this.toggle.setAttribute('aria-pressed', String(this.isLocked));
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
