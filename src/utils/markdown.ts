/**
 * Lightweight markdown renderer for previews inside the app.
 * Supports headings, unordered lists, inline code, emphasis, and math.
 */

import katex from 'katex';

export interface MarkdownRenderOptions {
  emptyClassName?: string;
  emptyMessage?: string;
}

const DEFAULT_PLACEHOLDER_CLASS = 'note-preview-empty';
const DEFAULT_PLACEHOLDER_MESSAGE = '暂无内容，开始输入 Markdown 吧～';

export const renderMarkdown = (
  markdown: string,
  options: MarkdownRenderOptions = {}
): string => {
  const {
    emptyClassName = DEFAULT_PLACEHOLDER_CLASS,
    emptyMessage = DEFAULT_PLACEHOLDER_MESSAGE,
  } = options;
  const placeholder = `<p class="${emptyClassName}">${emptyMessage}</p>`;
  if (!markdown || !markdown.trim()) {
    return placeholder;
  }
  const normalized = markdown.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n{2,}/);
  const html = blocks
    .map((block) => renderBlock(block))
    .filter((block) => Boolean(block))
    .join('');
  return html.trim() ? html : placeholder;
};

const renderBlock = (rawBlock: string): string => {
  const trimmed = rawBlock.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
    const formula = trimmed.slice(2, -2).trim();
    return formula ? `<div class="math-block">${renderMath(formula, true)}</div>` : '';
  }
  if (/^#{1,3}\s+/.test(trimmed)) {
    const headingMatch = trimmed.match(/^#+/);
    const level = Math.min(3, headingMatch ? headingMatch[0].length : 1);
    const content = trimmed.replace(/^#{1,3}\s+/, '');
    return `<h${level}>${renderInline(content)}</h${level}>`;
  }
  const lines = trimmed.split('\n');
  const isList = lines.every((line) => /^[-*]\s+/.test(line));
  if (isList) {
    const items = lines
      .map((line) => line.replace(/^[-*]\s+/, ''))
      .map((item) => `<li>${renderInline(item)}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  }
  return `<p>${renderInline(trimmed)}</p>`;
};

const renderInline = (text: string): string => {
  const tokens = tokenizeInlineMath(text);
  return tokens
    .map((token) =>
      token.type === 'math'
        ? `<span class="math-inline">${renderMath(token.value, false)}</span>`
        : renderFormattedText(token.value)
    )
    .join('');
};

const renderFormattedText = (value: string): string =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');

const renderMath = (formula: string, displayMode: boolean): string => {
  if (!formula.trim()) return '';
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',
    });
  } catch {
    return `<code class="math-error">${escapeHtml(formula)}</code>`;
  }
};

type InlineToken =
  | { type: 'math'; value: string }
  | { type: 'text'; value: string };

const tokenizeInlineMath = (text: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  let buffer = '';
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '\\' && i + 1 < text.length && text[i + 1] === '$') {
      buffer += '$';
      i += 2;
      continue;
    }
    if (char === '$') {
      if (i + 1 < text.length && text[i + 1] === '$') {
        buffer += '$$';
        i += 2;
        continue;
      }
      if (buffer) {
        tokens.push({ type: 'text', value: buffer });
        buffer = '';
      }
      let j = i + 1;
      let formula = '';
      let closed = false;
      while (j < text.length) {
        const next = text[j];
        if (next === '\\' && j + 1 < text.length && text[j + 1] === '$') {
          formula += '$';
          j += 2;
          continue;
        }
        if (next === '$') {
          closed = true;
          break;
        }
        formula += next;
        j += 1;
      }
      if (closed) {
        tokens.push({ type: 'math', value: formula.trim() });
        i = j + 1;
        continue;
      }
      buffer += `$${formula}`;
      i = j;
      continue;
    }
    buffer += char;
    i += 1;
  }
  if (buffer) {
    tokens.push({ type: 'text', value: buffer });
  }
  return tokens;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');




