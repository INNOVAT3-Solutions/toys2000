/**
 * MarketTime product descriptions often include simple HTML (<p>, <br>, etc.).
 */

export const hasHtmlMarkup = (text) => /<[a-z][\s\S]*>/i.test(text ?? '');

/** Strip tags for plain-text fallback (e.g. search snippets). */
export const descriptionToPlainText = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
