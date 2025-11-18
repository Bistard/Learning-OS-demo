import { Page } from '../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../viewModels/learningOsViewModel';
import { bindInput } from '../../utils/dom';
import { RenderRegions, UiModule } from '../types';

interface SettingsViewState {
  notePreviewEnabled: boolean;
}

class SettingsViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): SettingsViewState {
    return {
      notePreviewEnabled: snapshot.configuration.notePreviewEnabled,
    };
  }

  public setNotePreviewEnabled(enabled: boolean): void {
    this.root.setNotePreviewEnabled(enabled);
  }
}

class SettingsView {
  constructor(private readonly viewModel: SettingsViewModel) {}

  public render(state: SettingsViewState, regions: RenderRegions): void {
    regions.content.innerHTML = `
      <section class="settings">
        <header>
          <h2>系统设置</h2>
          <p class="microcopy">调整笔记和界面行为配置</p>
        </header>
        <div class="settings-card">
          <div class="settings-row">
            <div>
              <strong>开启 Markdown 预览</strong>
              <p class="microcopy">关闭后仅保留原始 Markdown 编辑器</p>
            </div>
            <label class="toggle">
              <input type="checkbox" id="settings-note-preview" ${state.notePreviewEnabled ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>
    `;
    bindInput(regions.content, '#settings-note-preview', (value) =>
      this.viewModel.setNotePreviewEnabled(Boolean(value))
    );
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

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
