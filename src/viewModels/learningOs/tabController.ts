/**
 * Manages Learning OS shell tabs, enforcing pin order and tab identity rules.
 */
import { Page } from '../../models/learningOsModel';

export interface TabContext {
  goalId?: string;
  noteId?: string;
  [key: string]: string | undefined;
}

export interface AppTab {
  id: string;
  view: Page;
  identity: string;
  title: string;
  icon?: string;
  pinned: boolean;
  closable: boolean;
  reloadToken: number;
  context?: TabContext;
}

interface TabBlueprint {
  icon: string;
  pinned?: boolean;
}

export interface TabOpenOptions {
  identity?: string;
  title?: string;
  icon?: string;
  pinned?: boolean;
  closable?: boolean;
  context?: TabContext;
}

const TAB_ICON_FALLBACK = '📄';

const TAB_BLUEPRINTS: Record<Page, TabBlueprint> = {
  goalDashboard: { icon: '📌', pinned: true },
  goalCreation: { icon: '📝' },
  goalWorkspace: { icon: '🗂️' },
  learningWorkspace: { icon: '🧠' },
  knowledgeBase: { icon: '📚' },
  noteEditor: { icon: '📝' },
};

const createTabId = (): string =>
  `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export class TabController {
  private tabs: AppTab[] = [];
  private activeTabId: string | null = null;

  constructor(private readonly resolveTabTitle: (tab: AppTab) => string) {}

  public bootstrap(initialPage: Page): void {
    if (this.tabs.length > 0) return;
    const initialTab = this.createTab(initialPage);
    this.tabs = [initialTab];
    this.activeTabId = initialTab.id;
  }

  public focusOrCreate(view: Page, options: TabOpenOptions = {}): Page {
    const identity = options.identity ?? this.buildTabIdentity(view, options.context);
    const existing = this.tabs.find((tab) => tab.identity === identity);
    if (existing) {
      this.activeTabId = existing.id;
      return existing.view;
    }
    const tab = this.createTab(view, { ...options, identity });
    this.tabs = [...this.tabs, tab];
    this.enforcePinGrouping();
    this.activeTabId = tab.id;
    return view;
  }

  public activate(tabId: string): Page | null {
    if (this.activeTabId === tabId) return null;
    const target = this.tabs.find((tab) => tab.id === tabId);
    if (!target) return null;
    this.activeTabId = target.id;
    return target.view;
  }

  public close(tabId: string, fallbackView: Page): Page | null {
    const targetIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    if (targetIndex === -1) return null;
    const target = this.tabs[targetIndex];
    if (!target.closable) return null;
    const remaining = this.tabs.filter((tab) => tab.id !== tabId);
    if (remaining.length === 0) {
      this.tabs = [];
      this.activeTabId = null;
      return fallbackView;
    }
    this.tabs = remaining;
    if (this.activeTabId === tabId) {
      const fallbackIndex = Math.max(0, targetIndex - 1);
      const nextActive = this.tabs[fallbackIndex] ?? this.tabs[0];
      this.activeTabId = nextActive?.id ?? null;
      return nextActive?.view ?? fallbackView;
    }
    return null;
  }

  public closeAll(fallbackView: Page): Page {
    const pinnedTabs = this.tabs.filter((tab) => tab.pinned);
    if (pinnedTabs.length > 0) {
      this.tabs = pinnedTabs;
      this.activeTabId = pinnedTabs[0].id;
      return pinnedTabs[0].view;
    }
    this.tabs = [];
    this.activeTabId = null;
    return fallbackView;
  }

  public reload(tabId: string): boolean {
    const target = this.tabs.find((tab) => tab.id === tabId);
    if (!target) return false;
    const updated = { ...target, reloadToken: target.reloadToken + 1 };
    this.tabs = this.tabs.map((tab) => (tab.id === tabId ? updated : tab));
    return true;
  }

  public togglePin(tabId: string, pinned?: boolean): boolean {
    const target = this.tabs.find((tab) => tab.id === tabId);
    if (!target) return false;
    const nextPinned = pinned ?? !target.pinned;
    if (nextPinned === target.pinned) return false;
    const updated = { ...target, pinned: nextPinned };
    this.tabs = this.tabs.map((tab) => (tab.id === tabId ? updated : tab));
    this.enforcePinGrouping();
    return true;
  }

  public reorder(order: string[]): boolean {
    if (!order.length) return false;
    const ordered: AppTab[] = [];
    const visited = new Set<string>();
    order.forEach((id) => {
      const tab = this.tabs.find((item) => item.id === id);
      if (tab && !visited.has(id)) {
        ordered.push(tab);
        visited.add(id);
      }
    });
    const remainder = this.tabs.filter((tab) => !visited.has(tab.id));
    const next = [...ordered, ...remainder];
    const changed = next.some((tab, index) => tab.id !== this.tabs[index]?.id);
    if (!changed) return false;
    this.tabs = next;
    this.enforcePinGrouping();
    return true;
  }

  public syncTabTitles(): void {
    this.tabs = this.tabs.map((tab) => {
      const nextTitle = this.resolveTabTitle(tab);
      if (nextTitle === tab.title) return tab;
      return { ...tab, title: nextTitle };
    });
  }

  public getTabsSnapshot(): AppTab[] {
    return this.tabs.map((tab) => ({
      ...tab,
      context: tab.context ? { ...tab.context } : undefined,
    }));
  }

  public getActiveTabId(): string | null {
    return this.activeTabId;
  }

  public clearActiveTab(): void {
    this.activeTabId = null;
  }

  private createTab(view: Page, options: TabOpenOptions = {}): AppTab {
    const blueprint = TAB_BLUEPRINTS[view];
    const identity = options.identity ?? this.buildTabIdentity(view, options.context);
    return {
      id: createTabId(),
      view,
      identity,
      title: options.title ?? '',
      icon: options.icon ?? blueprint?.icon ?? TAB_ICON_FALLBACK,
      pinned: options.pinned ?? blueprint?.pinned ?? false,
      closable: options.closable ?? true,
      reloadToken: 0,
      context: options.context ? { ...options.context } : undefined,
    };
  }

  private buildTabIdentity(view: Page, context?: TabContext): string {
    if (context?.goalId) {
      return `${view}:${context.goalId}`;
    }
    if (context?.noteId) {
      return `${view}:${context.noteId}`;
    }
    return view;
  }

  private enforcePinGrouping(): void {
    if (this.tabs.length <= 1) return;
    const pinned = this.tabs.filter((tab) => tab.pinned);
    const unpinned = this.tabs.filter((tab) => !tab.pinned);
    this.tabs = [...pinned, ...unpinned];
  }
}
