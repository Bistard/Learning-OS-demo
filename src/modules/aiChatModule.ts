import { Page } from '../models/learningOsModel';
import { LearningOsViewModel, ViewSnapshot } from '../viewModels/learningOsViewModel';
import { bindClick } from '../utils/dom';
import { RenderRegions, UiModule } from './types';

interface AiChatViewState {
  chatHistory: ViewSnapshot['chatHistory'];
}

class AiChatViewModel {
  constructor(private readonly root: LearningOsViewModel) {}

  public buildState(snapshot: ViewSnapshot): AiChatViewState {
    return { chatHistory: snapshot.chatHistory };
  }

  public sendChat(message: string): void {
    this.root.sendChat(message);
  }
}

class AiChatView {
  constructor(private readonly viewModel: AiChatViewModel) {}

  public render(state: AiChatViewState, regions: RenderRegions): void {
    const messages = state.chatHistory
      .map(
        (msg) => `
        <div class="chat-msg ${msg.role}">
          <p class="label">${msg.role === 'ai' ? '小墨' : '我'} · ${msg.timestamp}</p>
          <p>${msg.content}</p>
        </div>`
      )
      .join('');

    regions.content.innerHTML = `
      <section class="panel chat">
        <div class="panel-head">
          <p class="eyebrow">Step 5</p>
          <h3>AI 全程理解目标 + 内容 + 用户</h3>
          <p class="microcopy">AI 负责理解、收敛、分类，并不断给出下一条路径。</p>
        </div>
        <div class="chat-history">${messages}</div>
        <div class="chat-input">
          <textarea id="chat-input" placeholder="问小墨：接下来我该怎么学？"></textarea>
          <button class="btn primary" id="chat-send">发送</button>
        </div>
      </section>
    `;

    bindClick(regions.content, '#chat-send', () => {
      const textarea = regions.content.querySelector<HTMLTextAreaElement>('#chat-input');
      if (!textarea) return;
      this.viewModel.sendChat(textarea.value);
      textarea.value = '';
    });
  }
}

export class AiChatModule implements UiModule {
  public readonly page: Page = 'aiChat';
  private readonly viewModel: AiChatViewModel;
  private readonly view: AiChatView;

  constructor(root: LearningOsViewModel) {
    this.viewModel = new AiChatViewModel(root);
    this.view = new AiChatView(this.viewModel);
  }

  public render(snapshot: ViewSnapshot, regions: RenderRegions): void {
    this.view.render(this.viewModel.buildState(snapshot), regions);
  }
}
