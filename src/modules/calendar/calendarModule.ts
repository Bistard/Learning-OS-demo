import { Page } from '../../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../../viewModels/learningOsViewModel';
import { bindListClick } from '../../utils/dom';
import { RenderRegions, UiModule } from '../types';

interface CalendarViewState {
  events: ViewSnapshot['timeline'];
}

class CalendarViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): CalendarViewState {
    return { events: snapshot.timeline };
  }

  public openGoalWorkspace(): void {
    this.root.openGoalWorkspace();
  }
}

class CalendarView {
  constructor(private readonly viewModel: CalendarViewModel) {}

  public render(state: CalendarViewState, regions: RenderRegions): void {
    const items = state.events
      .map(
        (event) => `
        <article class="calendar-item">
          <p class="eyebrow">${event.day}</p>
          <strong>${event.title}</strong>
          <p class="microcopy">${event.time} · ${event.focus}</p>
          <button class="btn ghost" data-calendar-start="${event.id}">打开任务树</button>
        </article>`
      )
      .join('');

    regions.content.innerHTML = `
      <section class="panel calendar">
        <div class="panel-head">
          <p class="eyebrow">Step 6</p>
          <h3>我的计划 · 由目标串起的唯一入口</h3>
          <p class="microcopy">每天进入任务树界面，AI 会按照目标推送今日路线。</p>
        </div>
        <div class="calendar-list">${items}</div>
      </section>
    `;

    bindListClick(regions.content, '[data-calendar-start]', () =>
      this.viewModel.openGoalWorkspace()
    );
  }
}

export class CalendarModule implements UiModule {
  public readonly page: Page = 'calendar';
  private readonly viewModel: CalendarViewModel;
  private readonly view: CalendarView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new CalendarViewModel(root);
    this.view = new CalendarView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.view.render(this.viewModel.buildState(snapshot), regions);
  }
}
