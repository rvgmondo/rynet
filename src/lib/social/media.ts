import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { formatRand } from "@/lib/format";

/**
 * The pictures Rynet posts, and where Meta fetches them from.
 *
 * Meta does not take an upload for Instagram: it takes an address and fetches the file itself,
 * from its own servers, later. So each picture is written to social-media/ under a long random
 * name and served publicly at /social-media/<name>.jpg (src/app/social-media). Every picture is
 * re-made as a 1080 pixel square sRGB JPEG first, because Instagram takes JPEG only, square is
 * inside its allowed shapes, and re-encoding means nothing a browser sent is passed on as it
 * arrived.
 */

export const SOCIAL_MEDIA_DIR = "social-media";
const SIZE = 1080;

export const isSocialFileName = (name: string): boolean => /^[a-f0-9]{32}\.jpg$/.test(name);

export function socialMediaPath(name: string): string {
  return path.join(process.cwd(), SOCIAL_MEDIA_DIR, path.basename(name));
}

/**
 * The public address Meta fetches from. PUBLIC_MEDIA_BASE wins when set, for a host whose own
 * address is not the one the internet sees.
 */
export function socialMediaUrl(name: string): string | null {
  const base = (process.env.PUBLIC_MEDIA_BASE || process.env.NEXT_PUBLIC_SERVER_URL || "").replace(
    /\/+$/,
    "",
  );
  if (!base) return null;
  return `${base}/social-media/${name}`;
}

/** Whether Meta could reach an address at all: never localhost or a private network. */
export function isPubliclyFetchable(url: string | null): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return false;
    return !hostname.endsWith(".local") && !hostname.endsWith(".test");
  } catch {
    return false;
  }
}

async function store(jpeg: Buffer): Promise<string> {
  const name = `${randomBytes(16).toString("hex")}.jpg`;
  await mkdir(path.join(process.cwd(), SOCIAL_MEDIA_DIR), { recursive: true });
  await writeFile(socialMediaPath(name), jpeg);
  return name;
}

/** A picture somebody made in the Ad studio, made safe and square, and stored. */
export async function storeAdImage(input: Buffer): Promise<string> {
  const jpeg = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(SIZE, SIZE, { fit: "cover" })
    .toColourspace("srgb")
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return store(jpeg);
}

/* ------------------------------------------------------------------ automatic posts */

const xml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Up to two lines of about `width` characters, the second cut short if it must be. */
export function wrapTitle(title: string, width = 24): string[] {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line = `${line} ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= 2) return lines;
  const second = lines.slice(1).join(" ");
  return [
    lines[0] ?? "",
    second.length > width ? `${second.slice(0, width - 1).trimEnd()}.` : second,
  ];
}

/**
 * The picture for a car posted automatically: its own photograph, square, with its name, its
 * price and the dealership across the bottom. Drawn on the server with sharp, because nobody has
 * a browser open when a new car goes live at two in the morning.
 */
export async function storeCarImage(
  photo: Buffer,
  car: { title: string; price: number | null; dealer: string; domain: string },
): Promise<string> {
  const lines = wrapTitle(car.title);
  const price = car.price ? formatRand(car.price).replace(/ /g, " ") : "";
  const family = "Archivo, Arial, Helvetica, sans-serif";
  const titleY = price ? 800 : 860;
  const overlay = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.45" stop-color="#001123" stop-opacity="0"/>
    <stop offset="1" stop-color="#001123" stop-opacity="0.94"/>
  </linearGradient></defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
  <rect x="64" y="${titleY - 96}" width="72" height="8" fill="#e32432"/>
  ${lines
    .map(
      (text, index) =>
        `<text x="64" y="${titleY - (lines.length - 1 - index) * 64}" font-family="${family}" font-size="56" font-weight="800" fill="#ffffff">${xml(text)}</text>`,
    )
    .join("\n  ")}
  ${price ? `<text x="64" y="${titleY + 92}" font-family="${family}" font-size="72" font-weight="800" fill="#ffffff">${xml(price)}</text>` : ""}
  <text x="64" y="1024" font-family="${family}" font-size="30" font-weight="600" fill="#d7dce3">${xml(car.dealer)}</text>
  <text x="${SIZE - 64}" y="1024" text-anchor="end" font-family="${family}" font-size="30" font-weight="700" fill="#ffffff">${xml(car.domain)}</text>
</svg>`;

  const jpeg = await sharp(photo, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(SIZE, SIZE, { fit: "cover" })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .toColourspace("srgb")
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return store(jpeg);
}

/** A car photograph's bytes, from local disk or from R2, whichever the media lives on. */
export async function photoBytes(url: string): Promise<Buffer> {
  if (/^https?:\/\//.test(url)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`The photograph could not be fetched (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
  }
  // A local upload is served at /api/media/file/<name>; the file is media/<name>.
  const name = decodeURIComponent(path.basename(url.split("?")[0] ?? ""));
  return readFile(path.join(process.cwd(), "media", name));
}
