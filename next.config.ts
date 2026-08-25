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

  images: {
    formats: ["image/avif", "image/webp"],
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
        source: "/:path*",
        headers: [...sharedHeaders, { key: "Content-Security-Policy", value: cspFor("public") }],
      },
    ];
  },
};

export default withPayload(nextConfig);
