import { KnowledgeCategory, KnowledgeLibrarySummary } from '../../../models/learningOsModel';

export interface KnowledgeBaseViewState {
  categories: KnowledgeCategory[];
  activeGoalName: string;
  editingCategoryId: string | null;
  libraries: KnowledgeLibrarySummary[];
  activeLibraryId: string;
}

export interface KnowledgeCategoryDraft {
  title: string;
  icon: string;
  color: string;
}
