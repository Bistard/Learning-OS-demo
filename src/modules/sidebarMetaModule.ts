import { ViewSnapshot } from '../viewModels/learningOsViewModel';

export class SidebarMetaModule {
  public render(snapshot: ViewSnapshot, host: HTMLElement): void {
    host.innerHTML = `
      <p class="eyebrow">自动收录</p>
      <p class="strong">${snapshot.knowledgeStats.totalItems}</p>
      <p class="microcopy">${snapshot.knowledgeStats.autoCaptureLabel}</p>
    `;
  }
}
