/**
 * Binds navigation interactions for the Learning OS shell.
 */
import { Page } from '../../models/learningOsModel';
import { LearningOsViewModel } from '../../viewModels/learningOsViewModel';

export const bindNavigation = (
  shell: HTMLElement,
  viewModel: LearningOsViewModel,
  registerNavButton: (page: Page, button: HTMLButtonElement) => void
): void => {
  const brand = shell.querySelector<HTMLElement>('[data-nav-home]');
  brand?.addEventListener('click', () => viewModel.navigate('goalDashboard'));
  brand?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      viewModel.navigate('goalDashboard');
    }
  });

  shell.querySelectorAll<HTMLButtonElement>('.side-link').forEach((button) => {
    const page = button.dataset.page as Page;
    registerNavButton(page, button);
    button.addEventListener('click', () => viewModel.navigate(page));
  });
};
