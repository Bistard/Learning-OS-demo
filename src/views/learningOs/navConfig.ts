/**
 * Navigation configuration and shell template helpers for the Learning OS view.
 */
import { PRIMARY_NAV, NavDefinition } from '../../config/navigation';

export const SIDE_NAV: ReadonlyArray<NavDefinition> = PRIMARY_NAV;

export const buildShellMarkup = (navItems: ReadonlyArray<NavDefinition>): string => {
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
          <div class="side-note-cta">
            <button class="side-note-button" type="button" data-action="create-note">
              <span class="icon">📝</span>
              <span>新建笔记</span>
            </button>
          </div>
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
