import { UploadItem, XiaoMoState } from '../models/xiaoMoModels';

type StatusCopyFn = (status: string) => string;
type CtaCopyFn = (type: string) => string;

/**
 * Renders the landing hero section aligned with the latest design doc.
 */
export const renderLanding = (): string => `
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">小墨 · 考前 3 天冲刺</p>
      <h1>墨色系统思考，72 小时完成线性代数冲刺</h1>
      <p class="sub">上传资料 30 秒生成小墨专属任务树，配合拍照批改、错题本与模拟考。</p>
      <div class="cta-group">
        <button class="btn primary" id="start-btn">开始冲刺（72 小时）</button>
        <button class="btn ghost" id="view-flow">查看示例任务树</button>
      </div>
      <div class="tip-card">
        <p class="tip-title">今日建议</p>
        <p class="tip-copy">先整理资料 5 分钟，再进入任务树。</p>
      </div>
    </div>
    <div class="hero-card">
      <div class="droplet-mascot" aria-hidden="true"></div>
      <p class="mascot-caption">小墨墨滴助手已递出任务树草图</p>
      <ul>
        <li>72 小时倒计时</li>
        <li>拍照批改 + 错题本</li>
        <li>终局模拟考</li>
      </ul>
    </div>
  </section>
`;

/**
 * Renders the upload page.
 */
export const renderUpload = (items: UploadItem[]): string => {
  const uploadedCount = items.filter((item) => item.status === 'uploaded').length;
  const progress = Math.round((uploadedCount / items.length) * 100);
  return `
    <section class="panel">
      <header class="panel-head">
        <div>
          <p class="eyebrow">资料上传</p>
          <h2>已上传 ${uploadedCount} / ${items.length} 项</h2>
          <p class="sub">资料越完整，小墨的任务树就越贴合你的课程与考试。</p>
        </div>
      </header>
      <div class="progress-line">
        <span>整体进度 ${progress}%</span>
        <div class="bar" data-progress="${progress}"></div>
      </div>
      <div class="upload-grid">
        <div class="dropzone">
          <p>拖拽或选择文件</p>
          <p class="hint">支持批量上传 · PDF / PNG / ZIP</p>
          <button class="btn primary" id="upload-all">模拟上传全部</button>
        </div>
        <div class="file-list">
          ${items
            .map(
              (item) => `
                <article class="file-card ${item.status}">
                  <div>
                    <h4>${item.name}</h4>
                    <p>${item.type} · ${item.pages} 页 · ${item.size}</p>
                  </div>
                  <span class="status-pill">${item.status === 'uploaded' ? '已完成' : '待上传'}</span>
                </article>
              `,
            )
            .join('')}
        </div>
        <aside class="upload-aside">
          <div class="droplet-mascot small" aria-hidden="true"></div>
          <h4>墨滴提示</h4>
          <p>这些资料会用于生成个性化任务树与拍照批改参考。</p>
        </aside>
      </div>
      <footer class="panel-foot">
        <button class="btn ghost" data-nav="landing">返回首页</button>
        <button class="btn primary" id="next-config" ${uploadedCount < items.length ? 'disabled' : ''}>下一步（开始配置）</button>
      </footer>
    </section>
  `;
};

/**
 * Renders the questionnaire modal.
 */
export const renderQuestionnaire = (state: Readonly<XiaoMoState>, defaultDeadline: string): string => {
  const q = state.questionnaire;
  return `
    <section class="panel overlay">
      <div class="overlay-card">
        <h2>预冲刺配置</h2>
        <p class="sub">填写真实时间安排，小墨会自动调整节点数量与优先级。</p>
        <form id="q-form" class="form-grid">
          <label>完成日期时间
            <input type="datetime-local" name="deadline" value="${defaultDeadline}" />
          </label>
          <label>每天可学习时长（小时）
            <input type="range" name="daily" min="1" max="8" step="0.5" value="${q.dailyHours}" />
            <span class="value" id="daily-value">${q.dailyHours} h</span>
          </label>
          <label>考试时长（分钟）
            <input type="number" name="duration" value="${q.examDuration}" min="30" max="240" />
          </label>
          <label class="switch-row">是否为特定学校课程
            <input type="checkbox" name="school" ${q.isSchoolCourse ? 'checked' : ''} />
            <span class="switch"></span>
          </label>
          <label>偏好模式
            <select name="mode">
              <option value="知识获取 + 备考" ${q.mode === '知识获取 + 备考' ? 'selected' : ''}>知识获取 + 备考</option>
              <option value="快速应试" ${q.mode === '快速应试' ? 'selected' : ''}>快速应试</option>
            </select>
          </label>
          <label class="switch-row">是否包含 AI 押题
            <input type="checkbox" name="predict" ${q.aiPrediction ? 'checked' : ''} />
            <span class="switch"></span>
          </label>
          <p class="warning" id="warning"></p>
          <div class="form-actions">
            <button type="button" class="btn ghost" data-nav="upload">返回上传</button>
            <button type="submit" class="btn primary" id="generate">生成任务树（系统思考）</button>
          </div>
        </form>
        <div class="loading" id="loading" hidden>
          <div class="dots"><span></span><span></span><span></span></div>
          <p>系统思考中 · 正在布局 72 小时冲刺路径</p>
        </div>
      </div>
    </section>
  `;
};

/**
 * Renders the personalized task tree view.
 */
export const renderTaskTree = (
  state: Readonly<XiaoMoState>,
  countdown: string,
  statusCopy: StatusCopyFn,
  ctaCopy: CtaCopyFn,
): string => {
  const completed = state.tasks.filter((t) => t.status === 'complete').length;
  const progress = Math.round((completed / state.tasks.length) * 100) || 0;
  return `
    <section class="panel task-panel">
      <header class="task-head">
        <div class="progress-ring" style="--progress:${progress}%">
          <span class="ring-label">整体完成率</span>
          <strong>${progress}%</strong>
        </div>
        <div class="countdown-card">
          <p class="eyebrow">距考试</p>
          <p class="countdown" id="countdown">${countdown}</p>
        </div>
        <div class="quick-actions">
          <button class="pill-btn" id="open-review">复习计划</button>
          <button class="pill-btn" id="open-mock">模拟考入口</button>
        </div>
      </header>
      <div class="task-layout">
        <aside class="task-sidebar">
          <h4>筛选视图</h4>
          <label><input type="checkbox" checked /> 难度 · 高</label>
          <label><input type="checkbox" checked /> 难度 · 中</label>
          <label><input type="checkbox" /> 难度 · 低</label>
          <label><input type="checkbox" checked /> 必考章节</label>
          <div class="view-toggle">
            <button class="pill-btn active">任务树</button>
            <button class="pill-btn" disabled>列表（规划中）</button>
          </div>
        </aside>
        <div class="task-grid">
          ${state.tasks
            .map(
              (task) => `
                <article class="task-card ${task.status} ${task.type}" data-id="${task.id}">
                  <div class="task-top">
                    <span class="pill ${task.difficulty}">${task.difficulty}</span>
                    <span class="pill timing">${task.eta} 分钟</span>
                  </div>
                  <h3>${task.title}</h3>
                  <p class="meta">${task.summary}</p>
                  <div class="status-row">
                    <span class="ring ${task.status}"></span>
                    <span>${statusCopy(task.status)}</span>
                  </div>
                  <div class="hover-actions">
                    <span>去练习</span>
                    <span>跳过（降优先级）</span>
                  </div>
                  <button class="btn small ${task.status === 'locked' ? 'disabled' : 'primary'}" ${task.status === 'locked' ? 'disabled' : ''}>
                    ${ctaCopy(task.type)}
                  </button>
                </article>
              `,
            )
            .join('')}
        </div>
      </div>
      <footer class="panel-foot">
        <p class="microcopy">完成节点会触发墨色闪烁 + XP 徽章提示。</p>
        <button class="btn ghost" id="to-complete">跳转到完成页（演示）</button>
      </footer>
    </section>
  `;
};
