/**
 * Loads JSON templates used to bootstrap the Learning OS state.
 */
import initialGoalData from '../../data/initialGoal.json';
import linearAlgebraKnowledgeBase from '../../data/knowledgeBases/linearAlgebra/knowledgeBase.json';
import westernPhilosophyKnowledgeBase from '../../data/knowledgeBases/westernPhilosophy/knowledgeBase.json';
import resourceHighlightsTemplate from '../../data/templates/resourceHighlights.json';
import studyRouteTemplate from '../../data/templates/studyRoute.json';
import taskTreeTemplate from '../../data/templates/taskTree.json';
import weeklyPlanTemplate from '../../data/templates/weeklyPlan.json';
import workspaceTemplateData from '../../data/templates/workspace.json';
import {
  KnowledgeLibraryTemplate,
  LearningPersona,
  ResourceHighlight,
  StudyRouteItem,
  TaskNode,
  WeeklyPlanItem,
  WorkspaceState,
} from './types';

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
    persona?: LearningPersona;
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
export const knowledgeLibraryTemplates = [
  linearAlgebraKnowledgeBase,
  westernPhilosophyKnowledgeBase,
] as KnowledgeLibraryTemplate[];

export const knowledgeBaseTemplate = knowledgeLibraryTemplates[0];
export const defaultKnowledgeLibraryId = knowledgeLibraryTemplates[0]?.id ?? 'knowledge-library-default';

export const getKnowledgeLibraryTemplate = (libraryId: string): KnowledgeLibraryTemplate =>
  knowledgeLibraryTemplates.find((library) => library.id === libraryId) ?? knowledgeLibraryTemplates[0];
export const workspaceTemplate = workspaceTemplateData as WorkspaceState;
