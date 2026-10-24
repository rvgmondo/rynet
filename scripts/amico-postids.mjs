// Writes src/lib/stock-import/amico-postids.json: every listing on Amico's old WordPress site,
// its address slug and its WordPress post number.
//
// Why: Rynet has matched Amico's cars on the post number since the first import. Amico's new
// site (Next + Payload) lists the same cars under the same slugs but has no post numbers, so
// this map, taken while the old site is still up, is what lets the new reader keep updating the
// same Rynet listings instead of hiding them all and listing them again. Run it again only while
// amicomotors.co.za still serves WordPress; after the cutover the old pages are gone.
//
//   node scripts/amico-postids.mjs
import { writeFileSync } from "node:fs";

const ORIGIN = "https://amicomotors.co.za";
const UA = "RynetStockReader/1.0 (+https://rynet.co.za)";
const sitemap = await (
  await fetch(`${ORIGIN}/listings-sitemap.xml`, { headers: { "user-agent": UA } })
).text();
const urls = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))].filter(
  (u) => /\/listings\/[^/]+\/?$/.test(u),
);
const map = {};
for (const url of urls) {
  const slug = url.match(/\/listings\/([^/?#]+)/)[1];
  const html = await (await fetch(url, { headers: { "user-agent": UA } })).text();
  const postId = html.match(/\bpostid-(\d+)\b/)?.[1];
  if (postId) map[slug] = postId;
  await new Promise((r) => setTimeout(r, 400));
}
writeFileSync(
  new URL("../src/lib/stock-import/amico-postids.json", import.meta.url),
  `${JSON.stringify(map, null, 2)}\n`,
);
console.log(`${Object.keys(map).length} of ${urls.length} listings mapped`);
