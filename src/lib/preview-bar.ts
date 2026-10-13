/**
 * The thin Rynet Digital bar along the bottom of every mockup, and putting it into the page.
 *
 * It says whose work this is and how to answer, and nothing else: no price, no form. Written as
 * plain HTML with its own styles, scoped by one id, because it lands inside a page we did not
 * design for it and must neither break that page nor be broken by it.
 */

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function previewBar(options: { dealership: string; email: string }): string {
  const dealership = escapeHtml(options.dealership);
  const subject = encodeURIComponent(`The website mockup for ${options.dealership}`);
  return [
    '<div id="rn-preview-bar" role="note" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 16px;padding:10px 16px;background:#001123;color:#f3f6fa;font:500 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 -4px 16px rgba(0,0,0,.25)">',
    `<span>A website concept by <strong style="font-weight:700">Rynet Digital</strong>, made for ${dealership}. Private, and only you have this link.</span>`,
    `<a href="mailto:${escapeHtml(options.email)}?subject=${subject}" target="_blank" rel="noopener" style="color:#f3f6fa;font-weight:700;text-decoration:underline;text-underline-offset:3px">Reply to us</a>`,
    "</div>",
  ].join("");
}

/** The bar, placed just before </body>, or at the end when the page has none. */
export function withBar(html: string, bar: string): string {
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at === -1 ? `${html}${bar}` : `${html.slice(0, at)}${bar}${html.slice(at)}`;
}
