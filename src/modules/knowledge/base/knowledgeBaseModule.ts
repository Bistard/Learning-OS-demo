/**
 * Knowledge base module renders draggable categories and items that mirror the
 * product spec for flashcards, mistakes, AI chats, links, uploads, and notes.
 *
 * Usage:
 * ```ts
 * const module = new KnowledgeBaseModule(viewModel);
 * module.render(snapshot, regions);
 * ```
 */

import { KnowledgeCategory, Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { RenderRegions, UiModule } from '../../types';
import { ContextMenu, ContextMenuItem } from '../../../utils/contextMenu';

const CATEGORY_TAIL_DROP_ID = '__category-tail__';

interface KnowledgeBaseViewState {
  categories: KnowledgeCategory[];
  activeGoalName: string;
  editingCategoryId: string | null;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

class KnowledgeBaseViewModel {
  private editingCategoryId: string | null = null;
  private draggingCategoryId: string | null = null;
  private draggingItemId: string | null = null;
  private lastCategoryOrder: string[] = [];

  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): KnowledgeBaseViewState {
    this.lastCategoryOrder = snapshot.knowledgeBase.categories.map((category) => category.id);
    return {
      categories: snapshot.knowledgeBase.categories,
      activeGoalName: snapshot.activeGoal?.name ?? '未绑定目标',
      editingCategoryId: this.editingCategoryId,
    };
  }

  public addCategory(label: string): void {
    this.root.addKnowledgeCategory(label);
  }

  public startRename(categoryId: string): void {
    this.editingCategoryId = categoryId;
  }

  public cancelRename(): void {
    this.editingCategoryId = null;
  }

  public renameCategory(categoryId: string, title: string): void {
    this.root.renameKnowledgeCategory(categoryId, title);
    this.editingCategoryId = null;
  }

  public deleteCategory(categoryId: string): void {
    if (this.editingCategoryId === categoryId) {
      this.editingCategoryId = null;
    }
    this.root.deleteKnowledgeCategory(categoryId);
  }

  public beginCategoryDrag(categoryId: string): void {
    this.draggingCategoryId = categoryId;
  }

  public dropCategory(targetId: string): void {
    if (!this.draggingCategoryId) return;
    if (this.draggingCategoryId === targetId) {
      this.draggingCategoryId = null;
      return;
    }
    const order = [...this.lastCategoryOrder];
    const fromIndex = order.indexOf(this.draggingCategoryId);
    if (fromIndex === -1) {
      this.draggingCategoryId = null;
      return;
    }
    order.splice(fromIndex, 1);
    if (targetId === CATEGORY_TAIL_DROP_ID) {
      order.push(this.draggingCategoryId);
    } else {
      const toIndex = order.indexOf(targetId);
      if (toIndex === -1) {
        this.draggingCategoryId = null;
        return;
      }
      order.splice(toIndex, 0, this.draggingCategoryId);
    }
    this.root.reorderKnowledgeCategories(order);
    this.draggingCategoryId = null;
  }

  public cancelCategoryDrag(): void {
    this.draggingCategoryId = null;
  }

  public beginItemDrag(itemId: string): void {
    this.draggingItemId = itemId;
  }

  public dropItem(targetCategoryId: string, targetIndex: number): void {
    if (!this.draggingItemId) return;
    this.root.moveKnowledgeItem(this.draggingItemId, targetCategoryId, targetIndex);
    this.draggingItemId = null;
  }

  public cancelItemDrag(): void {
    this.draggingItemId = null;
  }

  public hasActiveCategoryDrag(): boolean {
    return this.draggingCategoryId !== null;
  }

  public hasActiveItemDrag(): boolean {
    return this.draggingItemId !== null;
  }
}

class KnowledgeBaseView {
  private host: HTMLElement | null = null;
  private readonly contextMenu = ContextMenu.shared();
  private categoryInputPopover: HTMLDivElement | null = null;
  private categoryInputField: HTMLInputElement | null = null;
  private teardownCategoryInput: (() => void) | null = null;

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
          <div>
            <p class="eyebrow">绑定目标</p>
            <h3>${escapeHtml(state.activeGoalName)} · 自动沉淀分类</h3>
            <p class="microcopy">拖拽左侧把手即可排序，未分类用于临时内容。</p>
          </div>
          <button class="btn primary" id="kb-add-category-btn" type="button">新建分类</button>
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
    return `
      <article class="kb-category" data-category-id="${category.id}">
        <header class="kb-category-head">
          <div>
            ${titleMarkup}
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
      .map(
        (item, index) => `
        <div
          class="kb-item"
          draggable="true"
          data-item-id="${item.id}"
          data-item-index="${index}"
          data-category-item="${category.id}"
          title="${escapeHtml(item.detail)}"
          role="button"
          tabindex="0"
        >
          <p class="kb-item-title">${escapeHtml(item.summary)}</p>
          <span class="kb-item-meta">
            ${escapeHtml(item.source)} · ${escapeHtml(item.updatedAt)}
          </span>
        </div>`
      )
      .join('');
  }

  private bindInteractions(state: KnowledgeBaseViewState): void {
    if (!this.host) return;
    this.bindAddCategory();
    this.bindRenameForms();
    this.bindCategoryDrag();
    this.bindItemDrag();
    this.bindCategoryMenus(state);
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
      <input
        type="text"
        maxlength="24"
        placeholder="输入分类名称后按 Enter"
        aria-label="输入分类名称"
      />
    `;
    document.body.appendChild(container);
    this.categoryInputPopover = container;
    this.categoryInputField = container.querySelector('input');
  }

  private openCategoryInput(anchor: HTMLElement): void {
    this.ensureCategoryInput();
    if (!this.categoryInputPopover || !this.categoryInputField) return;
    const container = this.categoryInputPopover;
    const input = this.categoryInputField;
    this.closeCategoryInput();
    container.hidden = false;
    container.style.visibility = 'hidden';
    const rect = anchor.getBoundingClientRect();
    const maxLeft = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - container.offsetWidth - 12)
    );
    container.style.left = `${maxLeft}px`;
    container.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 60)}px`;
    container.style.visibility = 'visible';
    input.value = '';
    input.focus();
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = input.value;
        this.viewModel.addCategory(value);
        if (value.trim()) {
          this.closeCategoryInput();
        } else {
          input.focus();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.closeCategoryInput();
      }
    };
    const handleBlur = (): void => {
      window.setTimeout(() => this.closeCategoryInput(), 80);
    };
    input.addEventListener('keydown', handleKey);
    input.addEventListener('blur', handleBlur);
    this.teardownCategoryInput = () => {
      input.removeEventListener('keydown', handleKey);
      input.removeEventListener('blur', handleBlur);
    };
  }

  private closeCategoryInput(): void {
    if (!this.categoryInputPopover || !this.categoryInputField) return;
    if (this.teardownCategoryInput) {
      this.teardownCategoryInput();
      this.teardownCategoryInput = null;
    }
    this.categoryInputField.value = '';
    this.categoryInputPopover.hidden = true;
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
}

export class KnowledgeBaseModule implements UiModule {
  public readonly page: Page = 'knowledgeBase';
  private readonly viewModel: KnowledgeBaseViewModel;
  private readonly view: KnowledgeBaseView;
  private lastSnapshot: ViewSnapshot | null = null;
  private regions: RenderRegions | null = null;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new KnowledgeBaseViewModel(root);
    this.view = new KnowledgeBaseView(this.viewModel, () => this.repaint());
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.lastSnapshot = snapshot;
    this.regions = regions;
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }

  private repaint(): void {
    if (!this.lastSnapshot || !this.regions) return;
    const state = this.viewModel.buildState(this.lastSnapshot);
    this.view.render(state, this.regions);
  }
}
