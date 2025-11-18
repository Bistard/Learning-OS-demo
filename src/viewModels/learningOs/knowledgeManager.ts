/**
 * Encapsulates all mutations applied to the Knowledge Base section of the app.
 */
import {
  KnowledgeBaseState,
  KnowledgeCategory,
  KnowledgeItem,
  LearningOsState,
  ToastTone,
} from '../../models/learningOsModel';
import { KnowledgeCategoryDraft } from './types';
import { KNOWLEDGE_UNSORTED_CATEGORY_ID } from '../../models/learningOs/constants';

interface Dependencies {
  readState: () => LearningOsState;
  writeState: (partial: Partial<LearningOsState>) => void;
  emitToast: (message: string, tone: ToastTone) => void;
  formatTime: () => string;
}

export class KnowledgeManager {
  constructor(private readonly deps: Dependencies) {}

  public prependItem(categoryId: string, item: KnowledgeItem): KnowledgeBaseState {
    const base = this.deps.readState().knowledgeBase;
    const categories = this.ensureUnsortedCategory(base.categories);
    const targetId = this.resolveCategoryId(categoryId, categories);
    return {
      ...base,
      categories: categories.map((category) =>
        category.id === targetId ? { ...category, items: [item, ...category.items] } : category
      ),
    };
  }

  public addCategory(payload: KnowledgeCategoryDraft): void {
    const title = payload.title.trim();
    if (!title) {
      this.deps.emitToast('分类名称不能为空～', 'warning');
      return;
    }
    const icon = payload.icon.trim() || '📁';
    const color = this.normalizeHexColor(payload.color);
    const knowledgeBase = this.mutateCategories((categories) => [
      ...categories,
      {
        id: `kb-category-${Date.now()}`,
        title,
        icon,
        color,
        kind: 'custom',
        isFixed: false,
        items: [],
      },
    ]);
    this.deps.writeState({ knowledgeBase });
  }

  public renameCategory(categoryId: string, title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      this.deps.emitToast('分类名称不能为空～', 'warning');
      return;
    }
    const knowledgeBase = this.mutateCategories((categories) =>
      categories.map((category) =>
        category.id === categoryId && !category.isFixed ? { ...category, title: trimmed } : category
      )
    );
    this.deps.writeState({ knowledgeBase });
  }

  public deleteCategory(categoryId: string): void {
    const knowledgeBase = this.mutateCategories((categories) => {
      const target = categories.find((category) => category.id === categoryId);
      if (!target || target.isFixed) {
        return categories;
      }
      const migratedItems = target.items;
      return categories
        .filter((category) => category.id !== categoryId)
        .map((category) =>
          category.id === KNOWLEDGE_UNSORTED_CATEGORY_ID
            ? { ...category, items: [...migratedItems, ...category.items] }
            : category
        );
    });
    this.deps.writeState({ knowledgeBase });
  }

  public reorderItems(categoryId: string, orderedIds: string[]): void {
    const knowledgeBase = this.mutateCategories((categories) => {
      const map = new Map(
        this.deps
          .readState()
          .knowledgeBase.categories.map((category) => [category.id, category] as const)
      );
      const target = map.get(categoryId);
      if (!target) {
        return categories;
      }
      const orderedItems: KnowledgeItem[] = [];
      const visited = new Set<string>();
      orderedIds.forEach((id) => {
        const item = target.items.find((candidate) => candidate.id === id);
        if (item && !visited.has(id)) {
          orderedItems.push(item);
          visited.add(id);
        }
      });
      const remainder = target.items.filter((item) => !visited.has(item.id));
      const nextItems = [...orderedItems, ...remainder];
      return categories.map((category) =>
        category.id === categoryId ? { ...category, items: nextItems } : category
      );
    });
    this.deps.writeState({ knowledgeBase });
  }

  public moveItem(itemId: string, targetCategoryId: string, targetIndex: number): void {
    const { item } = this.locateKnowledgeItem(itemId);
    if (!item) return;
    const baseline = this.ensureUnsortedCategory(this.deps.readState().knowledgeBase.categories);
    const withoutItem = baseline.map((category) => ({
      ...category,
      items: category.items.filter((candidate) => candidate.id !== itemId),
    }));
    const targetId = this.resolveCategoryId(targetCategoryId, withoutItem);
    const knowledgeBase: KnowledgeBaseState = {
      ...this.deps.readState().knowledgeBase,
      categories: withoutItem.map((category) => {
        if (category.id !== targetId) {
          return category;
        }
        const items = [...category.items];
        const safeIndex = Math.max(0, Math.min(targetIndex, items.length));
        items.splice(safeIndex, 0, item);
        return { ...category, items };
      }),
    };
    this.deps.writeState({ knowledgeBase });
  }

  public recordUpload(fileName: string): string {
    const label = fileName.trim() || '未命名文件';
    const timestamp = this.deps.formatTime();
    const uploadItem: KnowledgeItem = {
      id: `kb-upload-${Date.now()}`,
      summary: label,
      detail: `${label} 已上传，稍后自动解析`,
      source: '上传文件',
      updatedAt: timestamp,
      goalId: this.deps.readState().activeGoalId ?? undefined,
    };
    const knowledgeBase = this.prependItem('kb-uploads', uploadItem);
    this.deps.writeState({ knowledgeBase });
    this.deps.emitToast('文件已记录到「上传资料」', 'success');
    return uploadItem.id;
  }

  private mutateCategories(
    mutator: (categories: KnowledgeCategory[]) => KnowledgeCategory[]
  ): KnowledgeBaseState {
    const knowledgeBase = this.deps.readState().knowledgeBase;
    const baseline = this.ensureUnsortedCategory(knowledgeBase.categories);
    return {
      ...knowledgeBase,
      categories: mutator(baseline),
    };
  }

  private locateKnowledgeItem(
    itemId: string
  ): { item: KnowledgeItem | null; categoryId: string | null } {
    const categories = this.deps.readState().knowledgeBase.categories;
    for (const category of categories) {
      const found = category.items.find((candidate) => candidate.id === itemId);
      if (found) {
        return { item: { ...found }, categoryId: category.id };
      }
    }
    return { item: null, categoryId: null };
  }

  private ensureUnsortedCategory(categories: KnowledgeCategory[]): KnowledgeCategory[] {
    if (categories.some((category) => category.id === KNOWLEDGE_UNSORTED_CATEGORY_ID)) {
      return categories;
    }
    const fallback: KnowledgeCategory = {
      id: KNOWLEDGE_UNSORTED_CATEGORY_ID,
      title: '未分类',
      kind: 'uncategorized',
      isFixed: true,
      icon: '📥',
      color: '#94a3b8',
      items: [],
    };
    return [...categories, fallback];
  }

  private resolveCategoryId(categoryId: string, categories: KnowledgeCategory[]): string {
    const exists = categories.some((category) => category.id === categoryId);
    return exists ? categoryId : KNOWLEDGE_UNSORTED_CATEGORY_ID;
  }

  private normalizeHexColor(color: string): string {
    const trimmed = color.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : '#94a3b8';
  }
}
