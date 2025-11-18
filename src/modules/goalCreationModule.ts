import { Page } from '../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';
import { bindClick, bindInput, bindListClick } from '../utils/dom';
import { RenderRegions, UiModule } from './types';

interface GoalCreationViewState {
  draft: ViewSnapshot['creationDraft'];
}

class GoalCreationViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): GoalCreationViewState {
    return { draft: snapshot.creationDraft };
  }

  public selectTargetType(label: string): void {
    this.root.updateGoalDraft('targetType', label);
  }

  public setDeadline(value: string): void {
    this.root.updateGoalDraft('deadline', value);
  }

  public setMastery(value: number): void {
    this.root.updateGoalDraft('mastery', value);
  }

  public appendMaterial(label: string): void {
    this.root.appendMaterial(label);
  }

  public removeMaterial(label: string): void {
    this.root.removeMaterial(label);
  }

  public setDailyMinutes(minutes: number): void {
    this.root.updateGoalDraft('dailyMinutes', minutes);
  }

  public submit(): void {
    this.root.submitGoalCreation();
  }
}

class GoalCreationView {
  private readonly optionValues = ['期末考试', '作业', '考研', '证书考试', '自主学习主题'];

  constructor(private readonly viewModel: GoalCreationViewModel) {}

  public render(state: GoalCreationViewState, regions: RenderRegions): void {
    const draft = state.draft;
    const materials = draft.materials
      .map(
        (material) => `
        <span class="tag">
          ${material}
          <button type="button" data-remove-material="${material}" aria-label="移除 ${material}">×</button>
        </span>`
      )
      .join('');

    regions.content.innerHTML = `
      <section class="panel creation">
        <h2>创建目标 · 小墨问你五个问题</h2>
        <ol class="creation-steps">
          <li>
            <p class="label">1. 你要准备什么？</p>
            <div class="option-row">
              ${this.optionValues
                .map(
                  (label) => `
                    <button class="pill-btn ${draft.targetType === label ? 'active' : ''}"
                            data-target-type="${label}" type="button">${label}</button>`
                )
                .join('')}
            </div>
          </li>
          <li>
            <p class="label">2. 截止日期</p>
            <input id="goal-deadline" type="datetime-local" value="${draft.deadline}" />
          </li>
          <li>
            <p class="label">3. 目标掌握度</p>
            <input id="goal-mastery" type="range" min="0" max="100" value="${draft.mastery}" />
            <p class="microcopy"><span id="goal-mastery-value">${draft.mastery}</span>%</p>
          </li>
          <li>
            <p class="label">4. 学习素材</p>
            <div class="material-row">
              <input id="material-input" type="text" placeholder="例：Lecture slides / 错题本" />
              <button class="btn ghost" id="add-material" type="button">添加</button>
            </div>
            <div class="tag-list">${materials || '<p class="microcopy">添加任意数量的素材，AI 会自动连接</p>'}</div>
          </li>
          <li>
            <p class="label">5. 每日投入（分钟）</p>
            <input id="daily-minutes" type="number" min="30" step="15" value="${draft.dailyMinutes}" />
          </li>
        </ol>
        <div class="creation-actions">
          <button class="btn primary" id="goal-submit">生成目标档案</button>
        </div>
      </section>
    `;

    const masteryValue = regions.content.querySelector('#goal-mastery-value');

    bindListClick(regions.content, '[data-target-type]', (element) => {
      const label = element.getAttribute('data-target-type');
      if (label) this.viewModel.selectTargetType(label);
    });
    bindInput(regions.content, '#goal-deadline', (value) =>
      this.viewModel.setDeadline(String(value))
    );
    bindInput(regions.content, '#goal-mastery', (value) => {
      const mastery = Number(value);
      this.viewModel.setMastery(mastery);
      if (masteryValue) masteryValue.textContent = String(mastery);
    });
    bindClick(regions.content, '#add-material', () => {
      const input = regions.content.querySelector<HTMLInputElement>('#material-input');
      if (!input) return;
      this.viewModel.appendMaterial(input.value);
      input.value = '';
    });
    bindListClick(regions.content, '[data-remove-material]', (element) => {
      const label = element.getAttribute('data-remove-material');
      if (label) this.viewModel.removeMaterial(label);
    });
    bindInput(regions.content, '#daily-minutes', (value) =>
      this.viewModel.setDailyMinutes(Number(value))
    );
    bindClick(regions.content, '#goal-submit', () => this.viewModel.submit());
  }
}

export class GoalCreationModule implements UiModule {
  public readonly page: Page = 'goalCreation';
  private readonly viewModel: GoalCreationViewModel;
  private readonly view: GoalCreationView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new GoalCreationViewModel(root);
    this.view = new GoalCreationView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    const state = this.viewModel.buildState(snapshot);
    this.view.render(state, regions);
  }
}
