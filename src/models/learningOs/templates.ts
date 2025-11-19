/**
 * Loads JSON templates used to bootstrap the Learning OS state.
 */
import resourceHighlightsTemplate from '../../data/templates/resourceHighlights.json';
import studyRouteTemplate from '../../data/templates/studyRoute.json';
import weeklyPlanTemplate from '../../data/templates/weeklyPlan.json';
import workspaceTemplateData from '../../data/templates/workspace.json';
import {
  KnowledgeLibraryTemplate,
  ResourceHighlight,
  StudyRouteItem,
  TaskNode,
  WeeklyPlanItem,
  WorkspaceState,
} from './types';
import {
  GoalSeed,
  getGoalDataset,
  getKnowledgeBaseTemplate,
  getKnowledgeBaseTemplates,
  getTaskTreeDataset,
} from './categoryRegistry';

const defaultGoalDataset = getGoalDataset();
const defaultTaskTreeDataset = getTaskTreeDataset();
const defaultKnowledgeBaseTemplate = getKnowledgeBaseTemplate();

export const goalSeed = defaultGoalDataset.initialGoal;
export const studyRouteData = studyRouteTemplate as StudyRouteItem[];
export const weeklyPlanData = weeklyPlanTemplate as WeeklyPlanItem[];
export const taskTreeData = defaultTaskTreeDataset;
export const resourceHighlightsData = resourceHighlightsTemplate as ResourceHighlight[];
export const knowledgeLibraryTemplates = getKnowledgeBaseTemplates() as KnowledgeLibraryTemplate[];

export const knowledgeBaseTemplate = defaultKnowledgeBaseTemplate as KnowledgeLibraryTemplate;
export const defaultKnowledgeLibraryId = knowledgeBaseTemplate.id ?? 'knowledge-library-default';

export const getKnowledgeLibraryTemplate = (libraryId: string): KnowledgeLibraryTemplate =>
  knowledgeLibraryTemplates.find((library) => library.id === libraryId) ?? knowledgeLibraryTemplates[0];
export const workspaceTemplate = workspaceTemplateData as WorkspaceState;

export const resolveTaskTreeTemplate = (categoryId?: string): TaskNode[] => {
  if (!categoryId) {
    return defaultTaskTreeDataset;
  }
  return getTaskTreeDataset(categoryId);
};
