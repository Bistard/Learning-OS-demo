/**
 * @fileoverview Entry point for the XiaoMo demo. Bootstraps MVVM wiring.
 */

import './style.css';
import { XiaoMoViewModel } from './viewModel/xiaoMoViewModel';
import { XiaoMoView } from './view/xiaoMoView';

const bootstrap = (): void => {
  const root = document.getElementById('app');
  const chatPanel = document.getElementById('chat-panel');
  const toastArea = document.getElementById('toast-area');
  if (!root || !chatPanel || !toastArea) {
    throw new Error('Missing required containers');
  }
  const viewModel = new XiaoMoViewModel();
  new XiaoMoView(viewModel, root, toastArea, chatPanel);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
