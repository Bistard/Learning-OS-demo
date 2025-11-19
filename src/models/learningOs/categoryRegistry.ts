/**
 * Central registry that maps subject categories to their mock data slices
 * (goal creation, task tree, knowledge base). This keeps all mock payloads
 * discoverable in one place while allowing each category to live in its own folder.
 */
import calculusMeta from '../../data/categories/calculus/meta.json';
import calculusAdvancedDimensions from '../../data/categories/calculus/goal/advancedDimensions.json';
import calculusInitialGoal from '../../data/categories/calculus/goal/initialGoal.json';
import calculusPresets from '../../data/categories/calculus/goal/presets.json';
import calculusTaskTree from '../../data/categories/calculus/taskTree/taskTree.json';
import calculusKnowledgeBase from '../../data/categories/calculus/knowledgeBase/knowledgeBase.json';
import westernMeta from '../../data/categories/westernPhilosophy/meta.json';
import westernKnowledgeBase from '../../data/categories/westernPhilosophy/knowledgeBase/knowledgeBase.json';
import westernTaskTree from '../../data/categories/westernPhilosophy/taskTree/taskTree.json';
import {
  GoalAdvancedDimension,
  GoalCreationPreset,
  GoalSubjectOption,
} from './goalCreationSchemas';
import {
  KnowledgeLibraryTemplate,
  LearningPersona,
  TaskNode,
} from './types';

export interface CategoryMeta {
  id: string;
  label: string;
  status: 'available' | 'coming-soon';
  meta?: string;
}

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
    subjectId?: string;
    subjectLabel?: string;
    persona?: LearningPersona;
  };
  progress: {
    percent: number;
    xp: number;
  };
}

export interface CategoryGoalDataset {
  presets: GoalCreationPreset[];
  advancedDimensions: GoalAdvancedDimension[];
  initialGoal: GoalSeed;
}

export interface LearningCategoryDefinition {
  meta: CategoryMeta;
  goal?: CategoryGoalDataset;
  taskTree?: TaskNode[];
  knowledgeBase?: KnowledgeLibraryTemplate;
}

const calculusCategory: LearningCategoryDefinition = {
  meta: calculusMeta as CategoryMeta,
  goal: {
    presets: calculusPresets as GoalCreationPreset[],
    advancedDimensions: calculusAdvancedDimensions as GoalAdvancedDimension[],
    initialGoal: calculusInitialGoal as GoalSeed,
  },
  taskTree: calculusTaskTree as TaskNode[],
  knowledgeBase: calculusKnowledgeBase as KnowledgeLibraryTemplate,
};

const westernPhilosophyCategory: LearningCategoryDefinition = {
  meta: westernMeta as CategoryMeta,
  taskTree: westernTaskTree as TaskNode[],
  knowledgeBase: westernKnowledgeBase as KnowledgeLibraryTemplate,
};

export const learningCategories: LearningCategoryDefinition[] = [
  calculusCategory,
  westernPhilosophyCategory,
];

export const getCategoryDefinition = (
  categoryId: string
): LearningCategoryDefinition | undefined =>
  learningCategories.find((category) => category.meta.id === categoryId);

const AVAILABLE_STATUS: CategoryMeta['status'] = 'available';

const availableCategories = learningCategories.filter(
  (category) => category.meta.status === AVAILABLE_STATUS
);

const firstAvailableGoalCategory =
  availableCategories.find((category) => category.goal) ??
  learningCategories.find((category) => category.goal);

const firstAvailableKnowledgeCategory =
  availableCategories.find((category) => category.knowledgeBase) ??
  learningCategories.find((category) => category.knowledgeBase);

const firstAvailableTaskCategory =
  availableCategories.find((category) => category.taskTree) ??
  learningCategories.find((category) => category.taskTree);

export const toGoalSubjectOptions = (): GoalSubjectOption[] =>
  learningCategories.map((category) => ({
    id: category.meta.id,
    label: category.meta.label,
    status: category.meta.status,
    meta: category.meta.meta,
  }));

export const getGoalDataset = (categoryId?: string): CategoryGoalDataset => {
  if (categoryId) {
    const match = getCategoryDefinition(categoryId);
    if (match?.goal) return match.goal;
  }
  if (firstAvailableGoalCategory?.goal) {
    return firstAvailableGoalCategory.goal;
  }
  throw new Error('No goal dataset available in category registry.');
};

export const getTaskTreeDataset = (categoryId?: string): TaskNode[] => {
  if (categoryId) {
    const match = getCategoryDefinition(categoryId);
    if (match?.taskTree) return match.taskTree;
  }
  if (firstAvailableTaskCategory?.taskTree) {
    return firstAvailableTaskCategory.taskTree;
  }
  throw new Error('No task tree dataset available in category registry.');
};

export const getKnowledgeBaseTemplate = (
  categoryId?: string
): KnowledgeLibraryTemplate => {
  if (categoryId) {
    const match = getCategoryDefinition(categoryId);
    if (match?.knowledgeBase) return match.knowledgeBase;
  }
  if (firstAvailableKnowledgeCategory?.knowledgeBase) {
    return firstAvailableKnowledgeCategory.knowledgeBase;
  }
  throw new Error('No knowledge base dataset available in category registry.');
};

export const getKnowledgeBaseTemplates = (): KnowledgeLibraryTemplate[] => {
  const templates = availableCategories
    .filter((category) => Boolean(category.knowledgeBase))
    .map((category) => category.knowledgeBase as KnowledgeLibraryTemplate);
  if (templates.length > 0) {
    return templates;
  }
  return learningCategories
    .filter((category) => Boolean(category.knowledgeBase))
    .map((category) => category.knowledgeBase as KnowledgeLibraryTemplate);
};
