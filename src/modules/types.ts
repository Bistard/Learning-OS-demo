import { Page } from '../models/learningOsModel';
import { ViewSnapshot } from '../viewModels/learningOsViewModel';

export interface RenderRegions {
  header: HTMLElement;
  content: HTMLElement;
  sidebar: HTMLElement;
}

export interface UiModule {
  readonly page: Page;
  render(snapshot: ViewSnapshot, regions: RenderRegions): void;
}
