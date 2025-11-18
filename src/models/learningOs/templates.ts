/**
 * Loads JSON templates used to bootstrap the Learning OS state.
 */
import initialGoalData from '../../data/initialGoal.json';
import knowledgeBaseTemplateData from '../../data/templates/knowledgeBase.json';
import resourceHighlightsTemplate from '../../data/templates/resourceHighlights.json';
import studyRouteTemplate from '../../data/templates/studyRoute.json';
import taskTreeTemplate from '../../data/templates/taskTree.json';
import weeklyPlanTemplate from '../../data/templates/weeklyPlan.json';
import workspaceTemplateData from '../../data/templates/workspace.json';
import { KnowledgeBaseTemplate, StudyRouteItem, TaskNode, WeeklyPlanItem, WorkspaceState, ResourceHighlight } from './types';

export interface GoalSeed {
  id: string;
  name: string;
  focus: string;
  status: 'active' | 'draft' | 'complete';
  profile: {
    targetType: string;
    deadlineDaysFromNow: number;
    mastery: number;
    dailyMinutes: number;
    materials: string[];
    resourcesCaptured: number;
  };
  progress: {
    percent: number;
    xp: number;
  };
}

export const goalSeed = initialGoalData as GoalSeed;
export const studyRouteData = studyRouteTemplate as StudyRouteItem[];
export const weeklyPlanData = weeklyPlanTemplate as WeeklyPlanItem[];
export const taskTreeData = taskTreeTemplate as TaskNode[];
export const resourceHighlightsData = resourceHighlightsTemplate as ResourceHighlight[];
export const knowledgeBaseTemplate = knowledgeBaseTemplateData as KnowledgeBaseTemplate;
export const workspaceTemplate = workspaceTemplateData as WorkspaceState;
