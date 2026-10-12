import { MARK_PATHS, WORDMARK_PATH } from "@/components/brand/rynet-mark";

/**
 * The Ad studio's drawing: a dealership's car, or its whole showroom, as finished ad artwork on a
 * <canvas>, ready to post on Facebook, Instagram and WhatsApp.
 *
 * Ported from MotoHubSA's Ad studio, where it was proved, and redrawn in Rynet's own colours.
 *
 * WHY IN THE BROWSER
 *
 * Text has to be turned into pixels somewhere, and on this host that would mean sharp rendering
 * SVG through librsvg, a native library on a shared CloudLinux account that is already short of
 * memory. The browser of the person making the ad already has the font and the photographs, so
 * the artwork is drawn here and downloaded straight from the page. Nothing is uploaded.
 *
 * Every photograph is a same-origin /media address (vehicle-photo.ts rewrites them to paths), so
 * the canvas is never tainted and export works.
 */

export type AdFormat = {
  id: string;
  label: string;
  hint: string;
  w: number;
  h: number;
};

export const AD_FORMATS: AdFormat[] = [
  {
    id: "post",
    label: "Square post",
    hint: "Facebook, Instagram and WhatsApp groups",
    w: 1080,
    h: 1080,
  },
  {
    id: "story",
    label: "Story",
    hint: "Instagram and Facebook stories, WhatsApp status",
    w: 1080,
    h: 1920,
  },
  {
    id: "link",
    label: "Link image",
    hint: "Facebook page posts with a link, Marketplace, email",
    w: 1200,
    h: 630,
  },
];

export type AdContent = {
  headline: string;
  subline: string;
  /** "R 549 900", or null to leave the price off. */
  price: string | null;
  cta: string;
  domain: string;
  /** One photograph for a car, up to three for a showroom. */
  photos: HTMLImageElement[];
  dealerLogo: HTMLImageElement | null;
  siteLogo: HTMLImageElement | null;
  font: string;
};

// Rynet's navy, red and silver, from brand/.
const PANEL = "#001123";
const RED = "#e32432";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.74)";
const SILVER = "#b1b4bb";
const SEPARATOR = "  |  ";

/** The white lockup, as an SVG a canvas can draw. The same paths as the share card. */
export function lockupSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1282" height="228" viewBox="-30.6 -3.5 128.2 22.8">',
    '<g transform="translate(-30.5 -3.4) scale(0.2898)">',
    `<path fill="${SILVER}" d="${MARK_PATHS.gauge}"/>`,
    `<path fill="#f3f6fa" d="${MARK_PATHS.ink}"/>`,
    `<path fill="${RED}" d="${MARK_PATHS.redDash}${MARK_PATHS.needle}"/>`,
    "</g>",
    `<rect x="-2.8" y="0" width="0.8" height="18.4" fill="${RED}"/>`,
    `<path fill-rule="evenodd" fill="#f3f6fa" d="${WORDMARK_PATH}"/>`,
    "</svg>",
  ].join("");
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

export function loadLockup(): Promise<HTMLImageElement> {
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(lockupSvg())}`);
}

/* ------------------------------------------------------------------------------------ primitives */

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  // Cars are photographed side on with the ground in the lower third, so crop from just below
  // the middle rather than dead centre: less sky, never the wheels cut off.
  const sx = (img.naturalWidth - sw) / 2;
  const sy = Math.max(0, Math.min(img.naturalHeight - sh, (img.naturalHeight - sh) * 0.6));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** One photograph fills the area. Two or three (a showroom) become one large and the rest stacked. */
function drawPhotos(
  ctx: CanvasRenderingContext2D,
  photos: HTMLImageElement[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "#16263a";
  ctx.fillRect(x, y, w, h);
  const [first, ...rest] = photos;
  if (first && (rest.length === 0 || w < h * 1.1)) {
    drawCover(ctx, first, x, y, w, h);
  } else if (first) {
    const gap = Math.max(3, Math.round(Math.min(w, h) * 0.008));
    const mainW = Math.round(w * 0.62);
    drawCover(ctx, first, x, y, mainW, h);
    const stack = rest.slice(0, 2);
    const each = (h - gap * (stack.length - 1)) / stack.length;
    stack.forEach((img, i) => {
      drawCover(ctx, img, x + mainW + gap, y + i * (each + gap), w - mainW - gap, each);
    });
  }
  ctx.restore();
}

const font = (weight: number, size: number, family: string) =>
  `${weight} ${Math.round(size)}px ${family}`;

/**
 * Shorter versions of a line, best first. A detail line loses whole parts from the end, never half
 * a word. A headline loses its leading year before anything else, then words from the end. No
 * ellipsis: a shorter whole name reads better in an ad than half a name and three dots.
 */
function shorterVersions(text: string): string[] {
  const out = [text];
  if (text.includes(SEPARATOR)) {
    const parts = text.split(SEPARATOR);
    for (let n = parts.length - 1; n >= 1; n -= 1) out.push(parts.slice(0, n).join(SEPARATOR));
    return out;
  }
  let words = text.split(" ");
  if (words.length > 1 && /^\d{4}$/.test(words[0] ?? "")) {
    words = words.slice(1);
    out.push(words.join(" "));
  }
  for (let n = words.length - 1; n >= 1; n -= 1) out.push(words.slice(0, n).join(" "));
  return out;
}

function wrapAll(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(candidate).width <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Fits text into at most `maxLines` lines, shrinking the type first and shortening it last. */
function fitBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  start: number,
  min: number,
  weight: number,
  family: string,
): { lines: string[]; size: number } {
  const fits = (lines: string[]) =>
    lines.length <= maxLines && lines.every((line) => ctx.measureText(line).width <= maxWidth);
  for (let size = start; size >= min; size -= Math.max(1, Math.round(start / 60))) {
    ctx.font = font(weight, size, family);
    const lines = wrapAll(ctx, text, maxWidth);
    if (fits(lines)) return { lines, size };
  }
  ctx.font = font(weight, min, family);
  for (const candidate of shorterVersions(text)) {
    const lines = wrapAll(ctx, candidate, maxWidth);
    if (fits(lines)) return { lines, size: min };
  }
  return { lines: [shorterVersions(text).at(-1) ?? ""], size: min };
}

function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  weight: number,
  family: string,
) {
  const { lines, size } = fitBlock(ctx, text, maxWidth, 1, start, min, weight, family);
  return { text: lines[0] ?? "", size };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The price: navy on a white pill, with a short red rule before it. Returns its height. */
function pricePill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  family: string,
) {
  ctx.font = font(800, size, family);
  const padX = size * 0.5;
  const h = size * 1.5;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, w, h, h * 0.18);
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.fillRect(x, y + h * 0.18, Math.max(3, size * 0.1), h * 0.64);
  ctx.fillStyle = PANEL;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2 + size * 0.04);
  ctx.textBaseline = "alphabetic";
  return h;
}

function siteLogo(
  ctx: CanvasRenderingContext2D,
  c: AdContent,
  x: number,
  y: number,
  height: number,
  align: "left" | "right" = "left",
) {
  if (!c.siteLogo) return 0;
  const w = (c.siteLogo.naturalWidth / c.siteLogo.naturalHeight) * height;
  ctx.drawImage(c.siteLogo, align === "right" ? x - w : x, y, w, height);
  return w;
}

/** The dealership's logo on a white tile, so any logo reads on top of a photograph. */
function dealerChip(
  ctx: CanvasRenderingContext2D,
  c: AdContent,
  x: number,
  y: number,
  size: number,
) {
  if (!c.dealerLogo) return;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.12;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, size, size, size * 0.14);
  ctx.fill();
  ctx.restore();
  const pad = size * 0.1;
  const img = c.dealerLogo;
  const scale = Math.min((size - pad * 2) / img.naturalWidth, (size - pad * 2) / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
}

/** Darkens the top of a photograph so the white logo stays legible against a bright sky. */
function topShade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "rgba(0,17,35,0.78)");
  g.addColorStop(1, "rgba(0,17,35,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/* --------------------------------------------------------------------------------------- layouts */

/** Landscape (the link image): photograph left, navy panel right behind a slanted edge. */
function drawWide(ctx: CanvasRenderingContext2D, w: number, h: number, c: AdContent) {
  const split = w * 0.55;
  const dx = h * 0.2;
  drawPhotos(ctx, c.photos, 0, 0, split + dx, h);
  topShade(ctx, 0, 0, split, h * 0.32);

  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.moveTo(split + dx, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(split - dx, h);
  ctx.closePath();
  ctx.fill();

  const stripe = Math.max(5, h * 0.014);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(split + dx, 0);
  ctx.lineTo(split + dx + stripe, 0);
  ctx.lineTo(split - dx + stripe, h);
  ctx.lineTo(split - dx, h);
  ctx.closePath();
  ctx.fill();

  const u = h / 100;
  const pad = u * 8;
  const left = split + dx + pad * 0.7;
  const maxW = w - left - pad;

  dealerChip(ctx, c, pad * 0.8, pad * 0.8, u * 20);

  let y = pad;
  siteLogo(ctx, c, left, y, u * 8.5);
  y += u * 8.5 + u * 10;

  const head = fitBlock(ctx, c.headline, maxW, 2, u * 9.5, u * 6, 700, c.font);
  ctx.fillStyle = TEXT;
  ctx.font = font(700, head.size, c.font);
  for (const line of head.lines) {
    y += head.size;
    ctx.fillText(line, left, y);
    y += head.size * 0.16;
  }

  const sub = fitLine(ctx, c.subline, maxW, u * 5.2, u * 3.8, 500, c.font);
  y += sub.size + u * 2.5;
  ctx.font = font(500, sub.size, c.font);
  ctx.fillStyle = MUTED;
  ctx.fillText(sub.text, left, y);

  const ctaSize = u * 4.4;
  if (c.price)
    pricePill(ctx, c.price, left, h - pad - ctaSize - u * 6 - u * 7.5 * 1.5, u * 7.5, c.font);
  const cta = fitLine(ctx, `${c.cta}${SEPARATOR}${c.domain}`, maxW, ctaSize, u * 3.4, 600, c.font);
  ctx.font = font(600, cta.size, c.font);
  ctx.fillStyle = MUTED;
  ctx.fillText(cta.text, left, h - pad);
}

/** Square and portrait (posts and stories): photograph on top, navy panel below a tilted edge. */
function drawTall(ctx: CanvasRenderingContext2D, w: number, h: number, c: AdContent) {
  const u = Math.min(w, h) / 100;
  const pad = u * 6.5;
  const maxW = w - pad * 2;
  const portrait = w / h < 0.8;
  const tilt = u * 3.5;
  const stripe = u * 1.1;

  // Measure the panel first and give the photograph whatever is left, so the price can never sit
  // on top of the name however long the name is.
  const head = fitBlock(
    ctx,
    c.headline,
    maxW,
    portrait ? 3 : 2,
    portrait ? u * 10.5 : u * 7.2,
    u * 5,
    700,
    c.font,
  );
  const headH = head.lines.length * head.size * 1.16;
  const sub = fitLine(ctx, c.subline, maxW, portrait ? u * 5.4 : u * 4.2, u * 3.2, 500, c.font);
  const priceSize = portrait ? u * 10 : u * 6.4;
  const pillH = c.price ? priceSize * 1.5 : 0;
  const ctaSize = portrait ? u * 4.6 : u * 3.6;
  const needed =
    stripe +
    pad * 0.8 +
    headH +
    sub.size +
    u * 3 +
    (c.price ? u * 4 + pillH : 0) +
    u * 4 +
    ctaSize +
    pad;
  const edge = Math.min(h * 0.66, Math.max(h * 0.42, h - needed - tilt));

  drawPhotos(ctx, c.photos, 0, 0, w, edge + tilt);
  topShade(ctx, 0, 0, w, Math.min(h * 0.22, u * 28));

  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.moveTo(0, edge + tilt);
  ctx.lineTo(w, edge - tilt);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(0, edge + tilt);
  ctx.lineTo(w * 0.34, edge + tilt - tilt * 2 * 0.34);
  ctx.lineTo(w * 0.34, edge + tilt - tilt * 2 * 0.34 + stripe);
  ctx.lineTo(0, edge + tilt + stripe);
  ctx.closePath();
  ctx.fill();

  siteLogo(ctx, c, w - pad, pad * 0.9, u * 6.2, "right");
  dealerChip(ctx, c, pad, pad * 0.9, u * 16);

  let y = edge + tilt + stripe + pad * 0.8;
  ctx.font = font(700, head.size, c.font);
  ctx.fillStyle = TEXT;
  for (const line of head.lines) {
    y += head.size;
    ctx.fillText(line, pad, y);
    y += head.size * 0.16;
  }
  y += sub.size + u * 2.4;
  ctx.font = font(500, sub.size, c.font);
  ctx.fillStyle = MUTED;
  ctx.fillText(sub.text, pad, y);

  // Bottom up: the call to action, then the price. Spare height falls between the two groups.
  const bottom = h - pad;
  const cta = fitLine(ctx, `${c.cta}${SEPARATOR}${c.domain}`, maxW, ctaSize, u * 2.8, 600, c.font);
  ctx.font = font(600, cta.size, c.font);
  ctx.fillStyle = MUTED;
  ctx.fillText(cta.text, pad, bottom);
  if (c.price) {
    pricePill(
      ctx,
      c.price,
      pad,
      Math.max(y + u * 4, bottom - cta.size - u * 4 - pillH),
      priceSize,
      c.font,
    );
  }
}

/** Draws `content` into `canvas` at the format's full size. */
export function renderAd(canvas: HTMLCanvasElement, format: AdFormat, content: AdContent) {
  canvas.width = format.w;
  canvas.height = format.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, format.w, format.h);
  if (format.w / format.h >= 1.6) drawWide(ctx, format.w, format.h, content);
  else drawTall(ctx, format.w, format.h, content);
}

/** JPEG at 0.9: mostly photograph, and a fraction of the size of a PNG with no visible loss. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not make the image."));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.jpg`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      },
      "image/jpeg",
      0.9,
    );
  });
}
