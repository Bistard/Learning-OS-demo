/**
 * Primary navigation definitions shared between the shell view and view-model.
 */
import { Page } from '../models/learningOsModel';

export interface NavDefinition {
  icon: string;
  label: string;
  page: Page;
}

export const PRIMARY_NAV: ReadonlyArray<NavDefinition> = [
  { icon: '📌', label: '目标', page: 'goalDashboard' },
  { icon: '📚', label: '知识库', page: 'knowledgeBase' },
];

const NAV_PAGE_SET = new Set<Page>([...PRIMARY_NAV.map((item) => item.page), 'settings']);

export const isPrimaryNavPage = (page: Page): boolean => NAV_PAGE_SET.has(page);
