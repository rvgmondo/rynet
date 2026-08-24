# STACK

Every version below was checked against the npm registry on 24 August 2026, not recalled.
Where I have deliberately not taken the newest release, the reason is stated.

## Runtime

| Thing | Pinned | Why |
|---|---|---|
| Node.js | 24.x (Active LTS) | Node 26 is Current, not LTS, until October 2026. Next 16 and Payload 3.88 both require >=20.9.0. Production runs LTS. Your machine has 26.5.0, so the repo carries a portable Node 24 in `vendor/node` and an `.nvmrc`, matching the pattern in your Amico and Verboten projects. |
| pnpm | 11.23.0 | Workspace-ready, strict node_modules, fastest cold install in CI. |
| PostgreSQL | 17.x | Payload's Postgres adapter targets it. PostGIS for radius search. |

## Application

| Package | Pinned | Why |
|---|---|---|
| next | 16.3.2 | Current stable. Payload 3.88 declares `next: >=16.2.6 <17.0.0`, so this is a supported pair, verified from the published peer range rather than assumed. |
| react / react-dom | 19.2.8 | Required by Next 16. |
| payload | 3.88.0 | Current stable. Payload 4 exists only as canary and internal builds. |
| @payloadcms/next | 3.88.0 | Must match `payload` exactly. |
| @payloadcms/db-postgres | 3.88.0 | Drizzle-backed, generates real SQL migrations we check in. |
| @payloadcms/richtext-lexical | 3.88.0 | Lexical, with custom nodes for our block set. |
| @payloadcms/ui | 3.88.0 | Needed for custom admin field components. |
| @payloadcms/plugin-form-builder | 3.88.0 | Section 9's form builder, extended with our routing and consent fields. |
| @payloadcms/plugin-seo | 3.88.0 | SEO field group with live preview. We replace its title generator with our template system. |
| @payloadcms/plugin-redirects | 3.88.0 | Redirect manager. We add import/export and the automatic on-slug-change hook. |
| @payloadcms/plugin-nested-docs | 3.88.0 | Breadcrumbs and parent/child page URLs. |
| @payloadcms/plugin-search | 3.88.0 | Editorial search only. Vehicle search is our own Postgres layer, not this. |
| @payloadcms/storage-s3 | 3.88.0 | Points at Cloudflare R2. Keeps media off the app server and off Vercel's image bill. |
| @payloadcms/email-resend | 3.88.0 | Transactional email through Resend. |
| graphql | 16.x | Payload peer requirement. |
| sharp | 0.35.3 | Image derivatives, metadata stripping, re-encode on upload. |

## TypeScript: taking 5.9.3, not 7.0.2

This is the one place I am deliberately not taking the newest stable, and the brief says to argue when I disagree.

TypeScript 7.0.2 is stable (7.0 shipped 8 July 2026, Go-native, roughly 10x faster type checking). But:

1. The 7.0 npm package ships the Go compiler and **drops `lib/typescript.js`**, the JavaScript compiler API. Next.js needs that API during `next build`. Next 16.3 works around it by shelling out to `tsc` behind `experimental.useTypeScriptCli`. That is an experimental flag on the single most important command in the pipeline.
2. **typescript-eslint closed its TS7 support request as "not planned"**, and ESLint core is blocked behind it. Any type-aware lint rule stops working.
3. The stable programmatic API lands in **TypeScript 7.1, expected around October 2026**.

So: **typescript 5.9.3** for v1, with a scheduled re-evaluation when 7.1 ships. The CI speed win is real but it is not worth an experimental build flag on a platform that has to be up.

Recorded as a dated decision in `docs/ARCHITECTURE.md` so it gets revisited rather than forgotten.

## Styling, UI, motion

| Package | Pinned | Why |
|---|---|---|
| tailwindcss | 4.3.3 | CSS-first config. Every value comes from `@theme` tokens, so an arbitrary hex in a component is a lint failure, not a habit. |
| @tailwindcss/postcss | 4.3.3 | |
| Radix Primitives (per-package) | current | Copy-in shadcn-style components we own and can patch. No `shadcn` runtime dependency. |
| motion | 13.1.1 | Successor to Framer Motion. Used sparingly: layout animation on filter results, shared-element on card-to-detail. Route transitions use the native View Transitions API, not JS. |
| class-variance-authority | 0.7.1 | Variant contracts on components. |
| tailwind-merge / clsx | 3.6.1 / 2.1.1 | |
| next-themes | 0.4.6 | Light/dark without a flash. |

## Data, forms, validation

| Package | Pinned | Why |
|---|---|---|
| zod | 4.4.3 | One schema per contract, shared by client form, server action, REST route and the Payload field validator. |
| react-hook-form | 7.86.0 | |
| @hookform/resolvers | 5.9.1 | |
| nuqs | 2.10.0 | Typed URL search-param state. Search filters live in the URL, which is a hard requirement in Section 6, and this keeps that honest without a bespoke serialiser. |
| date-fns | 4.4.0 | Trading hours, SLA timers, public holiday overrides. |

## Testing and CI

| Package | Pinned | Why |
|---|---|---|
| vitest | 4.1.11 | Units. The finance calculator gets exhaustive table-driven tests. |
| @playwright/test | 1.62.1 | End to end, including the adversarial dealer-isolation suite. |
| @axe-core/playwright | 4.13.0 | axe on every template inside the e2e run, so one CI job covers both. |
| @lhci/cli | 0.15.1 | Lighthouse CI with hard budgets. Red build blocks merge. |
| @biomejs/biome | 2.5.10 | Lint and format in one Rust binary. Chosen over ESLint 10 plus Prettier: one tool, one config, roughly 20x faster in pre-commit, and it does not depend on the TypeScript compiler API, which is what will let us move to TS7 later without the linter blocking us. Note: the bare `biome` package on npm is a squatted 0.3.3, not this. |
| husky 9.1.7 + lint-staged 17.3.0 | | Conventional Commits enforced by commitlint. |

## Observability and services

| Thing | Choice | Why |
|---|---|---|
| Errors | @sentry/nextjs 10.71.0 | Source-mapped, with PII scrubbing configured before first deploy, not after. |
| Logs | pino 10.3.1 | Structured JSON with a redaction list covering tokens, ID numbers and full VIN. |
| Analytics | Plausible (recommended) | No cookies, no personal data, so it runs before consent without breaching POPIA. GA4 would have to sit behind the consent gate and lose most of its data. Lead events go to our own server-side event log regardless, which is the number that actually matters. |
| Email | Resend + React Email 6.9.2 | Templates tested in dark mode and Outlook as part of CI. |
| Uptime | Synthetic check on `/api/search` | Section 3 asks for it specifically. |
| Payments | See open question 3. **Stripe is not viable.** | Stripe does not support South African registered entities for ZAR settlement or Connect payouts. Peach Payments (native recurring and debit order) or Paystack are the real candidates. |

## Deliberately not included

- **Typesense / Meilisearch.** Not in v1. Postgres full text plus `pg_trgm` plus a denormalised index table handles faceted search well past the volume this platform will have at launch. The trigger to revisit is written down in `docs/ARCHITECTURE.md`: p95 search latency above 300ms at 50 concurrent, or more than 250 000 live listings. Adding a search service costs an extra service to run, an extra thing to keep in sync, and an extra failure mode, and none of that is earned yet.
- **An ORM alongside Payload.** Payload's Postgres adapter is Drizzle underneath and exposes it. Raw SQL where we need it, through that connection. No second data layer.
- **An accessibility overlay.** Section 12 rules it out and it is right to.
