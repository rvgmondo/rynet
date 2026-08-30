import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za";

/**
 * robots.txt.
 *
 * The index policy from docs/SITEMAP.md, expressed as rules. The principle: a small set of
 * deliberately chosen facet SHAPES is indexable, and every other combination is a query
 * string that is crawlable but not indexable.
 *
 * Blocking the query strings here matters more than it looks. A faceted marketplace can
 * generate effectively unlimited URLs, and a crawler that finds them will spend its whole
 * budget on near-duplicates instead of on the listings. Cars.co.za blocks exactly these
 * patterns, and they have had longer to learn why.
 *
 * `noindex` in a meta tag and `Disallow` here do different jobs and both are needed: a
 * disallowed URL is never fetched, so its meta tag is never read. The facet pages that
 * should not be indexed but SHOULD pass link equity are noindex-follow in their metadata,
 * not disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Anything behind auth, or personal to one visitor.
          "/admin",
          "/portal",
          "/account",
          "/api/",

          // Filter and sort permutations. The indexable shapes are real paths under /cars,
          // and everything else arrives as a query string on one of them.
          "/cars?",
          "/*?sort=",
          "/*&sort=",
          "/*?page=",
          "/*&page=",
          "/*?minPrice=",
          "/*&minPrice=",
          "/*?maxPrice=",
          "/*&maxPrice=",
          "/*?make=",
          "/*&make=",
          "/*?body=",
          "/*?fuel=",
          "/*?transmission=",
          "/*?province=",

          // Comparison sets are per-visitor and infinite in combination.
          "/compare?",
        ],
      },
      {
        // These crawl aggressively and send no traffic worth the load on a shared host.
        userAgent: ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot", "DataForSeoBot", "Barkrowler"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
