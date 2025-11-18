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
import { AiChatModule } from '../modules/ai/chat/aiChatModule';
import { CalendarModule } from '../modules/calendar/calendarModule';
import { SettingsModule } from '../modules/settings/settingsModule';
import { ContextHeaderModule } from '../modules/shell/contextHeader/contextHeaderModule';
import { SidebarMetaModule } from '../modules/shell/sidebar/sidebarMetaModule';
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
  { icon: '💬', label: 'AI 对话', page: 'aiChat' },
  { icon: '🧭', label: '我的计划', page: 'calendar' },
  { icon: '⚙️', label: '设置', page: 'settings' },
];

export class LearningOsView {
  private readonly contentHost: HTMLElement;
  private readonly toastHost: HTMLElement;
  private readonly headerHost: HTMLElement;
  private readonly sidebarMeta: HTMLElement;
  private readonly navButtons = new Map<Page, HTMLButtonElement>();
  private readonly modules = new Map<Page, UiModule>();
  private readonly regions: RenderRegions;
  private readonly headerModule: ContextHeaderModule;
  private readonly sidebarModule: SidebarMetaModule;

  constructor(rootId: string, private readonly viewModel: LearningOsViewModel) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`Root container #${rootId} not found`);
    root.innerHTML = this.buildShell();
    this.contentHost = root.querySelector<HTMLElement>('[data-view="content"]')!;
    this.toastHost = root.querySelector<HTMLElement>('[data-view="toast"]')!;
    this.headerHost = root.querySelector<HTMLElement>('[data-view="context-head"]')!;
    this.sidebarMeta = root.querySelector<HTMLElement>('[data-view="side-meta"]')!;
    this.regions = {
      header: this.headerHost,
      content: this.contentHost,
      sidebar: this.sidebarMeta,
    };
    this.headerModule = new ContextHeaderModule(this.viewModel);
    this.sidebarModule = new SidebarMetaModule();
    this.bindNav(root);
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
      new AiChatModule(this.viewModel),
      new CalendarModule(this.viewModel),
      new SettingsModule(this.viewModel),
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
          <div class="side-meta" data-view="side-meta"></div>
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

  private render(snapshot: ViewSnapshot): void {
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
