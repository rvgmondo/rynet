import { readFile } from "node:fs/promises";
import path from "node:path";

import config from "@payload-config";
import { getPayload } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { AGENCY_EMAIL } from "@/components/agency/agency-content";
import { previewBar, withBar } from "@/lib/preview-bar";

/**
 * A dealership's website mockup, at the private link it was sent: /preview/<token>.
 *
 * WHAT KEEPS THIS SAFE
 *
 * The mockup is a whole HTML page with its own scripts, written by us but not checked line by
 * line the way the site is. So it is served under a Content-Security-Policy `sandbox` (set for
 * /preview in next.config.ts): its scripts run in an origin of their own, with no access to
 * Rynet's cookies, storage or admin session, whoever is looking at it. It is hidden from search
 * engines, never cached by a shared cache, and sends no referrer to the sites it links to.
 *
 * WHAT IT RECORDS
 *
 * The first and latest time the link was opened, and how often, which is the signal to call.
 * A view by signed-in Rynet staff is not counted, so checking a mockup before sending it does not
 * look like the dealership opening it.
 *
 * An unknown code gets the same plain "not found" as a code that once existed, so the route says
 * nothing about which codes are real.
 */

export const dynamic = "force-dynamic";

const notFound = () =>
  new Response("This preview is not available.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow" },
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return notFound();

  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "previews",
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const preview = found.docs[0] as
    | {
        id: number;
        filename?: string | null;
        dealership?: string | null;
        firstViewedAt?: string | null;
        viewCount?: number | null;
      }
    | undefined;
  if (!preview?.filename) return notFound();

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
    return notFound();
  }

  const { user } = await payload.auth({ headers: request.headers }).catch(() => ({ user: null }));
  if (!isPlatformStaff(user)) {
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

  const body = withBar(
    html,
    previewBar({ dealership: preview.dealership ?? "your dealership", email: AGENCY_EMAIL }),
  );

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "referrer-policy": "no-referrer",
    },
  });
}
