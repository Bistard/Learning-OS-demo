/**
 * Markdown renderer built on the `marked` parser with KaTeX handling math.
 * Falls back to a placeholder whenever the markdown content is empty.
 */

import katex from 'katex';
import { marked, type TokenizerAndRendererExtension, type Tokens } from 'marked';

export interface MarkdownRenderOptions {
  emptyClassName?: string;
  emptyMessage?: string;
}

const DEFAULT_PLACEHOLDER_CLASS = 'note-preview-empty';
const DEFAULT_PLACEHOLDER_MESSAGE = '暂无内容，开始输入 Markdown 吧～';

interface MathToken extends Tokens.Generic {
  type: 'math-inline' | 'math-block';
  text: string;
}

const findInlineMathStart = (src: string): number | undefined => {
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] !== '$') {
      continue;
    }
    if (i + 1 < src.length && src[i + 1] === '$') {
      i += 1;
      continue;
    }
    if (i > 0 && src[i - 1] === '\\') {
      continue;
    }
    return i;
  }
  return undefined;
};

const inlineMathExtension: TokenizerAndRendererExtension = {
  name: 'math-inline',
  level: 'inline',
  start(src) {
    const index = findInlineMathStart(src);
    return typeof index === 'number' ? index : undefined;
  },
  tokenizer(src) {
    if (!src.startsWith('$') || src.startsWith('$$')) {
      return undefined;
    }
    let cursor = 1;
    let formula = '';
    while (cursor < src.length) {
      const char = src[cursor];
      if (char === '\\') {
        if (cursor + 1 < src.length && src[cursor + 1] === '$') {
          formula += '$';
          cursor += 2;
          continue;
        }
        formula += '\\';
        cursor += 1;
        continue;
      }
      if (char === '$') {
        return {
          type: 'math-inline',
          raw: src.slice(0, cursor + 1),
          text: formula.trim(),
        };
      }
      formula += char;
      cursor += 1;
    }
    return undefined;
  },
  renderer(token) {
    const mathToken = token as MathToken;
    if (!mathToken.text) return '';
    return `<span class="math-inline">${renderMath(mathToken.text, false)}</span>`;
  },
};

const blockMathExtension: TokenizerAndRendererExtension = {
  name: 'math-block',
  level: 'block',
  tokenizer(src) {
    if (!src.startsWith('$$')) {
      return undefined;
    }
    let cursor = 2;
    let formula = '';
    while (cursor < src.length) {
      const char = src[cursor];
      if (char === '\\') {
        if (cursor + 1 < src.length && src[cursor + 1] === '$') {
          formula += '$';
          cursor += 2;
          continue;
        }
        formula += '\\';
        cursor += 1;
        continue;
      }
      if (char === '$' && cursor + 1 < src.length && src[cursor + 1] === '$') {
        return {
          type: 'math-block',
          raw: src.slice(0, cursor + 2),
          text: formula.trim(),
        };
      }
      formula += char;
      cursor += 1;
    }
    return undefined;
  },
  renderer(token) {
    const mathToken = token as MathToken;
    if (!mathToken.text) return '';
    return `<div class="math-block">${renderMath(mathToken.text, true)}</div>`;
  },
};

marked.setOptions({
  gfm: true,
  breaks: true,
});

marked.use({
  extensions: [blockMathExtension, inlineMathExtension],
});

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
  const html = marked.parse(normalized);
  const rendered = typeof html === 'string' ? html.trim() : '';
  return rendered ? rendered : placeholder;
};

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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
