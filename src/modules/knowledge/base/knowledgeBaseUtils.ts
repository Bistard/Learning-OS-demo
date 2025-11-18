const CATEGORY_TAIL_DROP_ID = '__category-tail__';
const DEFAULT_CATEGORY_COLOR = '#d4d4d8';
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const sanitizeHexColor = (value: string): string =>
  HEX_COLOR.test(value) ? value : DEFAULT_CATEGORY_COLOR;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export { CATEGORY_TAIL_DROP_ID, sanitizeHexColor, escapeHtml };

