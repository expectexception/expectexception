export const stripHtmlToText = (html: string): string => {
  if (!html) return '';

  // Browser-safe decode/strip
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  }

  // Fallback for non-DOM environments
  const tagRe = new RegExp('<[^>]*>', 'g');
  return html.replace(tagRe, ' ').replace(/\s+/g, ' ').trim();
};

export const excerptFromHtml = (html: string, length = 140): string => {
  const text = stripHtmlToText(html);
  return text.length > length ? text.substring(0, length) + '…' : text;
};
