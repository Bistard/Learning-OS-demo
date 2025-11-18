import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { KnowledgeBaseViewState, KnowledgeCategoryDraft } from './knowledgeBaseTypes';
import { CATEGORY_TAIL_DROP_ID } from './knowledgeBaseUtils';

export class KnowledgeBaseViewModel {
  private editingCategoryId: string | null = null;
  private draggingCategoryId: string | null = null;
  private draggingItemId: string | null = null;
  private lastCategoryOrder: string[] = [];

  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): KnowledgeBaseViewState {
    this.lastCategoryOrder = snapshot.knowledgeBase.categories.map((category) => category.id);
    return {
      categories: snapshot.knowledgeBase.categories,
      activeGoalName: snapshot.activeGoal?.name ?? '未绑定目标',
      editingCategoryId: this.editingCategoryId,
    };
  }

  public addCategory(payload: KnowledgeCategoryDraft): void {
    this.root.addKnowledgeCategory(payload);
  }

  public recordUpload(fileName: string): string {
    return this.root.recordKnowledgeUpload(fileName);
  }

  public openNote(noteId: string): void {
    this.root.openNote(noteId);
  }

  public startRename(categoryId: string): void {
    this.editingCategoryId = categoryId;
  }

  public cancelRename(): void {
    this.editingCategoryId = null;
  }

  public renameCategory(categoryId: string, title: string): void {
    this.root.renameKnowledgeCategory(categoryId, title);
    this.editingCategoryId = null;
  }

  public deleteCategory(categoryId: string): void {
    if (this.editingCategoryId === categoryId) {
      this.editingCategoryId = null;
    }
    this.root.deleteKnowledgeCategory(categoryId);
  }

  public beginCategoryDrag(categoryId: string): void {
    this.draggingCategoryId = categoryId;
  }

  public dropCategory(targetId: string): void {
    if (!this.draggingCategoryId) return;
    if (this.draggingCategoryId === targetId) {
      this.draggingCategoryId = null;
      return;
    }
    const order = [...this.lastCategoryOrder];
    const fromIndex = order.indexOf(this.draggingCategoryId);
    if (fromIndex === -1) {
      this.draggingCategoryId = null;
      return;
    }
    order.splice(fromIndex, 1);
    if (targetId === CATEGORY_TAIL_DROP_ID) {
      order.push(this.draggingCategoryId);
    } else {
      const toIndex = order.indexOf(targetId);
      if (toIndex === -1) {
        this.draggingCategoryId = null;
        return;
      }
      order.splice(toIndex, 0, this.draggingCategoryId);
    }
    this.root.reorderKnowledgeCategories(order);
    this.draggingCategoryId = null;
  }

  public cancelCategoryDrag(): void {
    this.draggingCategoryId = null;
  }

  public beginItemDrag(itemId: string): void {
    this.draggingItemId = itemId;
  }

  public dropItem(targetCategoryId: string, targetIndex: number): void {
    if (!this.draggingItemId) return;
    this.root.moveKnowledgeItem(this.draggingItemId, targetCategoryId, targetIndex);
    this.draggingItemId = null;
  }

  public cancelItemDrag(): void {
    this.draggingItemId = null;
  }

  public hasActiveCategoryDrag(): boolean {
    return this.draggingCategoryId !== null;
  }

  public hasActiveItemDrag(): boolean {
    return this.draggingItemId !== null;
  }
}
