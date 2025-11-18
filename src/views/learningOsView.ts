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
import { NoteEditorModule } from '../modules/knowledge/notes/noteEditorModule';
import { ContextHeaderModule } from '../modules/shell/contextHeader/contextHeaderModule';
import { SidebarMetaModule } from '../modules/shell/sidebar/sidebarMetaModule';
import { TabStripModule } from '../modules/shell/tabs/tabStripModule';
import { RenderRegions, UiModule } from '../modules/types';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';
import { buildShellMarkup, SIDE_NAV } from './learningOs/navConfig';
import { bindNavigation } from './learningOs/navigation';
import { bindNavResizer } from './learningOs/resizer';

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
      new NoteEditorModule(this.viewModel),
    ];
    moduleInstances.forEach((module) => this.modules.set(module.page, module));
  }

  private buildShell(): string {
    return buildShellMarkup(SIDE_NAV);
  }

  private bindNav(shell: HTMLElement): void {
    bindNavigation(shell, this.viewModel, (page, button) => {
      this.navButtons.set(page, button);
    });
  }

  private bindResizer(shell: HTMLElement): void {
    bindNavResizer(shell, {
      getWidth: () => this.navWidth,
      applyWidth: (width) => this.applyNavWidth(width),
      min: this.MIN_NAV_WIDTH,
      max: this.MAX_NAV_WIDTH,
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
