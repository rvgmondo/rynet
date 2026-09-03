# STACK

Every version below was checked against the npm registry on 24 August 2026, not recalled.
Where I have deliberately not taken the newest release, the reason is stated.

Revised after the hosting decision: cPanel with Setup Node.js App, the same target as Amico and
Verboten. That removes Vercel and changes three pins.

## Runtime

| Thing | Pinned | Why |
|---|---|---|
| Node.js | **22.x** | What your cPanel offers, and Next 16 requires 20.9 or above. Node 24 is the current LTS but is not on the host, so pinning it would be pinning a fiction. `.nvmrc` and CI both use 22 so local, CI and production agree. |
| Package manager | **npm** | Not pnpm, as I originally proposed. cPanel's Setup Node.js App runs `npm install` from its own UI button and its virtual environment expects npm. Amico and Verboten both use npm for this reason, and a lockfile the host cannot read is worse than a slower install. |
| Database | **SQLite** (`rynet.db`) | Your cPanel's PostgreSQL is version 10, which Payload 3 does not support, and Payload does not support MySQL or MariaDB at all. The adapter switches on the connection string so a move to managed Postgres is a config change. The ceiling and the trigger to move are written up in `docs/ARCHITECTURE.md` section 3. |
| Process manager | Passenger via `server.cjs` | Ported from Amico, including the thread-pool caps that keep `sharp` and the SQLite client under CloudLinux's process limit. |

## Application

| Package | Pinned | Why |
|---|---|---|
| next | 16.3.2 | Current stable. Payload 3.88 declares `next: >=16.2.6 <17.0.0`, so this is a supported pair, verified from the published peer range rather than assumed. |
| react / react-dom | 19.2.8 | Required by Next 16. |
| payload | 3.88.0 | Current stable. Payload 4 exists only as canary and internal builds. |
| @payloadcms/next | 3.88.0 | Must match `payload` exactly. |
| @payloadcms/db-sqlite | 3.88.0 | The production adapter. |
| @payloadcms/db-postgres | 3.88.0 | Installed but dormant, selected only when `DATABASE_URI` starts with `postgres`. Same pattern as Amico and Verboten. Costs a few hundred kilobytes and buys a migration path. |
| @payloadcms/richtext-lexical | 3.88.0 | Lexical, with custom nodes for our block set. |
| @payloadcms/ui | 3.88.0 | Needed for custom admin field components. |
| @payloadcms/plugin-form-builder | 3.88.0 | Section 9's form builder, extended with our routing and consent fields. |
| @payloadcms/plugin-seo | 3.88.0 | SEO field group with live preview. We replace its title generator with our template system. |
| @payloadcms/plugin-redirects | 3.88.0 | Redirect manager. We add import/export and the automatic on-slug-change hook. |
| @payloadcms/plugin-nested-docs | 3.88.0 | Breadcrumbs and parent/child page URLs. |
| @payloadcms/plugin-search | 3.88.0 | Editorial search only. Vehicle search is our own layer. |
| @payloadcms/storage-s3 | 3.88.0 | Points at Cloudflare R2. Keeps tens of thousands of vehicle photos off the cPanel disk, which has an inode ceiling long before a disk one. |
| @payloadcms/email-nodemailer | 3.88.0 | SMTP through your existing cPanel mail, matching Amico and Verboten. Resend stays an option if deliverability disappoints, but shared-host SMTP is already configured and free. |
| graphql | 16.x | Payload peer requirement. |
| sharp | 0.35.3 | Image derivatives, metadata stripping, re-encode on upload. Pinned exactly, because this is the native module most likely to break on a host rebuild. |

## TypeScript: taking 5.9.3, not 7.0.2

The one place I am deliberately not taking the newest stable.

TypeScript 7.0.2 is stable (7.0 shipped 8 July 2026, Go-native, roughly 10x faster type checking).
But:

1. The 7.0 npm package ships the Go compiler and **drops `lib/typescript.js`**, the JavaScript
   compiler API. Next.js needs that API during `next build`. Next 16.3 works around it by shelling
   out to `tsc` behind `experimental.useTypeScriptCli`. That is an experimental flag on the single
   most important command in the pipeline, and on this host the build only runs locally, so a build
   failure is a deploy that cannot happen.
2. **typescript-eslint closed its TS7 support request as "not planned"**, and ESLint core is blocked
   behind it. Any type-aware lint rule stops working.
3. The stable programmatic API lands in **TypeScript 7.1, expected around October 2026**.

So **typescript 5.9.3** for v1, with a dated re-evaluation in `docs/ARCHITECTURE.md`.

## Styling, UI, motion

| Package | Pinned | Why |
|---|---|---|
| tailwindcss | 4.3.3 | CSS-first config. Every value comes from `@theme` tokens, so an arbitrary hex in a component is a lint failure, not a habit. |
| @tailwindcss/postcss | 4.3.3 | |
| Radix Primitives (per package) | current | Copy-in shadcn-style components we own and can patch. No `shadcn` runtime dependency. |
| motion | 13.1.1 | Successor to Framer Motion. Used sparingly: layout animation on filter results, shared element on card-to-detail. Route transitions use the native View Transitions API, not JS. |
| class-variance-authority | 0.7.1 | Variant contracts on components. |
| tailwind-merge / clsx | 3.6.1 / 2.1.1 | |
| next-themes | 0.4.6 | Light and dark without a flash. |

## Data, forms, validation

| Package | Pinned | Why |
|---|---|---|
| zod | 4.4.3 | One schema per contract, shared by client form, server action, REST route and the Payload field validator. |
| react-hook-form | 7.86.0 | |
| @hookform/resolvers | 5.9.1 | |
| nuqs | 2.10.0 | Typed URL search-param state. Search filters live in the URL, which is a hard requirement, and this keeps that honest without a bespoke serialiser. |
| date-fns | 4.4.0 | Trading hours, SLA timers, public holiday overrides. |

## Testing and CI

| Package | Pinned | Why |
|---|---|---|
| vitest | 4.1.11 | Units. The finance calculator gets exhaustive table-driven tests. |
| @playwright/test | 1.62.1 | End to end, including the adversarial dealer-isolation suite. |
| @axe-core/playwright | 4.13.0 | axe on every template inside the e2e run, so one CI job covers both. |
| @lhci/cli | 0.15.1 | Lighthouse CI against a local production build, since this host has no preview URLs. Hard budgets, red build blocks merge. |
| @biomejs/biome | 2.5.10 | Lint and format in one binary. Chosen over ESLint plus Prettier: one tool, one config, far faster in pre-commit, and no dependency on the TypeScript compiler API, which is what will let us move to TS7 later. It also avoids `unrs-resolver`, the ESLint-adjacent native module whose postinstall already fails on your host, as Verboten's deploy doc records. |
| husky 9.1.7 + lint-staged 17.3.0 | | Conventional Commits enforced by commitlint. |

## Services

| Thing | Choice | Why |
|---|---|---|
| Payments | **PayFast** | Your call, and it holds up. Recurring billing through Subscriptions and Tokenisation, with an API to update, pause, cancel and query. Verboten's `src/lib/payments/payfast.ts` and its ITN notify route port across. Caveat: PayFast recurring is credit card only, no debit order. |
| Media and CDN | Cloudflare R2 plus Cloudflare | See architecture section 6. Also gives WAF, rate limiting and Turnstile. |
| Errors | @sentry/nextjs 10.71.0 | Source-mapped, with PII scrubbing configured before first deploy, not after. |
| Logs | pino 10.3.1 | Structured JSON with a redaction list covering tokens, ID numbers and full VIN. Written to the app root and rotated by cron, because there is no log service on this host. |
| Analytics | Plausible | No cookies and no personal data, so it runs before consent without breaching POPIA. GA4 would sit behind the consent gate and lose most of its data. Lead events go to our own server-side event log regardless, which is the number that actually matters. |
| Email | cPanel SMTP via nodemailer | Already configured, already free. Templates still built with React Email and tested in dark mode and Outlook. |
| Uptime | External synthetic check on `/api/search` | Shared hosting restarts without telling you. |

## Deliberately not included

- **Typesense or Meilisearch.** No second service to run on a shared host, and not earned at this
  volume. The trigger to revisit is in `docs/ARCHITECTURE.md`.
- **Vercel, and everything that assumed it.** No `cpt1` region pinning, no Vercel Blob, no
  per-pull-request preview deployments. The substitute for previews is a staging Node app on a
  subdomain, and that gap is stated plainly rather than glossed.
- **pnpm.** Reversed from the original plan. The host's own tooling runs npm.
- **PostGIS and pg_trgm.** Not available on SQLite. Replaced by an R-tree bounding box plus
  haversine, and by FTS5 prefix search, described in the architecture doc.
- **An accessibility overlay.** Section 12 rules it out and it is right to.
