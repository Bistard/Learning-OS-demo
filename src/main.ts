import './style.css';

type Feature = {
  title: string;
  description: string;
  actionLabel: string;
};

const features: Feature[] = [
  {
    title: '快速启动',
    description: '基于 TypeScript + Vite 的零后端技术栈，几分钟即可跑通。',
    actionLabel: '运行 dev 服务器'
  },
  {
    title: '部署友好',
    description: '纯静态产物可直接发布到 GitHub Pages 或任意静态托管平台。',
    actionLabel: '推送 dist 目录'
  },
  {
    title: '渐进增强',
    description: '天然支持组件拆分、状态管理与第三方 UI 库的渐进式接入。',
    actionLabel: '扩展模块'
  },
  {
    title: '团队协作',
    description: '保持最简单的项目约定，方便团队成员理解与贡献。',
    actionLabel: '邀请同事'
  }
];

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('#app container not found');
}

const renderFeatureCards = (items: Feature[]) =>
  items
    .map(
      (feature) => `
        <article class="card">
          <h3 class="card__title">${feature.title}</h3>
          <p class="card__description">${feature.description}</p>
          <span class="hero__tag">${feature.actionLabel}</span>
        </article>
      `
    )
    .join('');

app.innerHTML = `
  <section class="shell">
    <header class="hero">
      <span class="hero__tag">
        <span>🚀</span>
        Learning OS Demo
      </span>
      <h1 class="hero__title">纯前端基础框架示例</h1>
      <p class="hero__description">
        使用 TypeScript + HTML + CSS + Vite 构建的最小可运行前端项目骨架。
        适合在 GitHub Pages 或任意静态资源平台部署。
      </p>
      <div class="hero__cta">
        <button id="primary-action" class="btn btn--primary">生成示例数据</button>
        <button id="secondary-action" class="btn btn--ghost">刷新页面主题</button>
      </div>
    </header>
    <section class="grid">
      ${renderFeatureCards(features)}
    </section>
    <section class="activity">
      <div>
        <p class="activity__status" data-activity-log>等待交互...</p>
        <div class="activity__time" data-activity-time>${new Date().toLocaleTimeString()}</div>
      </div>
      <button id="activity-button" class="btn btn--ghost">记录一次活动</button>
    </section>
  </section>
  <p class="credits">
    你正在查看一个支持 GitHub Pages 的前端最小开发骨架。自由修改 <code>src</code> 目录即可扩展真实业务。
  </p>
`;

const activityLog = document.querySelector<HTMLElement>('[data-activity-log]');
const activityTime = document.querySelector<HTMLElement>('[data-activity-time]');

const updateActivity = (message: string) => {
  if (!activityLog || !activityTime) {
    return;
  }

  const timestamp = new Date();
  activityLog.textContent = message;
  activityTime.textContent = timestamp.toLocaleTimeString();
};

document.querySelector('#activity-button')?.addEventListener('click', () => {
  updateActivity('收到一次模拟活动，状态刷新完成 ✅');
});

document.querySelector('#primary-action')?.addEventListener('click', () => {
  const nextFeature: Feature = {
    title: '自定义模块',
    description:
      '你可在 src 目录中添加任何自定义逻辑或组件，这些文件会被自动热更新。',
    actionLabel: `扩展于 ${new Date().toLocaleTimeString()}`
  };

  features.unshift(nextFeature);
  const grid = document.querySelector<HTMLElement>('.grid');
  if (grid) {
    grid.innerHTML = renderFeatureCards(features);
  }
  updateActivity('新增一个示例功能卡片 ✨');
});

document.querySelector('#secondary-action')?.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  document.body.style.background = isDark
    ? 'radial-gradient(circle at top, #0f172a, #0b1120)'
    : 'radial-gradient(circle at top, #fefefe, #f4f6fb 45%, #e7ebf4 100%)';

  updateActivity(isDark ? '切换到夜间主题 🌙' : '切换回日间主题 ☀️');
});
