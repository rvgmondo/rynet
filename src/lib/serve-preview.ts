import { readFile } from "node:fs/promises";
import path from "node:path";

import config from "@payload-config";
import { getPayload, type Where } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { COMPANY } from "@/content/company";
import { previewBar, withBar } from "@/lib/preview-bar";
import { isExpired } from "@/lib/preview-link";

/**
 * Serves a dealership's website mockup, for both link shapes: /p/<name> and the older
 * /preview/<code>.
 *
 * WHAT KEEPS THIS SAFE
 *
 * The mockup is a whole HTML page with its own scripts, so it is served under a CSP `sandbox` (set
 * for /p and /preview in next.config.ts): its scripts run in an origin of their own, with no
 * access to Rynet's cookies, storage or an admin session. It is hidden from search engines, never
 * cached by a shared cache, and sends no referrer.
 *
 * EXPIRY
 *
 * Past its end date a link shows a short note instead of the mockup, so a forwarded or guessed
 * link stops working once the conversation is over. Rynet staff always see the mockup itself,
 * ended or not, so it can be checked before a link is extended.
 *
 * WHAT IT RECORDS
 *
 * The first and latest open and how many, never counting staff. An unknown link gets the same
 * plain "not found" as one that never existed.
 */

type PreviewRow = {
  id: number;
  filename?: string | null;
  dealership?: string | null;
  firstViewedAt?: string | null;
  viewCount?: number | null;
  expiresAt?: string | null;
};

const HEADERS = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
};

export function previewNotFound(): Response {
  return new Response("This preview is not available.", {
    status: 404,
    headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" },
  });
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** The note an ended link shows. Plain, self-contained, and still noindex. */
export function endedPage(dealership: string): string {
  const name = escapeHtml(dealership);
  const email = escapeHtml(COMPANY.salesEmail);
  const subject = encodeURIComponent(`A fresh link for the ${dealership} mockup`);
  return `<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>This preview has ended</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#001123;color:#f3f6fa;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px">
<main style="max-width:32rem">
<p style="margin:0 0 8px;color:#b1b4bb;font-size:13px;letter-spacing:.08em;text-transform:uppercase">Rynet Digital</p>
<h1 style="margin:0 0 12px;font-size:28px;line-height:1.2">This preview has ended</h1>
<p style="margin:0 0 20px;color:#d7dce3">It was a website concept made for ${name}. If you would like another look, ask us and we will send a fresh link.</p>
<a href="mailto:${email}?subject=${subject}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#e32432;color:#fff;font-weight:700;text-decoration:none">Ask for a fresh link</a>
</main></body></html>`;
}

/**
 * Who is opening the link, if they are signed in.
 *
 * Payload trusts its login cookie only on requests that look same-site (an Origin it knows, or
 * Sec-Fetch-Site same-origin, same-site or none). A mockup link is opened from an email client or
 * webmail, so Rynet staff checking one arrive cross-site, or through a proxy that drops those
 * headers, and Payload sees a stranger: the open was counted against the dealership. That rule
 * protects requests that change something; this one only decides whether to count a view and
 * whether an ended link may still be shown to staff, so the cookie is read here directly.
 */
async function viewer(payload: Awaited<ReturnType<typeof getPayload>>, request: Request) {
  const { user } = await payload.auth({ headers: request.headers }).catch(() => ({ user: null }));
  if (user) return user;
  const cookie = request.headers.get("cookie") ?? "";
  const name = `${payload.config.cookiePrefix}-token=`;
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(name))
    ?.slice(name.length);
  if (!token) return null;
  const headers = new Headers({ Authorization: `JWT ${decodeURIComponent(token)}` });
  return (await payload.auth({ headers }).catch(() => ({ user: null }))).user;
}

export async function servePreview(request: Request, where: Where): Promise<Response> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "previews",
    where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const preview = found.docs[0] as PreviewRow | undefined;
  if (!preview?.filename) return previewNotFound();

  const staff = isPlatformStaff(await viewer(payload, request));
  const dealership = preview.dealership ?? "your dealership";

  if (!staff && isExpired(preview.expiresAt)) {
    return new Response(endedPage(dealership), {
      status: 410,
      headers: { ...HEADERS, "content-type": "text/html; charset=utf-8" },
    });
  }

  const upload = payload.collections.previews?.config.upload;
  const staticDir = path.resolve(
    process.cwd(),
    (upload && typeof upload === "object" && upload.staticDir) || "previews",
  );
  // The stored name, never anything from the request, and never outside the folder.
  const file = path.join(staticDir, path.basename(preview.filename));

  let html: string;
  try {
    html = await readFile(file, "utf8");
  } catch {
    return previewNotFound();
  }

  if (!staff) {
    const now = new Date().toISOString();
    // Straight to the row: no version, no hooks, and nothing that can fail the page.
    await payload.db
      .updateOne({
        collection: "previews",
        id: preview.id,
        data: {
          firstViewedAt: preview.firstViewedAt ?? now,
          lastViewedAt: now,
          viewCount: (preview.viewCount ?? 0) + 1,
        },
      })
      .catch((error: unknown) =>
        payload.logger.error({ err: error, msg: "preview view not recorded" }),
      );
  }

  return new Response(withBar(html, previewBar({ dealership, email: COMPANY.salesEmail })), {
    status: 200,
    headers: { ...HEADERS, "content-type": "text/html; charset=utf-8" },
  });
}
