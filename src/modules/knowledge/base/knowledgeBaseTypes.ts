import { KnowledgeCategory } from '../../../models/learningOsModel';

export interface KnowledgeBaseViewState {
  categories: KnowledgeCategory[];
  activeGoalName: string;
  editingCategoryId: string | null;
}

export interface KnowledgeCategoryDraft {
  title: string;
  icon: string;
  color: string;
}

