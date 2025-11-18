/**
 * Application entry: wires the MVVM layers together and bootstraps the view.
 *
 * Usage:
 * ```ts
 * // main.ts (Vite entry)
 * bootstrap();
 * ```
 */

import './styles.css';
import 'katex/dist/katex.min.css';
import { LearningOsViewModel } from './viewModels/learningOsViewModel';
import { LearningOsView } from './views/learningOsView';

const bootstrap = () => {
  const viewModel = new LearningOsViewModel();
  new LearningOsView('app', viewModel);
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
