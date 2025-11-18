import { Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { RenderRegions, UiModule } from '../../types';

interface KnowledgeBaseViewState {
  knowledgeBase: ViewSnapshot['knowledgeBase'];
}

class KnowledgeBaseViewModel {
  public buildState(snapshot: ViewSnapshot): KnowledgeBaseViewState {
    return { knowledgeBase: snapshot.knowledgeBase };
  }
}

class KnowledgeBaseView {
  constructor(private readonly viewModel: KnowledgeBaseViewModel) {}

  public render(state: KnowledgeBaseViewState, regions: RenderRegions): void {
    const sections = state.knowledgeBase.sections
      .map(
        (section) => `
        <section class="kb-section">
          <header>
            <div>
              <p class="eyebrow">${section.id === 'kb-current' ? '绑定目标' : '长期知识库'}</p>
              <h3>${section.title}</h3>
              <p class="microcopy">${section.description}</p>
            </div>
          </header>
          <div class="kb-folders">
            ${section.folders
              .map(
                (folder) => `
              <article>
                <p class="label">${folder.title}</p>
                <strong>${folder.items}</strong>
                <p class="microcopy">${folder.description}</p>
                <p class="label">最近同步：${folder.lastSynced}</p>
              </article>`
              )
              .join('')}
          </div>
        </section>`
      )
      .join('');

    regions.content.innerHTML = sections;
  }
}

export class KnowledgeBaseModule implements UiModule {
  public readonly page: Page = 'knowledgeBase';
  private readonly viewModel: KnowledgeBaseViewModel;
  private readonly view: KnowledgeBaseView;

  constructor(_root: LearningOsViewModel) {
    this.viewModel = new KnowledgeBaseViewModel();
    this.view = new KnowledgeBaseView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
