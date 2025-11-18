import { Page } from '../../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindInput } from '../../../utils/dom';
import { RenderRegions, UiModule } from '../../types';

interface KnowledgeBaseViewState {
  knowledgeBase: ViewSnapshot['knowledgeBase'];
}

class KnowledgeBaseViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): KnowledgeBaseViewState {
    return { knowledgeBase: snapshot.knowledgeBase };
  }

  public toggleAutoCapture(value: boolean): void {
    this.root.toggleAutoCapture(value);
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

    regions.content.innerHTML = `
      <section class="panel kb-head">
        <div>
          <p class="eyebrow">Step 4</p>
          <h2>知识库是系统底层 · 不是入口</h2>
          <p class="microcopy">
            目标驱动学习过程；知识库自动收录对话、笔记、Quiz、错题等，随时可分享 / 邀请协作者。
          </p>
        </div>
        <label class="switch-row" for="toggle-capture">
          <span>自动收录</span>
          <input type="checkbox" id="toggle-capture" ${
            state.knowledgeBase.autoCaptureEnabled ? 'checked' : ''
          }/>
          <span class="switch" aria-hidden="true"></span>
        </label>
      </section>
      ${sections}
    `;

    bindInput(regions.content, '#toggle-capture', (checked) =>
      this.viewModel.toggleAutoCapture(Boolean(checked))
    );
  }
}

export class KnowledgeBaseModule implements UiModule {
  public readonly page: Page = 'knowledgeBase';
  private readonly viewModel: KnowledgeBaseViewModel;
  private readonly view: KnowledgeBaseView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new KnowledgeBaseViewModel(root);
    this.view = new KnowledgeBaseView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
