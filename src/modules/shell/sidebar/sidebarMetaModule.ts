import { ViewSnapshot } from '../../../viewModels/learningOsViewModel';

export class SidebarMetaModule {
  public render(snapshot: ViewSnapshot, host: HTMLElement): void {
    const summary = snapshot.dashboardSummary;
    host.innerHTML = `
      <p class="eyebrow">活跃目标</p>
      <p class="strong">${summary.activeGoals}</p>
      <p class="microcopy">总数 ${summary.totalGoals}</p>
    `;
  }
}
