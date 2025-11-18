/**
 * Lightweight markdown renderer for previews inside the app.
 * Supports headings, unordered lists, inline code, and emphasis.
 */

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
  const escaped = escapeHtml(markdown).replace(/\r\n/g, '\n');
  const blocks = escaped.split(/\n{2,}/);
  const html = blocks
    .map((block) => renderBlock(block))
    .filter((block) => Boolean(block))
    .join('');
  return html || placeholder;
};

const renderBlock = (block: string): string => {
  const trimmed = block.trim();
  if (!trimmed) return '';
  if (/^#{1,3}\s+/.test(trimmed)) {
    const level = Math.min(3, trimmed.match(/^#+/)?.[0]?.length ?? 1);
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
  return `<p>${renderInline(trimmed).replace(/\n/g, '<br />')}</p>`;
};

const renderInline = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

