import { ViewSnapshot } from '../../../viewModels/learningOsViewModel';

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

export class SidebarMetaModule {
  public render(snapshot: ViewSnapshot, host: HTMLElement): void {
    const goal = snapshot.activeGoal;
    if (!goal) {
      host.innerHTML = `
        <div class="side-meta-empty">
          <p class="side-meta-placeholder">暂无目标</p>
        </div>
      `;
      return;
    }
    const progress = clampPercent(goal.progress.percent);
    const remainingDays = Math.max(0, goal.progress.remainingDays ?? 0);
    const remainingLabel = remainingDays > 0 ? `${remainingDays} 天` : '0 天';
    host.innerHTML = `
      <p class="side-meta-name">${goal.name}</p>
      <div class="side-meta-progress" role="img" aria-label="进度 ${progress}%">
        <span class="side-meta-label">进度</span>
        <div class="side-meta-progress-track">
          <div class="side-meta-progress-fill" style="width: ${progress}%"></div>
        </div>
        <span class="side-meta-value">${progress}%</span>
      </div>
      <div class="side-meta-remaining">
        <span class="side-meta-label">剩余</span>
        <span class="side-meta-value">${remainingLabel}</span>
      </div>
    `;
  }
}
