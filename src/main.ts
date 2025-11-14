import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing root element #app');
}

const state = {
  counter: 0
};

const render = () => {
  root.innerHTML = `
    <main class="container">
      <header>
        <p class="eyebrow">Learning OS Demo</p>
        <h1>纯前端最小骨架</h1>
        <p class="lead">
          使用 TypeScript、HTML、CSS 和 Vite，体验一个最小可部署的前端项目。
        </p>
      </header>

      <section class="card">
        <h2>交互示例</h2>
        <p>点击按钮即可更新页面状态，演示基本的 DOM 操作与状态管理。</p>
        <div class="counter">
          <span>当前计数：</span>
          <strong data-count>${state.counter}</strong>
        </div>
        <button type="button" class="button" data-action="increment">
          点击增加计数
        </button>
      </section>

      <section class="card">
        <h2>你可以继续做什么？</h2>
        <ul>
          <li>在 <code>src/</code> 里添加更多模块或样式。</li>
          <li>把真实的业务逻辑接入到按钮事件中。</li>
          <li>使用 GitHub Pages 工作流自动部署。</li>
        </ul>
      </section>
    </main>
  `;

  root.querySelector<HTMLButtonElement>('[data-action="increment"]')?.addEventListener('click', () => {
    state.counter += 1;
    render();
  });
};

render();
