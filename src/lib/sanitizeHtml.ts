const blockedTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'meta', 'link'];

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const documentFragment = new DOMParser().parseFromString(html, 'text/html');
  blockedTags.forEach((tag) => documentFragment.querySelectorAll(tag).forEach((element) => element.remove()));
  documentFragment.querySelectorAll<HTMLElement>('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src' || name === 'action') && value.startsWith('javascript:'))) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return documentFragment.body.innerHTML;
}
