import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { buildDealerFeed } from "@/lib/dealer-feed";

/**
 * GET /api/stock/<dealer-slug>: a dealership's live stock as JSON, for its own website.
 *
 * Public on purpose and open to every origin (CORS *): it is exactly what the dealership's page on
 * rynet.co.za already shows, and the point is that any website can read it. Built at most once
 * every five minutes per dealership, and cacheable by Cloudflare for the same five minutes, so a
 * busy dealer website costs this host almost nothing.
 *
 * See src/lib/dealer-feed.ts for what is in it and what never is.
 */

export const dynamic = "force-dynamic";

/**
 * The address this request arrived on, so photographs and links in the feed point at the same
 * site the feed was read from. Falls back to the configured address when the headers say nothing
 * usable. Cached per address, so a request with a made-up Host only ever fills its own entry.
 */
function siteUrl(request: Request): string {
  const fallback = (process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za").replace(/\/$/, "");
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    ?.trim();
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return fallback;
  // Rynet's own address: the configured one, which is https, whatever the proxy in front said.
  if (host.toLowerCase() === new URL(fallback).host.toLowerCase()) return fallback;
  const proto = (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol)
    .split(",")[0]
    ?.replace(/:$/, "")
    .trim();
  return `${proto === "http" ? "http" : "https"}://${host}`;
}

const cachedFeed = unstable_cache(
  async (slug: string, site: string) => buildDealerFeed(await getPayload({ config }), slug, site),
  ["dealer-feed"],
  { revalidate: 300, tags: ["dealer-feed"] },
);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400",
};

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,190}$/.test(slug)) {
    return Response.json({ error: "No such dealership." }, { status: 404, headers: CORS });
  }

  const feed = await cachedFeed(slug, siteUrl(request));
  if (!feed) {
    return Response.json({ error: "No such dealership." }, { status: 404, headers: CORS });
  }

  return Response.json(feed, {
    headers: {
      ...CORS,
      "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
