import { Page } from '../models/learningOsModel';
import { ViewSnapshot } from '../viewModels/learningOsViewModel';

export interface RenderRegions {
  content: HTMLElement;
  sidebar: HTMLElement;
  header?: HTMLElement;
}

export interface UiModule {
  readonly page: Page;
  render(snapshot: ViewSnapshot, regions: RenderRegions): void;
}
