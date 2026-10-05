/**
 * Just enough HTML reading to lift a car off a page.
 *
 * Rynet has no HTML parser and does not need one for this. A stock import reads a handful of
 * known shapes out of one theme's markup, and every one of them is a tag with a class and some
 * text inside it. A parser would be a dependency, a bundle and a new way for a page to crash the
 * import; these six functions are pure, tested, and fail by returning nothing.
 *
 * They are deliberately forgiving. A dealership's website is not an API: attributes come in any
 * order, quotes come single or double, and whitespace is wherever the theme left it.
 */

/**
 * The named entities WordPress and its themes actually print, decoded to the character they
 * stand for. Typography that Rynet does not use is then turned into what a keyboard types by
 * `plainTypography`, whichever way it arrived: as a named entity, a numbered one or the character.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  laquo: "\u00ab",
  raquo: "\u00bb",
  bull: "\u2022",
  middot: "\u00b7",
  times: "\u00d7",
  deg: "\u00b0",
  eacute: "\u00e9",
  egrave: "\u00e8",
  euml: "\u00eb",
  ouml: "\u00f6",
  uuml: "\u00fc",
};

/** The character a numbered entity names, or the entity untouched when it names none. */
function character(code: number, whole: string): string {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : whole;
}

/** Turns `&amp;`, `&#39;` and `&#x2019;` back into characters, and plain typography after that. */
export function decodeEntities(input: string): string {
  const decoded = input
    .replace(/&#x([0-9a-f]+);/gi, (whole, hex: string) =>
      character(Number.parseInt(hex, 16), whole),
    )
    .replace(/&#(\d+);/g, (whole, dec: string) => character(Number.parseInt(dec, 10), whole))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
  return plainTypography(decoded);
}

/**
 * Typography written the way the rest of Rynet writes it.
 *
 * A dealership's description becomes copy on Rynet's own pages, and Rynet's copy uses no long
 * dashes, no ellipsis character and no middle dots. So a dash between words becomes a spaced
 * hyphen, an ellipsis becomes three full stops, a bullet or middle dot used as a separator becomes
 * a spaced hyphen, curly quotes become straight ones and a non-breaking space becomes a space.
 * Letters with accents are left alone: a Mégane is spelt that way.
 */
export function plainTypography(input: string): string {
  return input
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]*[\u2013\u2014][ \t]*/g, " - ")
    .replace(/\u2026/g, "...")
    .replace(/[ \t]*[\u00b7\u2022][ \t]*/g, " - ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

/** Every space, tab and newline run becomes one space, and the ends are trimmed. */
export function collapse(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Tags out, entities decoded, whitespace collapsed. Block tags leave a space behind them. */
export function textOf(html: string): string {
  const spaced = html
    .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "");
  return collapse(decodeEntities(spaced));
}

/** The inner HTML of the first element carrying this class, or null. */
export function blockWithClass(html: string, className: string): string | null {
  const opening = new RegExp(
    `<([a-z0-9]+)[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`,
    "i",
  );
  const start = opening.exec(html);
  if (!start) return null;

  const tag = start[1]?.toLowerCase();
  if (!tag) return null;

  // Walk forward counting the same tag in and out, so a nested div does not end the block early.
  const scanner = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  scanner.lastIndex = start.index + start[0].length;
  let depth = 1;
  let step = scanner.exec(html);
  while (step) {
    depth += step[1] === "/" ? -1 : 1;
    if (depth === 0) {
      return html.slice(start.index + start[0].length, step.index);
    }
    step = scanner.exec(html);
  }
  return html.slice(start.index + start[0].length);
}

/** The text of every `<li>` inside a fragment, in order, with the empty ones dropped. */
export function listItems(html: string): string[] {
  return [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => textOf(match[1] ?? ""))
    .filter((text) => text.length > 0);
}

/** Every `<loc>` in a sitemap, in the order the sitemap gives them. */
export function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)]
    .map((match) => decodeEntities(match[1] ?? ""))
    .filter(Boolean);
}
