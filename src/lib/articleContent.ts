export const DEFAULT_ARTICLE_FONT_SIZE = 18;
export const MIN_ARTICLE_FONT_SIZE = 14;
export const MAX_ARTICLE_FONT_SIZE = 30;
export const ARTICLE_FONT_SIZE_STEP = 2;

function clampFontSize(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_ARTICLE_FONT_SIZE;
  return Math.min(MAX_ARTICLE_FONT_SIZE, Math.max(MIN_ARTICLE_FONT_SIZE, Math.round(value)));
}

export function extractArticleContent(content: string | null | undefined) {
  const source = content || '';
  const match = source.match(/^\s*<div[^>]*data-article-font-size=["'](\d+)["'][^>]*>([\s\S]*)<\/div>\s*$/i);
  if (!match) return { html: source, fontSize: DEFAULT_ARTICLE_FONT_SIZE };
  return { html: match[2], fontSize: clampFontSize(Number(match[1])) };
}

export function serializeArticleContent(html: string, fontSize: number) {
  return `<div data-article-font-size="${clampFontSize(fontSize)}">${html}</div>`;
}

export function normalizeArticleFontSize(value: number) {
  return clampFontSize(value);
}
