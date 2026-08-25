# Rynet

A South African vehicle marketplace where **only verified, registered dealerships may list**, plus
the agency that sells services to those dealerships. One Next.js application, one database, one
auth system, two front doors.

- **Rynet Showroom** at `/`, the marketplace. Consumer facing.
- **Rynet Digital** at `/digital`, the agency. Dealer principal facing.
- **Dealer portal** at `/portal`, scoped to one dealership.
- **Admin** at `/admin`, Payload, platform staff only.

Start with [docs/PLAN.md](docs/PLAN.md), which indexes everything else.

---

## Setup, on a clean machine

Everything needed is in the repo. There is no database server to install, because the production
database is SQLite: one file.

```bash
git clone <repo> rynet
cd rynet
```

**Node 22.** The repo carries a portable copy in `vendor/node`, so no system install is required
and local matches the cPanel host. Put it on your PATH for the session:

```bash
export PATH="$PWD/vendor/node:$PATH"   # bash
```

On Windows, `scripts/dev.cmd` and `scripts/start.cmd` do this for you.

```bash
npm install
cp .env.example .env
```

Generate a secret and put it in `.env` as `PAYLOAD_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create the first admin, then fill the database with demonstration content:

```bash
npm run seed:admin
npm run seed
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin, sign in as `admin@rynet.co.za` / `ChangeMe123!` and change
  the password immediately.

`npm run seed` builds twelve demonstration dealerships across six provinces and 311 vehicles. All of
it is flagged as demonstration content and labelled as such in the interface. See
[docs/CONTENT-NEEDED.md](docs/CONTENT-NEEDED.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build. Always run locally, never on the host |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome, lint and format check |
| `npm run lint:fix` | Biome, with fixes applied |
| `npm run contrast` | Recompute every colour pair and rewrite `docs/contrast-report.md`. Exits non-zero on a failure |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright, including axe on every template |
| `npm run seed` | Demonstration dealerships and stock |
| `npm run seed:admin` | The first platform admin |
| `npm run generate:types` | Regenerate `src/payload-types.ts` after a collection change |
| `npm run db:migrate` | Apply schema migrations. Run on the host after any deploy that changed the schema |
| `npm run db:migrate:create` | Create a migration after changing a collection |
| `npm run deploy:build` | Build the cPanel bundle into `deploy/` |

## How it is put together

```
src/
  access/          Roles and the access predicates built on them
  app/
    (marketplace)/ Consumer site
    (agency)/      Agency site
    (portal)/      Dealer portal
    (payload)/     Admin and the Payload API
  collections/     Payload collections. taxonomy.ts is the factory the taxonomies share
  components/      Owned components. No component library dependency
  globals/         Payload globals, including the finance defaults
  lib/             Formatting, slugs, URLs, contrast, relationship narrowing
  seed/            Demonstration data
  styles/          tokens.css is the source of truth for every colour and size
scripts/           Contrast report, dev and start wrappers
e2e/               Playwright, axe, responsive and the dealer-isolation suite
docs/              Architecture, content model, SEO, design system, delivery plan
vendor/node/       Portable Node 22, so local matches production
```

## Three things worth knowing before you change anything

**1. Only dealerships list, and that is enforced in the schema.** Consumers live in a separate auth
collection (`buyers`) with no role field and no dealer field, so a private individual has no path to
listing a vehicle. On top of that, `vehicles.beforeValidate` **overwrites** the dealer field with
the requesting user's own dealership rather than validating what was sent. That single line is what
stops dealer A posting stock under dealer B. Do not turn it into a check.

**2. Every colour comes from `src/styles/tokens.css`.** An arbitrary hex in a component is a review
rejection. The token set is contrast-verified and CI fails on a regression, so a hardcoded colour is
both a consistency problem and a hole in the accessibility guarantee.

Three constraints in there are not preferences: brand red `#E32432` clears AA on white by 0.10 and
is too thin for body text, so links use red-600; brand red on brand navy is 4.13 and fails, so dark
accents lighten to red-300; brand silver on white is 2.08 and fails everything, so silver is a
dark-theme text colour and a light-theme decorative rule only.

**3. Nothing writes on the read path.** View and lead counters are buffered and flushed by a job,
never written per page view. On Postgres that would be wasteful. On SQLite, which is what the host
supports, it is a write lock on the busiest page on the site.

## Deployment

cPanel, Setup Node.js App, started by `server.cjs`. **The build never runs on the server**: Next 16
with Turbopack needs far more memory than CloudLinux allows. Build locally, ship the prebuilt
`.next` in the deploy bundle, and run only `npm install` on the host.

Build the bundle with `npm run deploy:build -- --url https://rynet.co.za`, then follow
[DEPLOY-CPANEL.md](DEPLOY-CPANEL.md). That doc also lists the five things that broke the first
time the bundle was tested on a clean directory, so you do not get to discover them yourself.
