import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 *
 * Two policies, because the Payload admin and the public site have genuinely different
 * needs and giving the public site the admin's policy would be the weakest link.
 *
 * The admin bundles a code editor and Lexical, both of which need `eval`. That is a known
 * Payload constraint, and it is scoped to `/admin`, which sits behind auth and 2FA.
 *
 * The public site gets no `unsafe-eval`. It still carries `unsafe-inline` for scripts, and
 * the brief asks for nonces instead. That is a Phase 9 decision rather than an oversight,
 * and the trade-off is worth stating: a per-request nonce must appear in both the header
 * and the HTML, so it forces every page to render dynamically. On a site whose whole SEO
 * argument rests on cached server-rendered HTML and a sub-2s LCP, turning off caching to
 * tighten a header is a bad trade. The Phase 9 options are hash-based `strict-dynamic`,
 * which keeps caching, or nonces on the handful of genuinely dynamic routes only.
 */
const cspFor = (surface: "public" | "admin") =>
  [
    "default-src 'self'",
    // React's development build uses eval to reconstruct call stacks across the server and
    // client boundary, so dev needs it everywhere. Production does not, and does not get it
    // outside the admin.
    surface === "admin" || isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube-nocookie.com",
    `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za",
    "frame-ancestors 'none'",
  ]
    .concat(isDev ? [] : ["upgrade-insecure-requests"])
    .join("; ");

const sharedHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  /**
   * Cloudflare fronts this site and caches /_next/static/* as immutable. This id is appended
   * to every asset URL, so a fresh build's assets are new URLs that miss Cloudflare's cache
   * rather than serving a stale chunk. Bump it on any deploy that must force a re-fetch.
   */
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || "d20260824-1",
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    /*
     * The stylesheet goes into the document instead of beside it.
     *
     * On a throttled mid-range Android the linked stylesheet was the thing the first paint waited
     * for: it shared a 1.6Mbps link with the font, the photograph and every script, arrived about
     * a second in, and only then could the browser lay out a document it had already parsed. With
     * the CSS inline the first frame can be drawn from the HTML alone. Measured A/B on the same
     * server, five cold loads each: home 1840 to 1984ms down to 1392ms, /cars 1856ms down to
     * 1360ms. The cost is about 19KB of compressed CSS on every document, which a returning
     * visitor would otherwise have cached.
     */
    inlineCss: true,
  },

  images: {
    /*
     * The origin never resizes an image on request.
     *
     * It is a shared CloudLinux account with a hard cap on processes and CPU. With the optimiser
     * on, one browser loading the results page queued two dozen AVIF encodes of 1280px
     * photographs, the account hit its limit, and the live site answered every request with
     * "503 Service Unavailable" for minutes afterwards. The optimiser's cache also lives inside
     * .next, which every deploy replaces, so that was going to happen after every deploy.
     *
     * Payload writes the renditions once, at upload (thumbnail, card, gallery, hero in
     * src/collections/Media.ts), the demonstration photographs ship with a 640px card copy, and
     * the components ask for the rendition that fits through pick() in src/lib/vehicle-photo.ts.
     * So nothing is lost but on-the-fly format conversion, which this host cannot afford.
     */
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "rynet.co.za" },
      { protocol: "https", hostname: "**.rynet.co.za" },
      // Cloudflare R2 public bucket, set per environment.
      ...(process.env.NEXT_PUBLIC_MEDIA_HOSTNAME
        ? [{ protocol: "https" as const, hostname: process.env.NEXT_PUBLIC_MEDIA_HOSTNAME }]
        : []),
    ],
  },

  // Biome is the linter and runs as its own CI job. Next 16 removed `next lint` and the
  // `eslint` config key along with it, so there is nothing to disable here any more.

  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [...sharedHeaders, { key: "Content-Security-Policy", value: cspFor("admin") }],
      },
      {
        /**
         * Everything EXCEPT /admin.
         *
         * The negative lookahead is load-bearing. With a plain `/:path*` here, both rules
         * match an admin request and the second one wins, so `/admin` was served the public
         * policy with no `unsafe-eval` and the Payload admin died on a CSP error. It looked
         * fine in every check that did not actually read the response headers on that route.
         */
        source: "/((?!admin|preview/|p/).*)",
        headers: [...sharedHeaders, { key: "Content-Security-Policy", value: cspFor("public") }],
      },
      {
        /**
         * A dealership's website mockup (src/app/preview/[token]/route.ts).
         *
         * `sandbox` without `allow-same-origin` is the point: the mockup's own scripts run in an
         * origin of their own, so whatever is in the file can never reach Rynet's cookies,
         * storage or an admin's session. Its scripts, styles and fonts may come from the CDNs
         * mockups are built with, and its images from anywhere on https or inlined.
         */
        source: "/preview/:path*",
        headers: [
          ...sharedHeaders,
          {
            key: "Content-Security-Policy",
            value: [
              "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
              "default-src 'none'",
              "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
              "style-src 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
              "font-src https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
              "img-src https: data: blob:",
              "media-src https: data: blob:",
              "connect-src https:",
              "frame-src https://www.google.com https://www.youtube-nocookie.com https://player.vimeo.com",
              "form-action 'none'",
              "base-uri 'none'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // The same policy for the readable /p/<name> links.
        source: "/p/:path*",
        headers: [
          ...sharedHeaders,
          {
            key: "Content-Security-Policy",
            value: [
              "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
              "default-src 'none'",
              "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
              "style-src 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
              "font-src https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
              "img-src https: data: blob:",
              "media-src https: data: blob:",
              "connect-src https:",
              "frame-src https://www.google.com https://www.youtube-nocookie.com https://player.vimeo.com",
              "form-action 'none'",
              "base-uri 'none'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
