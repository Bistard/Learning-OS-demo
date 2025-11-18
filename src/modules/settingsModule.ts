import { Page } from '../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';
import { bindClick } from '../utils/dom';
import { RenderRegions, UiModule } from './types';

class SettingsViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public goToGoals(): void {
    this.root.navigate('goalDashboard');
  }

  public goToKnowledgeBase(): void {
    this.root.navigate('knowledgeBase');
  }
}

class SettingsView {
  constructor(private readonly viewModel: SettingsViewModel) {}

  public render(regions: RenderRegions): void {
    regions.content.innerHTML = `
      <section class="panel settings">
        <h3>系统偏好</h3>
        <div class="setting-row">
          <div>
            <strong>默认入口</strong>
            <p class="microcopy">保持“目标优先”，知识库仅作上下文</p>
          </div>
          <button class="btn ghost" id="settings-goal">回到目标</button>
        </div>
        <div class="setting-row">
          <div>
            <strong>未收录知识库</strong>
            <p class="microcopy">无需手动分类，AI 会在合适的时机分发</p>
          </div>
          <button class="btn ghost" id="settings-kb">查看知识库</button>
        </div>
      </section>
    `;

    bindClick(regions.content, '#settings-goal', () => this.viewModel.goToGoals());
    bindClick(regions.content, '#settings-kb', () => this.viewModel.goToKnowledgeBase());
  }
}

export class SettingsModule implements UiModule {
  public readonly page: Page = 'settings';
  private readonly viewModel: SettingsViewModel;
  private readonly view: SettingsView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new SettingsViewModel(root);
    this.view = new SettingsView(this.viewModel);
  }

  public render(_: ViewSnapshot, regions: RenderRegions): void {
    this.view.render(regions);
  }
}
