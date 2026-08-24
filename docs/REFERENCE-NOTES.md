# REFERENCE NOTES

Source: `motohubsa-main.zip`, your own South African motorcycle marketplace. Read in full on
24 August 2026 before any Rynet design work started.

## What it is, and why the overlap is smaller than it looks

MotoHubSA is Express plus a Vite SPA plus Drizzle on MySQL, shaped hard by cPanel on CloudLinux:
no SSH, no terminal, WASM modules that fall over under LVE memory limits, `dist/` committed to git
because the host cannot run a Vite build. Rynet is Next 16 plus Payload on Postgres with a real
deploy pipeline. Almost none of the infrastructure transfers.

What does transfer is the domain knowledge. That project already solved several South African
vehicle-marketplace problems properly, and re-solving them from scratch would be waste.

## Taken

### Domain logic and utilities

| From | Taking | Why |
|---|---|---|
| `client/src/lib/licenceDisc.ts` | The whole approach, ported to our stack | Reads a South African vehicle licence disc two ways: PDF417 barcode decode, falling back to OCR when the disc is scratched or glared. Extracts VIN, plate, make, model, colour and disc expiry **by pattern rather than by position**, because the payload layout changed between disc generations. This is the single most valuable thing in the zip. It becomes the fast path for dealer stock capture in the portal: photograph the disc, get the vehicle prefilled, correct and publish. |
| `server/src/lib/slug.ts` | Verbatim, minus the Drizzle coupling | The accent handling is correct and the comments record exactly why: NFKD decomposition before stripping, so "Ténéré 700" does not become `te-ne-re-700`. It also validates rather than trusts admin input, after a pasted path with slashes made a live post unreachable. That bug is worth not repeating. |
| `server/src/lib/mask.ts` | The masking rule, not the code | Identifiers masked to their last four characters for everyone except an admin and the owning dealer. For Rynet the VIN is additionally encrypted at rest and excluded from public queries entirely, so this becomes the dealer-side display rule rather than the public one. |
| `server/src/lib/geo.ts` | Bounding-box pre-filter concept only | Rynet uses PostGIS `ST_DWithin`, so the haversine implementation is not needed. The idea of a cheap bounding box before the exact check is what carries. |
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
- **The `.gitignore` habit of explaining every non-obvious rule in a comment.** Rynet's will not
  commit `dist/`, because it has a real build pipeline, but it will explain each exclusion.
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
- No hosting or deployment approach. The CloudLinux workarounds (hand-written migration runner,
  raw `http` instead of `fetch`, committed `dist/`, `fix-perms`) exist to survive a host Rynet is
  not using. Carrying them across would be cargo cult.
- **No CI.** MotoHubSA has no `.github/` at all, so there is no workflow structure to reuse. Rynet's
  GitHub Actions pipeline is written fresh against Section 15.
- No auth implementation. MotoHubSA uses bcryptjs and hand-rolled JWT. Rynet uses Payload auth with
  argon2id, mandatory 2FA on privileged roles, and httpOnly SameSite cookies.

## One thing worth flagging

MotoHubSA contains an `_archive-old-nextjs-payload/` exclusion in `.gitignore`, meaning that project
previously ran on Next plus Payload and moved off it. If the move was for reasons other than the
cPanel hosting constraint, that is worth five minutes of conversation before Phase 1, because it
would be the most relevant experience anyone has with this exact stack. The archive was not in the
zip so I could not read it.
