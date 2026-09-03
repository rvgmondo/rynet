# REFERENCE NOTES

Source: `motohubsa-main.zip`, your own South African motorcycle marketplace. Read in full on
24 August 2026 before any Rynet design work started.

## What it is, and why the overlap is smaller than it looks

MotoHubSA is Express plus a Vite SPA plus Drizzle on MySQL, shaped hard by cPanel on CloudLinux:
no SSH, no terminal, WASM modules that fall over under LVE memory limits, `dist/` committed to git
because the host cannot run a Vite build.

**Revised after the hosting decision.** I originally wrote that the CloudLinux workarounds were
specific to a host Rynet was not using, and that carrying them across would be cargo cult. Rynet is
now going onto the same class of host, so that paragraph was wrong and the constraints transfer
directly: the build cannot run on the server, native and WASM modules fall over under LVE limits,
thread pools have to be capped because the box reports dozens of cores while capping processes, and
outbound requests need care. Those lessons are now load-bearing rather than irrelevant.

What always transferred is the domain knowledge. That project already solved several South African
vehicle-marketplace problems properly, and re-solving them from scratch would be waste.

## Taken

### Domain logic and utilities

| From | Taking | Why |
|---|---|---|
| `client/src/lib/licenceDisc.ts` | The whole approach, ported to our stack | Reads a South African vehicle licence disc two ways: PDF417 barcode decode, falling back to OCR when the disc is scratched or glared. Extracts VIN, plate, make, model, colour and disc expiry **by pattern rather than by position**, because the payload layout changed between disc generations. This is the single most valuable thing in the zip. It becomes the fast path for dealer stock capture in the portal: photograph the disc, get the vehicle prefilled, correct and publish. |
| `server/src/lib/slug.ts` | Verbatim, minus the Drizzle coupling | The accent handling is correct and the comments record exactly why: NFKD decomposition before stripping, so "Ténéré 700" does not become `te-ne-re-700`. It also validates rather than trusts admin input, after a pasted path with slashes made a live post unreachable. That bug is worth not repeating. |
| `server/src/lib/mask.ts` | The masking rule, not the code | Identifiers masked to their last four characters for everyone except an admin and the owning dealer. For Rynet the VIN is additionally encrypted at rest and excluded from public queries entirely, so this becomes the dealer-side display rule rather than the public one. |
| `server/src/lib/geo.ts` | **The whole thing**, ported | Originally I noted only the bounding-box idea, because Rynet was going to use PostGIS `ST_DWithin`. On SQLite there is no PostGIS, so radius search is exactly this: an R-tree bounding box to pre-filter, then the haversine for the exact distance. The file went from a footnote to a load-bearing piece of the search design. |
| `server/src/lib/turnstile.ts`, `middleware/turnstileGate.ts` | Pattern | Cloudflare Turnstile verification with a proper server-side check and a fail-closed gate. |
| `server/src/middleware/rateLimit.ts`, `ownership.ts`, `requireRole.ts` | Patterns | Rynet expresses all three through Payload access functions instead of Express middleware, but the shape of the checks is sound and the ownership one directly informs the dealer-scoping design. |
| `server/src/lib/client-ip.ts` | Pattern | Correct real-IP extraction behind Cloudflare. Rynet sits behind Cloudflare too and this is easy to get wrong. |

### Conventions and working practice

- **The documentation set.** `CLAUDE.md` as a working handbook separate from `PROJECT-CONTEXT.md`
  as architecture, plus a plain-English `WEBSITE-GUIDE.md` written for the owner. That split is
  better than one giant README and Rynet copies it: `CLAUDE.md`, `docs/ARCHITECTURE.md`, and
  `docs/CMS-GUIDE.md` for the dealer's marketing person.
- **The commit message style.** `.gitmessage` shows commits that explain what was actually wrong,
  what was measured, and what was verified, rather than "fix styles". That standard carries over
  unchanged.
- **The `.gitignore` habit of explaining every non-obvious rule in a comment.** Rynet keeps `.next`
  out of git and ships it inside a deploy bundle instead, which is Verboten's approach, but every
  exclusion gets the same one-paragraph explanation of why it is there.
- **Taxonomies as managed data, not enums.** The `.gitmessage` records this being fixed twice, on
  `make` and again on post categories, after a hardcoded list made a needed value impossible to add.
  Rynet's content model has this baked in from the first migration, which is the whole reason
  Section 5 of your brief insists on it.
- **`.vscode/extensions.json` and workspace TypeScript pinning.** Kept, retargeted at Biome.

## Not taken

Nothing visual, structural or editorial:

- No layouts, no component markup, no styling, no colour or type decisions.
- No copy, no imagery, no brand assets.
- No content model that encodes the motorcycle business: no stolen-vehicle registry, no K53 learning
  hub, no sightings, no sponsors, no private-seller concepts. Rynet has no private sellers at all,
  which inverts one of MotoHubSA's core assumptions.
- No page-builder block definitions. Rynet's block library is designed against Section 9 from
  scratch.
- **No CI.** MotoHubSA has no `.github/` at all, so there is no workflow structure to reuse. Rynet's
  GitHub Actions pipeline is written fresh against Section 15.
- Not the specific deployment mechanics, though the constraints behind them do carry. MotoHubSA
  commits `dist/` and hand-rolls a migration runner because it is an Express and Vite app on MySQL.
  Rynet ships a prebuilt `.next` in a deploy bundle and lets Payload own the schema, which is
  Amico's and Verboten's pattern and a better fit. The `fix-perms` script is worth keeping in
  reserve, since Windows zips still carry no Unix permission bits.
- No auth implementation. MotoHubSA uses bcryptjs and hand-rolled JWT. Rynet uses Payload auth with
  argon2id, mandatory 2FA on privileged roles, and httpOnly SameSite cookies.

## One thing worth flagging, and it matters more now

MotoHubSA's `.gitignore` excludes `_archive-old-nextjs-payload/`, meaning that project previously ran
on Next plus Payload and moved off it, onto Express plus a Vite SPA, on this same class of cPanel
host.

Rynet is Next plus Payload on that same class of host. So the reason for that move is directly
relevant rather than a curiosity. If it was a hosting constraint that Amico and Verboten have since
solved, fine, that is settled ground. If it was something else, a build that would not complete, a
memory ceiling, an admin that would not load under LVE limits, then it is the single most valuable
piece of prior experience available and I would rather hear it before Phase 1 than rediscover it in
Phase 2.

The archive was not in the zip so I could not read it. Ten minutes of your recollection would do.
