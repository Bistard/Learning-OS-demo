/**
 * Shell view that wires navigation, context header, sidebar meta, and
 * delegates actual page rendering to feature modules (MVVM per module).
 */

import { Page } from '../models/learningOsModel';
import { GoalDashboardModule } from '../modules/goal/dashboard/goalDashboardModule';
import { GoalCreationModule } from '../modules/goal/creation/goalCreationModule';
import { GoalWorkspaceModule } from '../modules/goal/workspace/goalWorkspaceModule';
import { LearningWorkspaceModule } from '../modules/learning/workspace/learningWorkspaceModule';
import { KnowledgeBaseModule } from '../modules/knowledge/base/knowledgeBaseModule';
import { ContextHeaderModule } from '../modules/shell/contextHeader/contextHeaderModule';
import { SidebarMetaModule } from '../modules/shell/sidebar/sidebarMetaModule';
import { TabStripModule } from '../modules/shell/tabs/tabStripModule';
import { RenderRegions, UiModule } from '../modules/types';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';

interface NavItem {
  icon: string;
  label: string;
  page: Page;
}

const SIDE_NAV: NavItem[] = [
  { icon: '📌', label: '目标', page: 'goalDashboard' },
  { icon: '📚', label: '知识库', page: 'knowledgeBase' },
];

export class LearningOsView {
  private readonly shellElement: HTMLElement;
  private readonly contentHost: HTMLElement;
  private readonly toastHost: HTMLElement;
  private readonly headerHost: HTMLElement;
  private readonly tabStripHost: HTMLElement;
  private readonly sidebarMeta: HTMLElement;
  private readonly navButtons = new Map<Page, HTMLButtonElement>();
  private readonly modules = new Map<Page, UiModule>();
  private readonly regions: RenderRegions;
  private readonly headerModule: ContextHeaderModule;
  private readonly sidebarModule: SidebarMetaModule;
  private readonly tabStripModule: TabStripModule;
  private navWidth = 260;
  private readonly MIN_NAV_WIDTH = 200;
  private readonly MAX_NAV_WIDTH = 420;

  constructor(rootId: string, private readonly viewModel: LearningOsViewModel) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`Root container #${rootId} not found`);
    root.innerHTML = this.buildShell();
    this.shellElement = root.querySelector<HTMLElement>('.os-shell')!;
    this.contentHost = root.querySelector<HTMLElement>('[data-view="content"]')!;
    this.toastHost = root.querySelector<HTMLElement>('[data-view="toast"]')!;
    this.headerHost = root.querySelector<HTMLElement>('[data-view="context-head"]')!;
    this.sidebarMeta = root.querySelector<HTMLElement>('[data-view="side-meta"]')!;
    this.tabStripHost = root.querySelector<HTMLElement>('[data-view="tab-strip"]')!;
    this.regions = {
      header: this.headerHost,
      content: this.contentHost,
      sidebar: this.sidebarMeta,
    };
    this.headerModule = new ContextHeaderModule(this.viewModel);
    this.sidebarModule = new SidebarMetaModule();
    this.tabStripModule = new TabStripModule(this.viewModel);
    this.applyNavWidth(this.navWidth);
    this.bindNav(this.shellElement);
    this.bindResizer(this.shellElement);
    this.registerModules();
    this.viewModel.subscribe((snapshot) => this.render(snapshot));
    this.viewModel.onToast((toast) => this.renderToast(toast.message, toast.tone));
  }

  private registerModules(): void {
    const moduleInstances: UiModule[] = [
      new GoalDashboardModule(this.viewModel),
      new GoalCreationModule(this.viewModel),
      new GoalWorkspaceModule(this.viewModel),
      new LearningWorkspaceModule(this.viewModel),
      new KnowledgeBaseModule(this.viewModel),
    ];
    moduleInstances.forEach((module) => this.modules.set(module.page, module));
  }

  private buildShell(): string {
    const navMarkup = SIDE_NAV.map(
      (item) => `
        <button class="side-link" data-page="${item.page}" type="button">
          <span class="icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>`
    ).join('');
    return `
      <div class="os-shell">
        <aside class="side-nav">
          <div class="brand" role="button" tabindex="0" data-nav-home>
            <span class="logo-dot"></span>
            <div>
              <strong>小墨学习 OS</strong>
              <p class="microcopy">目标驱动 · 知识库沉淀</p>
            </div>
          </div>
          <div class="side-links">
            ${navMarkup}
          </div>
          <div class="side-divider" role="presentation"></div>
          <div class="side-tabs" data-view="tab-strip" aria-label="工作区标签"></div>
          <div class="side-meta" data-view="side-meta"></div>
          <div class="side-resizer" data-resizer aria-hidden="true"></div>
        </aside>
        <div class="main-stage">
          <header class="context-header" data-view="context-head"></header>
          <main data-view="content"></main>
        </div>
      </div>
      <div class="toast-area" data-view="toast"></div>
    `;
  }

  private bindNav(shell: HTMLElement): void {
    const brand = shell.querySelector<HTMLElement>('[data-nav-home]');
    brand?.addEventListener('click', () => this.viewModel.navigate('goalDashboard'));
    brand?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        this.viewModel.navigate('goalDashboard');
      }
    });
    shell.querySelectorAll<HTMLButtonElement>('.side-link').forEach((button) => {
      const page = button.dataset.page as Page;
      this.navButtons.set(page, button);
      button.addEventListener('click', () => this.viewModel.navigate(page));
    });
  }

  private bindResizer(shell: HTMLElement): void {
    const resizer = shell.querySelector<HTMLElement>('[data-resizer]');
    if (!resizer) return;
    let startX = 0;
    let startWidth = this.navWidth;
    let activePointerId: number | null = null;
    const handlePointerMove = (event: PointerEvent): void => {
      if (activePointerId === null) return;
      event.preventDefault();
      const delta = event.clientX - startX;
      this.applyNavWidth(startWidth + delta);
    };
    const stopResizing = (): void => {
      if (activePointerId === null) return;
      if (resizer.hasPointerCapture(activePointerId)) {
        resizer.releasePointerCapture(activePointerId);
      }
      activePointerId = null;
      document.body.classList.remove('is-resizing-nav');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
    const handlePointerUp = (event: PointerEvent): void => {
      if (activePointerId === null || event.pointerId !== activePointerId) return;
      stopResizing();
    };
    resizer.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      startX = event.clientX;
      startWidth = this.navWidth;
      activePointerId = event.pointerId;
      resizer.setPointerCapture(activePointerId);
      document.body.classList.add('is-resizing-nav');
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    });
  }

  private applyNavWidth(width: number): void {
    this.navWidth = this.clampNavWidth(width);
    this.shellElement?.style.setProperty('--nav-width', `${this.navWidth}px`);
  }

  private clampNavWidth(value: number): number {
    return Math.min(this.MAX_NAV_WIDTH, Math.max(this.MIN_NAV_WIDTH, value));
  }

  private render(snapshot: ViewSnapshot): void {
    this.tabStripModule.render(snapshot, this.tabStripHost);
    this.highlightNav(snapshot.page);
    this.headerModule.render(snapshot, this.headerHost);
    this.sidebarModule.render(snapshot, this.sidebarMeta);
    const module = this.modules.get(snapshot.page);
    module?.render(snapshot, this.regions);
  }

  private highlightNav(page: Page): void {
    this.navButtons.forEach((button, key) => {
      button.classList.toggle('active', key === page);
    });
  }

  private renderToast(message: string, tone: string): void {
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    this.toastHost.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 200);
    }, 2600);
  }
}
