import { KnowledgeCategory } from '../../../models/learningOsModel';
import { RenderRegions } from '../../types';
import { ContextMenu, ContextMenuItem } from '../../../utils/contextMenu';
import { KnowledgeBaseViewModel } from './knowledgeBaseViewModel';
import { KnowledgeBaseViewState, KnowledgeCategoryDraft } from './knowledgeBaseTypes';
import { CATEGORY_TAIL_DROP_ID, sanitizeHexColor, escapeHtml } from './knowledgeBaseUtils';

export class KnowledgeBaseView {
  private host: HTMLElement | null = null;
  private readonly contextMenu = ContextMenu.shared();
  private categoryInputPopover: HTMLDivElement | null = null;
  private categoryInputForm: HTMLFormElement | null = null;
  private categoryInputField: HTMLInputElement | null = null;
  private categoryIconInput: HTMLInputElement | null = null;
  private categoryColorInput: HTMLInputElement | null = null;
  private teardownCategoryInput: (() => void) | null = null;
  private readonly pendingHighlightIds = new Set<string>();

  constructor(
    private readonly viewModel: KnowledgeBaseViewModel,
    private readonly requestRepaint: () => void
  ) {}

  public render(state: KnowledgeBaseViewState, regions: RenderRegions): void {
    regions.content.innerHTML = this.renderLayout(state);
    this.host = regions.content;
    this.bindInteractions(state);
  }

  private renderLayout(state: KnowledgeBaseViewState): string {
    const categories = state.categories.map((category) => this.renderCategory(category, state));
    return `
      <section class="knowledge-base">
        <header class="kb-toolbar">
          <input type="file" id="kb-upload-input" hidden multiple />
          <div class="kb-toolbar-actions">
            <button class="btn ghost" id="kb-upload-btn" type="button">上传文件</button>
            <button class="btn primary" id="kb-add-category-btn" type="button">新建分类</button>
          </div>
        </header>
        <div class="kb-category-board">
          ${categories.join('')}
          <div class="kb-category-dropzone" data-category-drop="tail" aria-label="移动到最后">
            拖拽到此放在末尾
          </div>
        </div>
      </section>
    `;
  }

  private renderCategory(category: KnowledgeCategory, state: KnowledgeBaseViewState): string {
    const editing = state.editingCategoryId === category.id;
    const titleMarkup = editing
      ? `
        <form class="kb-rename-form" data-rename-form="${category.id}">
          <input
            type="text"
            name="title"
            data-rename-input="${category.id}"
            value="${escapeHtml(category.title)}"
            maxlength="24"
            required
          />
          <div class="kb-rename-actions">
            <button class="btn primary" type="submit">保存</button>
            <button class="btn ghost" type="button" data-action="cancel-rename">取消</button>
          </div>
        </form>`
      : `<h4>${escapeHtml(category.title)}</h4>`;
    const accent = sanitizeHexColor(category.color);
    const icon = category.icon?.trim() || '📁';
    return `
      <article class="kb-category" data-category-id="${category.id}" style="--kb-accent:${accent}">
        <header class="kb-category-head">
          <div class="kb-category-info">
            <div class="kb-category-title">
              <span class="kb-category-icon" aria-hidden="true">${escapeHtml(icon)}</span>
              ${titleMarkup}
            </div>
            <p class="microcopy">${category.items.length} 条内容</p>
          </div>
          <div class="kb-category-actions">
            <button
              class="kb-icon-btn handle"
              type="button"
              data-category-menu="${category.id}"
              data-category-id="${category.id}"
              draggable="true"
              aria-haspopup="menu"
              aria-label="更多操作"
            >
              ⋮
            </button>
          </div>
        </header>
        <div class="kb-items" data-category-items="${category.id}">
          ${this.renderItems(category)}
        </div>
      </article>
    `;
  }

  private renderItems(category: KnowledgeCategory): string {
    if (category.items.length === 0) {
      return `<p class="kb-empty">暂无内容，新的知识点会自动沉淀。</p>`;
    }
    return category.items
      .map((item, index) => {
        const noteAttr = item.noteId ? ` data-note-id="${item.noteId}"` : '';
        return `
        <div
          class="kb-item"
          draggable="true"
          data-item-id="${item.id}"
          data-item-index="${index}"
          data-category-item="${category.id}"
          ${noteAttr}
          title="${escapeHtml(item.detail)}"
          role="button"
          tabindex="0"
        >
          <div class="kb-item-row">
            <p class="kb-item-title">${escapeHtml(item.summary)}</p>
            <span class="kb-item-meta">
              ${escapeHtml(item.updatedAt)}
            </span>
          </div>
        </div>`
      })
      .join('');
  }

  private bindInteractions(state: KnowledgeBaseViewState): void {
    if (!this.host) return;
    this.bindAddCategory();
    this.bindUploadAction();
    this.bindRenameForms();
    this.bindCategoryDrag();
    this.bindItemDrag();
    this.bindCategoryMenus(state);
    this.bindNoteShortcuts();
    this.applyHighlights();
  }

  private bindAddCategory(): void {
    if (!this.host) return;
    const button = this.host.querySelector<HTMLButtonElement>('#kb-add-category-btn');
    button?.addEventListener('click', () => {
      if (button) {
        this.openCategoryInput(button);
      }
    });
  }

  private bindUploadAction(): void {
    if (!this.host) return;
    const uploadButton = this.host.querySelector<HTMLButtonElement>('#kb-upload-btn');
    const uploadInput = this.host.querySelector<HTMLInputElement>('#kb-upload-input');
    if (!uploadButton || !uploadInput) return;
    uploadButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => {
      if (!uploadInput.files || uploadInput.files.length === 0) return;
      Array.from(uploadInput.files).forEach((file) => {
        const itemId = this.viewModel.recordUpload(file.name);
        this.pendingHighlightIds.add(itemId);
      });
      uploadInput.value = '';
      this.applyHighlights();
    });
  }

  private bindRenameForms(): void {
    if (!this.host) return;
    this.host.querySelectorAll<HTMLButtonElement>('[data-action="cancel-rename"]').forEach((button) =>
      button.addEventListener('click', () => {
        this.viewModel.cancelRename();
        this.requestRepaint();
      })
    );
    this.host.querySelectorAll<HTMLFormElement>('[data-rename-form]').forEach((form) =>
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const categoryId = form.dataset.renameForm;
        if (!categoryId) return;
        const input = form.querySelector<HTMLInputElement>('input[name="title"]');
        this.viewModel.renameCategory(categoryId, input?.value ?? '');
        this.requestRepaint();
      })
    );
  }

  private bindCategoryDrag(): void {
    if (!this.host) return;
    this.host.querySelectorAll<HTMLButtonElement>('[data-category-menu]').forEach((handle) =>
      handle.addEventListener('dragstart', (event) => {
        const categoryId = handle.dataset.categoryId ?? handle.dataset.categoryMenu;
        if (!categoryId) return;
        this.viewModel.beginCategoryDrag(categoryId);
        event.dataTransfer?.setData('text/plain', categoryId);
        event.dataTransfer?.setDragImage(handle, 0, 0);
        event.dataTransfer && (event.dataTransfer.effectAllowed = 'move');
      })
    );
    this.host.querySelectorAll<HTMLElement>('[data-category-id]').forEach((card) => {
      card.addEventListener('dragover', (event) => {
        if (!this.viewModel.hasActiveCategoryDrag()) return;
        event.preventDefault();
        event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
        card.classList.add('is-drop-target');
      });
      card.addEventListener('dragleave', (event) => {
        if (!(event.relatedTarget as HTMLElement)?.closest('[data-category-id]')) {
          card.classList.remove('is-drop-target');
        }
      });
      card.addEventListener('drop', (event) => {
        if (!this.viewModel.hasActiveCategoryDrag()) return;
        event.preventDefault();
        card.classList.remove('is-drop-target');
        const targetId = card.dataset.categoryId;
        if (!targetId) return;
        this.viewModel.dropCategory(targetId);
      });
    });
    const tail = this.host.querySelector<HTMLElement>('[data-category-drop="tail"]');
    tail?.addEventListener('dragover', (event) => {
      if (!this.viewModel.hasActiveCategoryDrag()) return;
      event.preventDefault();
      tail.classList.add('is-drop-target');
    });
    tail?.addEventListener('dragleave', () => tail.classList.remove('is-drop-target'));
    tail?.addEventListener('drop', (event) => {
      if (!this.viewModel.hasActiveCategoryDrag()) return;
      event.preventDefault();
      tail.classList.remove('is-drop-target');
      this.viewModel.dropCategory(CATEGORY_TAIL_DROP_ID);
    });
    this.host.addEventListener('dragend', () => {
      this.viewModel.cancelCategoryDrag();
      this.host?.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    });
  }

  private bindItemDrag(): void {
    if (!this.host) return;
    this.host.querySelectorAll<HTMLElement>('[data-item-id]').forEach((item) => {
      item.addEventListener('dragstart', (event) => {
        const itemId = item.dataset.itemId;
        if (!itemId) return;
        this.viewModel.beginItemDrag(itemId);
        item.classList.add('is-dragging');
        event.dataTransfer?.setData('text/plain', itemId);
        event.dataTransfer && (event.dataTransfer.effectAllowed = 'move');
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('is-dragging');
        this.viewModel.cancelItemDrag();
      });
    });
    this.host.querySelectorAll<HTMLElement>('[data-category-items]').forEach((container) => {
      container.addEventListener('dragover', (event) => {
        if (!this.viewModel.hasActiveItemDrag()) return;
        event.preventDefault();
        event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
        container.classList.add('is-drop-target');
      });
      container.addEventListener('dragleave', (event) => {
        if (!(event.relatedTarget as HTMLElement)?.closest('[data-category-items]')) {
          container.classList.remove('is-drop-target');
        }
      });
      container.addEventListener('drop', (event) => {
        if (!this.viewModel.hasActiveItemDrag()) return;
        event.preventDefault();
        container.classList.remove('is-drop-target');
        const categoryId = container.dataset.categoryItems;
        if (!categoryId) return;
        const sibling = (event.target as HTMLElement).closest<HTMLElement>('[data-item-id]');
        let index = sibling ? Number(sibling.dataset.itemIndex) : container.querySelectorAll('[data-item-id]').length;
        if (Number.isNaN(index)) {
          index = container.querySelectorAll('[data-item-id]').length;
        }
        this.viewModel.dropItem(categoryId, index);
      });
    });
  }

  private bindCategoryMenus(state: KnowledgeBaseViewState): void {
    if (!this.host) return;
    const lookup = new Map(state.categories.map((category) => [category.id, category]));
    const shouldBypass = (event: MouseEvent): boolean =>
      Boolean((event.target as HTMLElement | null)?.closest('[data-rename-form]'));
    const openMenu = (category: KnowledgeCategory, event: MouseEvent): void => {
      if (shouldBypass(event)) return;
      event.preventDefault();
      event.stopPropagation();
      this.openCategoryMenu(category, { x: event.clientX, y: event.clientY });
    };
    this.host.querySelectorAll<HTMLElement>('[data-category-menu]').forEach((button) => {
      const category = lookup.get(button.dataset.categoryMenu ?? '');
      if (!category) return;
      button.addEventListener('click', (event) => openMenu(category, event));
      button.addEventListener('contextmenu', (event) => openMenu(category, event));
    });
    this.host.querySelectorAll<HTMLElement>('[data-category-id]').forEach((card) => {
      const category = lookup.get(card.dataset.categoryId ?? '');
      if (!category) return;
      card.addEventListener('contextmenu', (event) => openMenu(category, event));
    });
  }

  private bindNoteShortcuts(): void {
    if (!this.host) return;
    this.host.querySelectorAll<HTMLElement>('[data-note-id]').forEach((item) => {
      const noteId = item.dataset.noteId;
      if (!noteId) return;
      const open = (): void => this.viewModel.openNote(noteId);
      item.addEventListener('dblclick', (event) => {
        event.preventDefault();
        open();
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
  }

  private focusRenameInput(categoryId: string): void {
    if (!this.host) return;
    const input = this.host.querySelector<HTMLInputElement>(`[data-rename-input="${categoryId}"]`);
    input?.focus();
    input?.select();
  }

  private ensureCategoryInput(): void {
    if (this.categoryInputPopover) return;
    const container = document.createElement('div');
    container.className = 'kb-category-input';
    container.hidden = true;
    container.innerHTML = `
      <form class="kb-category-form">
        <div class="kb-category-input-row">
          <input
            type="text"
            name="icon"
            maxlength="2"
            value="✨"
            placeholder="Emoji"
            aria-label="分类图标"
          />
          <input
            type="color"
            name="color"
            value="#6366f1"
            aria-label="分类颜色"
          />
        </div>
        <input
          type="text"
          name="title"
          maxlength="24"
          placeholder="输入分类名称后按 Enter"
          aria-label="输入分类名称"
          required
        />
      </form>
    `;
    document.body.appendChild(container);
    this.categoryInputPopover = container;
    this.categoryInputForm = container.querySelector('form');
    this.categoryIconInput = container.querySelector('input[name="icon"]');
    this.categoryColorInput = container.querySelector('input[name="color"]');
    this.categoryInputField = container.querySelector('input[name="title"]');
    this.categoryInputForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submitCategoryInput();
    });
  }

  private openCategoryInput(anchor: HTMLElement): void {
    this.ensureCategoryInput();
    if (
      !this.categoryInputPopover ||
      !this.categoryInputField ||
      !this.categoryInputForm ||
      !this.categoryIconInput ||
      !this.categoryColorInput
    ) {
      return;
    }
    this.closeCategoryInput();
    const container = this.categoryInputPopover;
    container.hidden = false;
    container.style.visibility = 'hidden';
    const rect = anchor.getBoundingClientRect();
    const maxLeft = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - container.offsetWidth - 12)
    );
    container.style.left = `${maxLeft}px`;
    container.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 80)}px`;
    container.style.visibility = 'visible';
    this.categoryInputForm.reset();
    this.categoryIconInput.value = this.categoryIconInput.value || '✨';
    this.categoryColorInput.value = this.categoryColorInput.value || '#6366f1';
    this.categoryInputField.value = '';
    this.categoryInputField.focus();
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeCategoryInput();
      }
    };
    const handleClickOutside = (event: MouseEvent): void => {
      if (!this.categoryInputPopover?.contains(event.target as Node)) {
        this.closeCategoryInput();
      }
    };
    this.categoryInputForm.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    this.teardownCategoryInput = () => {
      this.categoryInputForm?.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }

  private closeCategoryInput(): void {
    if (!this.categoryInputPopover) return;
    if (this.teardownCategoryInput) {
      this.teardownCategoryInput();
      this.teardownCategoryInput = null;
    }
    this.categoryInputForm?.reset();
    this.categoryInputPopover.hidden = true;
  }

  private submitCategoryInput(): void {
    if (
      !this.categoryInputField ||
      !this.categoryIconInput ||
      !this.categoryColorInput
    ) {
      return;
    }
    const payload: KnowledgeCategoryDraft = {
      title: this.categoryInputField.value,
      icon: this.categoryIconInput.value,
      color: this.categoryColorInput.value,
    };
    this.viewModel.addCategory(payload);
    if (payload.title.trim()) {
      this.closeCategoryInput();
    } else {
      this.categoryInputField.focus();
    }
  }

  private openCategoryMenu(category: KnowledgeCategory, position: { x: number; y: number }): void {
    this.closeCategoryInput();
    const items: ContextMenuItem[] = [
      {
        label: '重命名',
        disabled: category.isFixed,
        action: () => this.triggerRename(category.id),
      },
      {
        label: '删除',
        disabled: category.isFixed,
        danger: true,
        action: () => this.confirmDelete(category),
      },
    ];
    this.contextMenu.open(position, items);
  }

  private triggerRename(categoryId: string): void {
    this.viewModel.startRename(categoryId);
    this.requestRepaint();
    window.requestAnimationFrame(() => this.focusRenameInput(categoryId));
  }

  private confirmDelete(category: KnowledgeCategory): void {
    if (category.isFixed) return;
    const confirmed = window.confirm('确定删除该分类？内容将移动到「未分类」。');
    if (confirmed) {
      this.viewModel.deleteCategory(category.id);
    }
  }

  private applyHighlights(): void {
    if (!this.host || this.pendingHighlightIds.size === 0) return;
    const ids = Array.from(this.pendingHighlightIds);
    ids.forEach((id) => {
      const element = this.host?.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
      if (element) {
        element.classList.add('highlight');
        window.setTimeout(() => element.classList.remove('highlight'), 1600);
        this.pendingHighlightIds.delete(id);
      }
    });
  }
}

