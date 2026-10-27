/* Allowlist HTML sanitiser for job descriptions, built on the Workers HTMLRewriter (streaming, no DOM).
   Keeps simple text structure, drops anything active, strips every attribute except safe link hrefs. */

const ALLOWED = new Set(['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h3', 'h4', 'a', 'blockquote']);
/** Removed together with their content. */
const DROPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'img', 'picture', 'svg', 'math', 'form', 'input', 'button',
  'select', 'textarea', 'video', 'audio', 'canvas', 'noscript', 'template', 'link', 'meta', 'base', 'head', 'title']);
/** Page-level headings would clash with the job title, so they are demoted. */
const RENAMED: Record<string, string> = { h1: 'h3', h2: 'h3', h5: 'h4', h6: 'h4' };

const MAX_INPUT = 120_000;

export async function sanitizeHtml(html: string): Promise<string> {
  const rewriter = new HTMLRewriter()
    .on('*', {
      element(el) {
        const tag = el.tagName.toLowerCase();
        if (DROPPED.has(tag)) { el.remove(); return; }
        const final = RENAMED[tag] ?? tag;
        if (final !== tag) el.tagName = final;
        if (!ALLOWED.has(final)) { el.removeAndKeepContent(); return; }
        const href = final === 'a' ? el.getAttribute('href') : null;
        for (const [name] of [...el.attributes]) el.removeAttribute(name);
        if (final !== 'a') return;
        if (href && /^https?:\/\//i.test(href.trim())) {
          el.setAttribute('href', href.trim());
          el.setAttribute('rel', 'noopener noreferrer nofollow');
          el.setAttribute('target', '_blank');
        } else {
          el.removeAndKeepContent();
        }
      },
    })
    .onDocument({ comments(c) { c.remove(); } });

  const out = await rewriter.transform(new Response(html.slice(0, MAX_INPUT), { headers: { 'Content-Type': 'text/html' } })).text();
  // Empty paragraphs left behind by removed wrappers.
  return out.replace(/<p>(\s|&nbsp;|<br>)*<\/p>/gi, '').trim();
}
