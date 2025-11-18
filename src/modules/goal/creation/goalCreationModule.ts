import {
  GoalCreationDraft,
  GoalCreationStep,
  GoalCreationTimeMode,
  KnowledgeBaseState,
  Page,
} from '../../../models/learningOsModel';
import {
  ensureAdvancedSettings,
  goalCreationDimensions,
  goalCreationPresets,
  goalCreationSubjects,
  GoalAdvancedDimension,
  GoalCreationPreset,
  GoalSubjectOption,
} from '../../../models/learningOs/goalCreationConfig';
import { LearningOsViewModel, ViewSnapshot } from '../../../viewModels/learningOsViewModel';
import { bindClick, bindInput, bindListClick } from '../../../utils/dom';
import { RenderRegions, UiModule } from '../../types';

interface KnowledgePreview {
  id: string;
  title: string;
  category: string;
  source: string;
}

interface GoalCreationViewState {
  draft: ViewSnapshot['creationDraft'];
  flow: ViewSnapshot['creationFlow'];
  presets: GoalCreationPreset[];
  dimensions: GoalAdvancedDimension[];
  subjects: GoalSubjectOption[];
  activePreset: GoalCreationPreset;
}

const COUNTDOWN_PRESETS = [3, 5, 12];

const CREATION_STEPS: Array<{ id: GoalCreationStep; title: string; description: string }> = [
  { id: 'base', title: '基础信息', description: '科目、时间与目标类型' },
  { id: 'materials', title: '上传资料', description: 'AI 构建 RAG 教师画像' },
  { id: 'generation', title: '生成方案', description: '系统级路径 + 个性化老师' },
];

const GENERATION_MESSAGES = ['正在解析资料', '构建章节结构', '提取考点', '生成路径'];

class GoalCreationViewModel {
  private readonly knowledgePreviewLimit = Number.POSITIVE_INFINITY;
  private latestDraft: GoalCreationDraft | null = null;
  private latestFlow: ViewSnapshot['creationFlow'] | null = null;
  private knowledgePreview: KnowledgePreview[] = [];

  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): GoalCreationViewState {
    this.latestDraft = snapshot.creationDraft;
    this.latestFlow = snapshot.creationFlow;
    this.knowledgePreview = this.flattenKnowledge(snapshot.knowledgeBase);
    const activePreset = this.resolvePreset(snapshot.creationDraft.presetId);
    const needsAdvanced =
      goalCreationDimensions.some(
        (dimension) => !(dimension.id in snapshot.creationDraft.advancedSettings)
      ) || !snapshot.creationDraft.advancedSettings;
    if (needsAdvanced) {
      this.root.updateGoalDraft(
        'advancedSettings',
        ensureAdvancedSettings(snapshot.creationDraft.advancedSettings, activePreset.id)
      );
    }
    return {
      draft: snapshot.creationDraft,
      flow: snapshot.creationFlow,
      presets: goalCreationPresets,
      dimensions: goalCreationDimensions,
      subjects: goalCreationSubjects,
      activePreset,
    };
  }

  public setSubject(subjectId: string): void {
    const subject =
      goalCreationSubjects.find((candidate) => candidate.id === subjectId) ??
      goalCreationSubjects[0];
    if (subject.status !== 'available') return;
    this.root.updateGoalDraft('subjectId', subject.id);
    this.root.updateGoalDraft('subjectLabel', subject.label);
  }

  public setPreset(presetId: string): void {
    const preset = this.resolvePreset(presetId);
    const draft = this.latestDraft;
    const dailyMinutes = preset.defaultDailyMinutes ?? draft?.dailyMinutes ?? 120;
    const mastery = preset.defaultMastery ?? draft?.mastery ?? 0;
    this.root.updateGoalDraft('presetId', preset.id);
    this.root.updateGoalDraft('targetType', preset.label);
    this.root.updateGoalDraft('dailyMinutes', dailyMinutes);
    this.root.updateGoalDraft('mastery', mastery);
    this.root.updateGoalDraft('advancedSettings', ensureAdvancedSettings(preset.advancedDefaults, preset.id));
  }

  public setDeadline(value: string): void {
    this.root.updateGoalDraft('deadline', value);
    this.root.updateGoalDraft('timeMode', 'deadline');
  }

  public setCountdown(hours: number): void {
    this.root.updateGoalDraft('countdownHours', hours);
    this.root.updateGoalDraft('timeMode', 'countdown');
  }

  public setTimeMode(mode: GoalCreationTimeMode): void {
    this.root.updateGoalDraft('timeMode', mode);
  }

  public setMastery(value: number): void {
    this.root.updateGoalDraft('mastery', value);
  }

  public setDailyMinutes(value: number): void {
    this.root.updateGoalDraft('dailyMinutes', value);
  }

  public toggleAdvanced(open?: boolean): void {
    const next = open ?? !this.latestFlow?.advancedOpen;
    this.root.updateGoalCreationFlow({ advancedOpen: next });
  }

  public goToStep(step: GoalCreationStep): void {
    const patch: Partial<ViewSnapshot['creationFlow']> = { step };
    if (step !== 'generation') {
      patch.generationPhase = 'idle';
      patch.generationMessageIndex = 0;
    }
    this.root.updateGoalCreationFlow(patch);
  }

  public startGeneration(): void {
    this.root.updateGoalCreationFlow({
      step: 'generation',
      generationPhase: 'running',
      generationMessageIndex: 0,
    });
  }

  public advanceGeneration(index: number, completed: boolean): void {
    this.root.updateGoalCreationFlow({
      generationMessageIndex: index,
      generationPhase: completed ? 'ready' : 'running',
    });
  }

  public appendMaterial(label: string): void {
    this.root.appendMaterial(label);
  }

  public removeMaterial(label: string): void {
    this.root.removeMaterial(label);
  }

  public applyAdvancedOption(dimensionId: string, optionId: string): void {
    const next = {
      ...(this.latestDraft?.advancedSettings ?? {}),
      [dimensionId]: optionId,
    };
    this.root.updateGoalDraft('advancedSettings', next);
  }

  public importKnowledgeLibrary(): void {
    if (!this.knowledgePreview.length) return;
    this.knowledgePreview.forEach((item) => {
      this.appendMaterial(`${item.category} · ${item.title}`);
    });
  }

  public handleFileUpload(files: FileList): void {
    Array.from(files).forEach((file) => {
      this.appendMaterial(file.name);
    });
  }

  public submitGoal(): void {
    this.root.submitGoalCreation();
  }

  private resolvePreset(presetId: string): GoalCreationPreset {
    return goalCreationPresets.find((preset) => preset.id === presetId) ?? goalCreationPresets[0];
  }

  private flattenKnowledge(knowledgeBase: KnowledgeBaseState): KnowledgePreview[] {
    const previews: KnowledgePreview[] = [];
    knowledgeBase.categories.forEach((category) => {
      category.items.forEach((item) => {
        previews.push({
          id: item.id,
          title: item.summary,
          source: item.source,
          category: category.title,
        });
      });
    });
    return previews.slice(0, this.knowledgePreviewLimit);
  }
}

class GoalCreationView {
  private readonly generationMessages = GENERATION_MESSAGES;
  private generationTimer: number | null = null;
  private generationIndex = 0;

  constructor(private readonly viewModel: GoalCreationViewModel) {}

  public render(state: GoalCreationViewState, regions: RenderRegions): void {
    this.generationIndex = state.flow.generationMessageIndex;
    regions.content.innerHTML = `
      <section class="panel goal-creation">
        ${this.renderStepHeader(state)}
        <div class="creation-stage">
          ${this.renderStage(state)}
        </div>
      </section>
    `;
    switch (state.flow.step) {
      case 'base':
        this.bindBaseStage(state, regions.content);
        break;
      case 'materials':
        this.bindMaterialStage(state, regions.content);
        break;
      case 'generation':
        this.bindGenerationStage(state, regions.content);
        break;
      default:
        break;
    }
    this.syncGenerationLoop(state.flow);
  }

  private renderStepHeader(state: GoalCreationViewState): string {
    const currentIndex = CREATION_STEPS.findIndex((step) => step.id === state.flow.step);
    const stepsMarkup = CREATION_STEPS.map((step, index) => {
      const status =
        index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'upcoming';
      return `
        <div class="step-item" data-status="${status}">
          <span class="step-index">${index + 1}</span>
          <div>
            <p class="step-title">${step.title}</p>
            <p class="microcopy">${step.description}</p>
          </div>
        </div>
      `;
    }).join('');
    return `<div class="creation-steps">${stepsMarkup}</div>`;
  }

  private renderStage(state: GoalCreationViewState): string {
    if (state.flow.step === 'base') {
      return this.renderBaseStage(state);
    }
    if (state.flow.step === 'materials') {
      return this.renderMaterialStage(state);
    }
    return this.renderGenerationStage(state);
  }

  private renderBaseStage(state: GoalCreationViewState): string {
    const subjectOptions = state.subjects
      .map(
        (subject) => `
          <option value="${subject.id}" ${subject.status !== 'available' ? 'disabled' : ''} ${
          state.draft.subjectId === subject.id ? 'selected' : ''
        }>
            ${subject.label}${subject.status !== 'available' ? ' · 即将上线' : ''}
          </option>
        `
      )
      .join('');
    const presetOptions = state.presets
      .map(
        (preset) => `
          <option value="${preset.id}" ${state.draft.presetId === preset.id ? 'selected' : ''}>
            ${preset.label}
          </option>
        `
      )
      .join('');
    const deadlineActive = state.draft.timeMode === 'deadline';
    const countdownActive = state.draft.timeMode === 'countdown';
    const countdownButtons = COUNTDOWN_PRESETS.map((hours) => {
      const active = countdownActive && state.draft.countdownHours === hours;
      return `<button class="chip ${active ? 'active' : ''}" data-countdown="${hours}">${hours} 小时</button>`;
    }).join('');
    const continueDisabled =
      !state.draft.targetType.trim() ||
      (state.draft.timeMode === 'deadline' && !state.draft.deadline) ||
      (state.draft.timeMode === 'countdown' && !state.draft.countdownHours);
    const advancedPanel = state.flow.advancedOpen
      ? `<div class="advanced-panel">${this.renderAdvancedPanel(state)}</div>`
      : '';
    const timeControl = deadlineActive
      ? `<input type="datetime-local" id="goal-deadline" value="${state.draft.deadline}" />`
      : `<div class="chip-group" id="countdown-group">${countdownButtons}</div>`;
    const timeDescription = deadlineActive ? '适合长期目标 / 考研等场景' : '3 / 5 / 12 小时冲刺';
    return `
      <div class="stage-base">
        <section class="card stack-card">
          <div class="field">
            <label>考试科目</label>
            <select id="goal-subject">${subjectOptions}</select>
            <p class="microcopy">Demo 当前锁定「微积分」，其余科目即将开放。</p>
          </div>
          <div class="field">
            <label>期望掌握度 <span id="goal-mastery-value">${state.draft.mastery}%</span></label>
            <input type="range" id="goal-mastery" min="0" max="100" value="${state.draft.mastery}" />
          </div>
          <div class="field">
            <label>每日投入（分钟）</label>
            <input type="number" id="goal-daily-minutes" min="30" step="10" value="${state.draft.dailyMinutes}" />
          </div>
        </section>
        <section class="card stack-card time-card" data-mode="${state.draft.timeMode}">
          <div class="time-mode-toggle">
            <button class="time-mode-option ${deadlineActive ? 'active' : ''}" data-time-mode="deadline">
              <span>截止日期</span>
              <small>长期</small>
            </button>
            <button class="time-mode-option ${countdownActive ? 'active' : ''}" data-time-mode="countdown">
              <span>倒计时模式</span>
              <small>短期</small>
            </button>
          </div>
          <div class="time-body">
            ${timeControl}
            <p class="microcopy">${timeDescription}</p>
          </div>
        </section>
        <section class="card stack-card preset-card">
          <label>目标类型 · 预设模板</label>
          <select id="goal-preset">${presetOptions}</select>
          <div class="preset-summary">
            <div>
              <p class="microcopy">系统路径</p>
              <p class="preset-copy">${state.activePreset.systemFocus}</p>
            </div>
            <div>
              <p class="microcopy">个性化老师</p>
              <p class="preset-copy">${state.activePreset.ragFocus}</p>
            </div>
          </div>
          <button class="btn ghost" id="toggle-advanced">${
            state.flow.advancedOpen ? '收起高级设置' : '高级设置'
          }</button>
        </section>
      </div>
      ${advancedPanel}
      <div class="stage-actions">
        <button class="btn ghost" disabled>返回</button>
        <button class="btn primary" id="to-materials" ${continueDisabled ? 'disabled' : ''}>继续</button>
      </div>
    `;
  }

  private renderAdvancedPanel(state: GoalCreationViewState): string {
    return state.dimensions
      .map((dimension) => {
        const options = dimension.options
          .map((option) => {
            const active = state.draft.advancedSettings[dimension.id] === option.id;
            return `<button class="chip ${active ? 'active' : ''}" data-advanced-option="${dimension.id}:${option.id}">
              <span class="chip-title">${option.label}</span>
              <span class="chip-summary">${option.summary}</span>
            </button>`;
          })
          .join('');
        return `
          <section class="advanced-card">
            <div class="advanced-card-head">
              <p class="title">${dimension.label}</p>
              <p class="microcopy">${dimension.description}</p>
            </div>
            <div class="advanced-card-body">${options}</div>
          </section>
        `;
      })
      .join('');
  }

  private renderMaterialStage(state: GoalCreationViewState): string {
    const materials = state.draft.materials.length
      ? state.draft.materials
          .map(
            (material) => `
              <span class="tag">
                ${material}
                <button type="button" data-remove-material="${material}" aria-label="移除 ${material}">×</button>
              </span>
            `
          )
          .join('')
      : '<p class="microcopy">上传课件、错题本或直接导入知识库，AI 会自动解析与关联。</p>';
    return `
      <div class="stage-materials">
        <div class="upload-shell">
          <div class="upload-dropzone" id="goal-material-dropzone">
            <div>
              <p class="label">上传相关资料</p>
              <p class="microcopy">支持拖拽 / 粘贴链接 / 直接上传 PDF、图片等文件。</p>
            </div>
            <button class="btn secondary" id="goal-upload-trigger">上传相关资料</button>
            <div class="upload-menu" id="goal-upload-menu">
              <button data-upload-option="custom">自定义上传...</button>
              <button data-upload-option="knowledge">从知识库导入...</button>
            </div>
            <input type="file" id="goal-file-input" multiple hidden />
          </div>
          <div class="tag-list">${materials}</div>
        </div>
      </div>
      <div class="stage-actions">
        <button class="btn ghost" id="back-to-base">返回</button>
        <button class="btn primary" id="to-generation">继续</button>
      </div>
    `;
  }

  private renderGenerationStage(state: GoalCreationViewState): string {
    const progressRatio =
      this.generationMessages.length === 1
        ? 1
        : state.flow.generationMessageIndex / (this.generationMessages.length - 1);
    const progressPercent = Math.min(100, Math.round(progressRatio * 100));
    const list = this.generationMessages
      .map((message, index) => {
        const status =
          index < state.flow.generationMessageIndex
            ? 'done'
            : index === state.flow.generationMessageIndex
              ? 'active'
              : 'upcoming';
        return `<li data-status="${status}">${message}</li>`;
      })
      .join('');
    const ready = state.flow.generationPhase === 'ready';
    return `
      <div class="stage-generation">
        <div class="generation-visual">
          <div class="progress-bar">
            <div style="width:${progressPercent}%"></div>
          </div>
          <ul class="generation-steps">${list}</ul>
        </div>
        <div class="generation-status">
          <p>${ready ? '个性化学习方案已准备就绪' : 'AI 正在生成系统路径…'}</p>
          <span class="status-indicator ${ready ? 'success' : 'loading'}"></span>
        </div>
      </div>
      <div class="stage-actions">
        <button class="btn ghost" id="back-to-materials">返回</button>
        <button class="btn primary" id="submit-goal" ${ready ? '' : 'disabled'}>进入任务树</button>
      </div>
    `;
  }

  private bindBaseStage(state: GoalCreationViewState, root: ParentNode): void {
    const subjectSelect = root.querySelector<HTMLSelectElement>('#goal-subject');
    subjectSelect?.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      this.viewModel.setSubject(target.value);
    });
    const presetSelect = root.querySelector<HTMLSelectElement>('#goal-preset');
    presetSelect?.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      this.viewModel.setPreset(target.value);
    });
    const masteryInput = root.querySelector<HTMLInputElement>('#goal-mastery');
    const masteryValue = root.querySelector<HTMLElement>('#goal-mastery-value');
    if (masteryInput) {
      const syncLabel = (value: number) => {
        if (masteryValue) {
          masteryValue.textContent = `${value}%`;
        }
      };
      masteryInput.addEventListener('input', () => {
        syncLabel(Number(masteryInput.value));
      });
      masteryInput.addEventListener('change', () => {
        this.viewModel.setMastery(Number(masteryInput.value));
      });
    }
    bindInput(root, '#goal-daily-minutes', (value) => {
      this.viewModel.setDailyMinutes(Number(value));
    });
    bindInput(root, '#goal-deadline', (value) => {
      this.viewModel.setDeadline(String(value));
    });
    bindListClick(root, '[data-time-mode]', (element) => {
      const mode = element.getAttribute('data-time-mode') as GoalCreationTimeMode | null;
      if (mode === 'deadline' || mode === 'countdown') {
        this.viewModel.setTimeMode(mode);
      }
    });
    bindListClick(root, '[data-countdown]', (element) => {
      const hours = Number(element.getAttribute('data-countdown'));
      this.viewModel.setCountdown(hours);
    });
    bindClick(root, '#toggle-advanced', () => this.viewModel.toggleAdvanced());
    bindListClick(root, '[data-advanced-option]', (element) => {
      const payload = element.getAttribute('data-advanced-option');
      if (!payload) return;
      const [dimensionId, optionId] = payload.split(':');
      this.viewModel.applyAdvancedOption(dimensionId, optionId);
    });
    bindClick(root, '#to-materials', () => this.viewModel.goToStep('materials'));
  }

  private bindMaterialStage(state: GoalCreationViewState, root: ParentNode): void {
    const dropzone = root.querySelector<HTMLElement>('#goal-material-dropzone');
    const uploadMenu = root.querySelector<HTMLElement>('#goal-upload-menu');
    const fileInput = root.querySelector<HTMLInputElement>('#goal-file-input');
    bindClick(root, '#goal-upload-trigger', () => {
      uploadMenu?.classList.toggle('open');
    });
    uploadMenu?.querySelectorAll<HTMLButtonElement>('[data-upload-option]').forEach((button) =>
      button.addEventListener('click', () => {
        const option = button.getAttribute('data-upload-option');
        if (option === 'custom') {
          fileInput?.click();
        }
        if (option === 'knowledge') {
          this.viewModel.importKnowledgeLibrary();
        }
        uploadMenu.classList.remove('open');
      })
    );
    fileInput?.addEventListener('change', () => {
      if (fileInput.files?.length) {
        this.viewModel.handleFileUpload(fileInput.files);
        fileInput.value = '';
      }
    });
    if (dropzone) {
      ['dragenter', 'dragover'].forEach((eventName) =>
        dropzone.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropzone.classList.add('dragover');
        })
      );
      ['dragleave', 'drop'].forEach((eventName) =>
        dropzone.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropzone.classList.remove('dragover');
        })
      );
      dropzone.addEventListener('drop', (event) => {
        const files = (event as DragEvent).dataTransfer?.files;
        if (files?.length) {
          this.viewModel.handleFileUpload(files);
        }
      });
    }
    bindListClick(root, '[data-remove-material]', (element) => {
      const label = element.getAttribute('data-remove-material');
      if (label) this.viewModel.removeMaterial(label);
    });
    bindClick(root, '#back-to-base', () => this.viewModel.goToStep('base'));
    bindClick(root, '#to-generation', () => this.viewModel.startGeneration());
  }

  private bindGenerationStage(state: GoalCreationViewState, root: ParentNode): void {
    bindClick(root, '#back-to-materials', () => this.viewModel.goToStep('materials'));
    bindClick(root, '#submit-goal', () => {
      if (state.flow.generationPhase === 'ready') {
        this.viewModel.submitGoal();
      }
    });
  }

  private syncGenerationLoop(flow: ViewSnapshot['creationFlow']): void {
    if (flow.step !== 'generation' || flow.generationPhase !== 'running') {
      this.clearGenerationTimer();
      return;
    }
    if (this.generationTimer) {
      return;
    }
    this.generationTimer = window.setInterval(() => {
      const nextIndex = Math.min(
        this.generationMessages.length - 1,
        this.generationIndex + 1
      );
      this.generationIndex = nextIndex;
      const completed = nextIndex === this.generationMessages.length - 1;
      this.viewModel.advanceGeneration(nextIndex, completed);
      if (completed) {
        this.clearGenerationTimer();
      }
    }, 1200);
  }

  private clearGenerationTimer(): void {
    if (this.generationTimer) {
      window.clearInterval(this.generationTimer);
      this.generationTimer = null;
    }
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
