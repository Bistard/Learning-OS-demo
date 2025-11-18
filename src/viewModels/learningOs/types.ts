/**
 * Shared view-model types composed of domain entities plus UI metadata.
 */
import { LearningOsState, StudyGoal } from '../../models/learningOsModel';
import { AppTab } from './tabController';

export interface KnowledgeCategoryDraft {
  title: string;
  icon: string;
  color: string;
}

export interface DashboardSummary {
  totalGoals: number;
  activeGoals: number;
  nearestDeadlineLabel: string;
  knowledgeVaults: number;
}

export interface ViewSnapshot extends LearningOsState {
  activeGoal: StudyGoal | null;
  dashboardSummary: DashboardSummary;
  tabs: AppTab[];
  activeTabId: string | null;
}
