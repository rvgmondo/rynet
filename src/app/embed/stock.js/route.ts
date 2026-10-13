import { STOCK_EMBED_SCRIPT } from "@/lib/embed/stock-script";

/**
 * /embed/stock.js: the script behind the one-line stock embed. See src/lib/embed/stock-script.ts.
 *
 * Cached for an hour by browsers and Cloudflare. The script changes only on a deploy, and the
 * stock it draws comes from /api/stock/<slug>, which has its own, shorter cache.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(STOCK_EMBED_SCRIPT, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "access-control-allow-origin": "*",
    },
  });
}
