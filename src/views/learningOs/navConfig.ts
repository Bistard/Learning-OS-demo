/**
 * Navigation configuration and shell template helpers for the Learning OS view.
 */
import { ICON_SETTINGS, PRIMARY_NAV, NavDefinition } from '../../config/navigation';

export const SIDE_NAV: ReadonlyArray<NavDefinition> = PRIMARY_NAV;

const NOTE_ICON = `
  <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false"
    stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 4h9a3 3 0 0 1 3 3v13l-4-3-4 3V7a3 3 0 0 0-3-3z" />
    <path d="M9 11h6" />
    <path d="M9 15h4" />
  </svg>
`;

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
          <button class="side-link" data-page="settings" type="button">
            <span class="icon">${ICON_SETTINGS}</span>
            <span>设置</span>
          </button>
          <div class="side-divider" role="presentation"></div>
          <div class="side-tabs" data-view="tab-strip" aria-label="工作区标签"></div>
          <div class="side-meta" data-view="side-meta"></div>
          <div class="side-note-cta">
            <button class="side-note-button" type="button" data-action="create-note">
              <span class="icon">${NOTE_ICON}</span>
              <span>新建笔记</span>
            </button>
          </div>
          <div class="side-resizer" data-resizer aria-hidden="true"></div>
        </aside>
        <div class="main-stage">
          <main data-view="content"></main>
        </div>
      </div>
      <div class="toast-area" data-view="toast"></div>
    `;
};
