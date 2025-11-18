/**
 * Provides a reusable context menu that can be triggered via right-click
 * or standard button interactions across modules.
 *
 * Usage:
 * ```ts
 * const menu = ContextMenu.shared();
 * menu.open({ x: event.clientX, y: event.clientY }, [
 *   { label: 'Rename', action: () => rename() },
 *   { label: 'Delete', action: () => remove(), danger: true },
 * ]);
 * ```
 */


export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export class ContextMenu {
  private static instance: ContextMenu | null = null;
  private readonly element: HTMLDivElement;
  private items: ContextMenuItem[] = [];
  private isVisible = false;

  private constructor() {
    this.element = document.createElement('div');
    this.element.className = 'context-menu';
    this.element.setAttribute('role', 'menu');
    this.element.tabIndex = -1;
    this.element.hidden = true;
    document.body.appendChild(this.element);
    this.element.addEventListener('click', (event) => this.handleItemClick(event));
    document.addEventListener('click', () => this.close());
    document.addEventListener('contextmenu', () => this.close());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });
    window.addEventListener('resize', () => this.close());
    window.addEventListener('scroll', () => this.close(), true);
  }

  public static shared(): ContextMenu {
    if (!ContextMenu.instance) {
      ContextMenu.instance = new ContextMenu();
    }
    return ContextMenu.instance;
  }

  public open(position: ContextMenuPosition, items: ContextMenuItem[]): void {
    if (!items.length) {
      this.close();
      return;
    }
    this.items = items;
    this.element.innerHTML = items
      .map(
        (item, index) => `
          <button
            type="button"
            class="context-menu-item${item.danger ? ' danger' : ''}"
            data-menu-index="${index}"
            role="menuitem"
            ${item.disabled ? 'disabled' : ''}
          >
            ${item.label}
          </button>`
      )
      .join('');
    this.positionMenu(position);
    this.element.hidden = false;
    window.requestAnimationFrame(() => {
      this.element.classList.add('is-visible');
      this.element.focus();
      this.isVisible = true;
    });
  }

  public close(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.element.classList.remove('is-visible');
    this.element.hidden = true;
    this.items = [];
  }

  private handleItemClick(event: MouseEvent): void {
    const target = event.target as HTMLButtonElement | null;
    if (!target) return;
    const index = Number(target.dataset.menuIndex);
    const item = this.items[index];
    if (!item || item.disabled) return;
    event.preventDefault();
    this.close();
    item.action();
  }

  private positionMenu(position: ContextMenuPosition): void {
    const { innerWidth, innerHeight } = window;
    this.element.style.visibility = 'hidden';
    this.element.style.left = '0px';
    this.element.style.top = '0px';
    this.element.hidden = false;
    const { offsetWidth, offsetHeight } = this.element;
    let left = position.x;
    let top = position.y;
    if (left + offsetWidth > innerWidth) {
      left = innerWidth - offsetWidth - 8;
    }
    if (top + offsetHeight > innerHeight) {
      top = innerHeight - offsetHeight - 8;
    }
    this.element.style.left = `${Math.max(0, left)}px`;
    this.element.style.top = `${Math.max(0, top)}px`;
    this.element.style.visibility = 'visible';
  }
}

