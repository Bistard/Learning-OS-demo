/**
 * Primary navigation definitions shared between the shell view and view-model.
 */
import { Page } from '../models/learningOsModel';

export interface NavDefinition {
  icon: string;
  label: string;
  page: Page;
}

const svg = (content: string): string =>
  `<svg viewBox="0 0 24 24" role="presentation" aria-hidden="true" focusable="false" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;

const ICON_GOAL = svg(`
  <circle cx="12" cy="12" r="6" />
  <circle cx="12" cy="12" r="2.5" />
  <path d="M12 2v2" />
  <path d="M12 20v2" />
  <path d="M20 12h2" />
  <path d="M2 12h2" />
  <path d="m15.5 8.5 4.5-4.5" />
`);

const ICON_DIALOG = svg(`
  <path d="M7.5 6.5h7a4.5 4.5 0 0 1 0 9H10l-3.5 3.5v-3.5h-1a4.5 4.5 0 0 1 0-9h2z" />
  <path d="M13 6V4.5" />
  <path d="M17 15.5v2" />
`);

const ICON_KNOWLEDGE = svg(`
  <path d="M5.5 5.5h7.5a3 3 0 0 1 3 3v12l-6-2-6 2v-12a3 3 0 0 1 3-3z" />
  <path d="M5.5 11h7.5" />
  <path d="M5.5 7.5h7.5" />
`);

export const ICON_SETTINGS = svg(`
  <circle cx="12" cy="12" r="3" />
  <path d="M4 12h2" />
  <path d="M18 12h2" />
  <path d="m6.2 6.2 1.4 1.4" />
  <path d="m16.4 16.4 1.4 1.4" />
  <path d="m6.2 17.8 1.4-1.4" />
  <path d="m16.4 7.6 1.4-1.4" />
`);

export const PRIMARY_NAV: ReadonlyArray<NavDefinition> = [
  { icon: ICON_GOAL, label: '目标', page: 'goalDashboard' },
  { icon: ICON_DIALOG, label: 'AI 对话', page: 'aiDialog' },
  { icon: ICON_KNOWLEDGE, label: '知识库', page: 'knowledgeBase' },
];

const NAV_PAGE_SET = new Set<Page>([...PRIMARY_NAV.map((item) => item.page), 'settings']);

export const isPrimaryNavPage = (page: Page): boolean => NAV_PAGE_SET.has(page);
