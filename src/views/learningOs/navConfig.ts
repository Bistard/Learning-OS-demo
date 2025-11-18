/**
 * Navigation configuration and shell template helpers for the Learning OS view.
 */
import { Page } from '../../models/learningOsModel';

export interface NavItem {
  icon: string;
  label: string;
  page: Page;
}

export const SIDE_NAV: NavItem[] = [
  { icon: '📌', label: '目标', page: 'goalDashboard' },
  { icon: '📚', label: '知识库', page: 'knowledgeBase' },
];

export const buildShellMarkup = (navItems: NavItem[]): string => {
  const navMarkup = navItems
    .map(
      (item) => `
        <button class="side-link" data-page="${item.page}" type="button">
          <span class="icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>`
    )
    .join('');
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
};
