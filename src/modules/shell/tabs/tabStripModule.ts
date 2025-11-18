/**
 * Tab strip module renders and orchestrates the left-rail tab system.
 *
 * Usage:
 * ```ts
 * const tabs = new TabStripModule(viewModel);
 * tabs.render(snapshot, hostElement);
 * ```
 */

import {
  AppTab,
  LearningOsViewModel,
  ViewSnapshot,
} from '../../../viewModels/learningOsViewModel';
import { ContextMenu, ContextMenuItem } from '../../../utils/contextMenu';

export class TabStripModule {
  private host: HTMLElement | null = null;
  private readonly contextMenu = ContextMenu.shared();
  private draggingTabId: string | null = null;

  constructor(private readonly viewModel: LearningOsViewModel) {}

  public render(snapshot: ViewSnapshot, host: HTMLElement): void {
    this.host = host;
    host.innerHTML = this.buildMarkup(snapshot.tabs, snapshot.activeTabId);
    this.bindInteractions(snapshot);
  }

  private buildMarkup(tabs: AppTab[], activeTabId: string | null): string {
    const items = tabs
      .map((tab) => {
        const active = tab.id === activeTabId;
        const classes = ['tab-chip'];
        if (active) classes.push('active');
        if (tab.pinned) classes.push('pinned');
        return `
          <button
            type="button"
            class="${classes.join(' ')}"
            data-tab-id="${tab.id}"
            role="tab"
            aria-selected="${active}"
            draggable="true"
            title="${this.escapeHtml(tab.title)}"
          >
            <span class="tab-chip-icon" aria-hidden="true">${tab.icon ?? '•'}</span>
            <span class="tab-chip-title">${tab.title}</span>
            ${
              tab.pinned
                ? '<span class="tab-chip-pin" aria-hidden="true">📌</span>'
                : '<button type="button" class="tab-chip-close" aria-label="关闭标签" data-tab-close>&times;</button>'
            }
          </button>
        `;
      })
      .join('');
    return `
      <div class="tab-strip" role="tablist">
        ${items}
        <div class="tab-strip-tail" data-tab-tail></div>
      </div>
    `;
  }

  private bindInteractions(snapshot: ViewSnapshot): void {
    if (!this.host) return;
    this.host.querySelectorAll<HTMLElement>('[data-tab-id]').forEach((element) => {
      const tabId = element.dataset.tabId;
      const tab = snapshot.tabs.find((candidate) => candidate.id === tabId);
      if (!tab) return;
      this.bindTabEvents(element, tab, snapshot);
    });
    const tail = this.host.querySelector<HTMLElement>('[data-tab-tail]');
    if (tail) {
      tail.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
        tail.classList.add('is-drop-target');
      });
      tail.addEventListener('dragleave', () => tail.classList.remove('is-drop-target'));
      tail.addEventListener('drop', (event) => {
        event.preventDefault();
        tail.classList.remove('is-drop-target');
        const lastTabId = snapshot.tabs[snapshot.tabs.length - 1]?.id;
        if (!this.draggingTabId || this.draggingTabId === lastTabId) return;
        const order = snapshot.tabs.map((tab) => tab.id).filter((id) => id !== this.draggingTabId);
        order.push(this.draggingTabId);
        this.viewModel.reorderTabs(order);
      });
    }
  }

  private bindTabEvents(element: HTMLElement, tab: AppTab, snapshot: ViewSnapshot): void {
    element.addEventListener('click', () => this.viewModel.activateTab(tab.id));
    element.addEventListener('auxclick', (event) => {
      if (event.button === 1) {
        event.preventDefault();
        this.viewModel.closeTab(tab.id);
      }
    });
    element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.openContextMenu(tab, event);
    });
    const closeButton = element.querySelector<HTMLButtonElement>('[data-tab-close]');
    closeButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.viewModel.closeTab(tab.id);
    });
    element.addEventListener('dragstart', (event) => {
      this.draggingTabId = tab.id;
      element.classList.add('is-dragging');
      event.dataTransfer?.setData('text/plain', tab.id);
      event.dataTransfer?.setDragImage(element, 24, 12);
    });
    element.addEventListener('dragend', () => {
      this.draggingTabId = null;
      element.classList.remove('is-dragging');
      element.classList.remove('is-drop-target');
    });
    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      element.classList.add('is-drop-target');
    });
    element.addEventListener('dragleave', () => element.classList.remove('is-drop-target'));
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      element.classList.remove('is-drop-target');
      this.handleDrop(event, element, tab, snapshot);
    });
  }

  private handleDrop(
    event: DragEvent,
    element: HTMLElement,
    targetTab: AppTab,
    snapshot: ViewSnapshot
  ): void {
    if (!this.draggingTabId || this.draggingTabId === targetTab.id) return;
    const order = snapshot.tabs.map((tab) => tab.id);
    const fromIndex = order.indexOf(this.draggingTabId);
    const toIndex = order.indexOf(targetTab.id);
    if (fromIndex === -1 || toIndex === -1) return;
    order.splice(fromIndex, 1);
    const rect = element.getBoundingClientRect();
    const insertAfter = (event.clientX - rect.left) / rect.width > 0.5;
    const insertionIndex = order.indexOf(targetTab.id) + (insertAfter ? 1 : 0);
    order.splice(insertionIndex, 0, this.draggingTabId);
    this.viewModel.reorderTabs(order);
  }

  private openContextMenu(tab: AppTab, event: MouseEvent): void {
    const items: ContextMenuItem[] = [
      {
        label: '关闭当前',
        disabled: !tab.closable,
        action: () => this.viewModel.closeTab(tab.id),
      },
      {
        label: '全部关闭',
        action: () => this.viewModel.closeAllTabs(),
      },
      {
        label: '重新加载',
        action: () => this.viewModel.reloadTab(tab.id),
      },
      {
        label: tab.pinned ? '取消固定' : '固定',
        action: () => this.viewModel.toggleTabPin(tab.id, !tab.pinned),
      },
    ];
    this.contextMenu.open({ x: event.clientX, y: event.clientY }, items);
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
