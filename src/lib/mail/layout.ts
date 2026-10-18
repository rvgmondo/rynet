import { COMPANY } from "@/content/company";

/**
 * Every email Rynet sends, in one design: navy band with the wordmark, a white card, one red
 * button at most, and a plain footer. Built the way email has to be built (tables, inline styles,
 * no web fonts, no images it depends on), because Outlook still renders mail with Word and Gmail
 * strips anything in a <style> block it does not like.
 *
 * Every email also goes out as plain text, made from the same words, for the clients and the
 * people who read mail that way, and because a message with no text part looks like spam.
 *
 * THE BODY FORMAT
 *
 * Written by people in the admin's Mailer and by code, so it is deliberately tiny:
 *   a blank line starts a new paragraph
 *   a line starting "- " is a bullet
 *   **words** are bold
 *   [words](https://address) is a link
 * Everything is escaped first, so nothing typed into a template can become HTML.
 */

export type EmailContent = {
  /** The line inbox previews show beside the subject. */
  preheader?: string;
  heading: string;
  body: string;
  button?: { label: string; url: string } | null;
  /** Small print under the card: why they got it, and for bulk mail the unsubscribe link. */
  footnote?: string | null;
  unsubscribeUrl?: string | null;
};

const NAVY = "#001123";
const RED = "#e32432";
const INK = "#0f1b2d";
const BODY = "#334155";
const MUTED = "#5b6577";
const LINE = "#e2e6ec";
const PAGE = "#f3f5f8";
const FONT = "Arial, Helvetica, sans-serif";

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Inline marks on one escaped line: bold and links. Only http and https links survive. */
function inline(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${INK}">$1</strong>`)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      `<a href="$2" style="color:${INK};text-decoration:underline">$1</a>`,
    );
}

/** The body as HTML blocks. */
export function bodyHtml(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim());
      if (lines.every((line) => line.startsWith("- "))) {
        const items = lines
          .map((line) => `<li style="margin:0 0 8px">${inline(escapeHtml(line.slice(2)))}</li>`)
          .join("");
        return `<ul style="margin:0 0 18px;padding:0 0 0 20px;color:${BODY};font:16px/1.6 ${FONT}">${items}</ul>`;
      }
      return `<p style="margin:0 0 18px;color:${BODY};font:16px/1.6 ${FONT}">${lines
        .map((line) => inline(escapeHtml(line)))
        .join("<br>")}</p>`;
    })
    .join("");
}

/** The body as plain text: marks dropped, links written out. */
export function bodyText(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)");
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px"><tr><td style="border-radius:8px;background:${RED}"><a href="${escapeHtml(content.button.url)}" style="display:inline-block;padding:14px 26px;color:#ffffff;font:bold 16px/1 ${FONT};text-decoration:none;border-radius:8px">${escapeHtml(content.button.label)}</a></td></tr></table>`
    : "";
  const footnote = content.footnote
    ? `<p style="margin:0 0 8px">${inline(escapeHtml(content.footnote))}</p>`
    : "";
  const unsubscribe = content.unsubscribeUrl
    ? `<p style="margin:0 0 8px">Not useful? <a href="${escapeHtml(content.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline">Stop these emails</a>.</p>`
    : "";

  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(content.heading)}</title></head>
<body style="margin:0;padding:0;background:${PAGE}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preheader ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:${NAVY};border-radius:12px 12px 0 0;padding:22px 32px">
<span style="color:#ffffff;font:800 22px/1 ${FONT};letter-spacing:4px">RYNET</span><span style="display:inline-block;width:3px;height:18px;background:${RED};margin:0 0 -2px 12px"></span>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${LINE};border-top:0;border-radius:0 0 12px 12px;padding:32px">
<h1 style="margin:0 0 18px;color:${INK};font:800 26px/1.2 ${FONT}">${escapeHtml(content.heading)}</h1>
${bodyHtml(content.body)}
${button}
</td></tr>
<tr><td style="padding:20px 32px 8px;color:${MUTED};font:13px/1.6 ${FONT}">
${footnote}${unsubscribe}<p style="margin:0">${escapeHtml(COMPANY.tradingName)}, ${escapeHtml(COMPANY.town)}. <a href="mailto:${COMPANY.infoEmail}" style="color:${MUTED}">${COMPANY.infoEmail}</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    content.heading,
    "",
    bodyText(content.body),
    ...(content.button ? ["", `${content.button.label}: ${content.button.url}`] : []),
    "",
    "--",
    ...(content.footnote ? [bodyText(content.footnote)] : []),
    ...(content.unsubscribeUrl ? [`Stop these emails: ${content.unsubscribeUrl}`] : []),
    `${COMPANY.tradingName}, ${COMPANY.town}. ${COMPANY.infoEmail}`,
  ].join("\n");

  return { html, text };
}
