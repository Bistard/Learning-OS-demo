/**
 * Entry module wiring view-model and view for the knowledge base experience.
 */

import { Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { RenderRegions, UiModule } from '../../types';
import { KnowledgeBaseViewModel } from './knowledgeBaseViewModel';
import { KnowledgeBaseView } from './knowledgeBaseView';

export class KnowledgeBaseModule implements UiModule {
  public readonly page: Page = 'knowledgeBase';
  private readonly viewModel: KnowledgeBaseViewModel;
  private readonly view: KnowledgeBaseView;
  private lastSnapshot: ViewSnapshot | null = null;
  private regions: RenderRegions | null = null;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new KnowledgeBaseViewModel(root);
    this.view = new KnowledgeBaseView(this.viewModel, () => this.repaint());
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.lastSnapshot = snapshot;
    this.regions = regions;
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }

  private repaint(): void {
    if (!this.lastSnapshot || !this.regions) return;
    const state = this.viewModel.buildState(this.lastSnapshot);
    this.view.render(state, this.regions);
  }
}
