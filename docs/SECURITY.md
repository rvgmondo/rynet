# SECURITY

How Rynet is defended, what is proven, what is not, and what to do when something is wrong.
Companion to [THREAT-MODEL.md](THREAT-MODEL.md), which covers who might attack this and why.

---

## Reporting a vulnerability

Email **security@rynet.co.za** with what you found, how to reproduce it, and what you could reach.
We will acknowledge within two working days and tell you what we are doing about it.

Please do not test against another dealership's real data, do not run automated scanners against
the live site, and do not publish before we have had a chance to fix it. There is no bounty
programme yet and we will credit you if you want to be credited.

---

## The boundary that matters most

One dealership must never reach another dealership's data. Everything else here is ordinary web
security; this is the thing the product cannot survive getting wrong.

It is enforced in three places, in descending order of how much weight they carry.

**1. The query.** Access functions return a Payload `Where` clause rather than a boolean, so the
constraint is compiled into the SQL. A row belonging to another dealership is never fetched, rather
than fetched and then hidden. `src/access/roles.ts` holds the predicates everything else builds on.

**2. The write path overwrites rather than validates.** `Vehicles.beforeValidate` assigns
`data.dealer` from the requesting user, discarding whatever the request body said. Validation would
be correct right up until a new code path forgot to call it.

**3. The schema.** Buyers are a separate auth collection with no role field and no dealer field, so
a private individual cannot be escalated into a seller. There is nothing to escalate.

None of that was worth much until it was tested against a running server, which is what
`e2e/isolation.spec.ts` does. It found four real holes on its first two runs. See the audit in
[PRODUCTION-READINESS.md](PRODUCTION-READINESS.md).

---

## When you add a collection or a field

The four holes found on 2 September were all the same shape: a privileged field writable, or a
sensitive field readable, from inside the tenant. Run through this before merging.

- [ ] **Does it belong to a dealership?** If so, `read`, `update` and `delete` all need a `Where`
      clause, not a boolean. `scopedToOwnDealer` and `writableByOwnDealer` exist for this.
- [ ] **Does anything in the row belong only to the owning dealership?** Row access says which rows
      come back; field access says which fields come back on a row the caller may already read.
      They are different questions. `isDealerStaff` on a field read means *every dealership on the
      platform*, which is almost never what is wanted. Use `fieldReadableByOwningDealer`.
- [ ] **Is any field Rynet's own assessment rather than the dealership's claim?** Ratings, counts,
      verification state, accreditations. Platform staff only, at field level.
- [ ] **Is `admin.readOnly` doing the work?** It is not. It greys a field out on the screen and does
      nothing whatsoever to a PATCH. If it must not be written, give it `access.update`.
- [ ] **Is the rule written in a description?** A description is guidance for whoever is looking at
      the form. Move it into `access`.
- [ ] **Can a lower rank inside a dealership reach it?** Sales agent, manager, principal. Check the
      ladder in `roles.ts`.
- [ ] **Add the case to `e2e/isolation.spec.ts`.** The suite only covers what someone added to it.
- [ ] **Would a refused write be verified twice?** Assert the status, then read the row back as a
      platform admin. A refusal that did not actually refuse looks identical from the response.

---

## Authentication

| | Staff (`users`) | Buyers (`buyers`) |
|---|---|---|
| Password hashing | PBKDF2-HMAC-SHA256, 25 000 iterations, 512 byte output, 32 byte salt | same |
| Token lifetime | 8 hours | 30 days |
| Lockout | 8 failed attempts, 15 minutes | 10 attempts, 10 minutes |
| Cookie | `SameSite=Lax`, `Secure` in production | same |
| API keys | Off | Off |
| Reaches the Payload admin | Platform staff only | Never |

Hashing is Payload's default. 25 000 iterations is below current OWASP guidance for
PBKDF2-HMAC-SHA256 and raising it requires supplying a custom auth strategy. It is recorded as an
accepted risk in the threat model rather than quietly ignored.

**Two-factor is not implemented.** The `twoFactorEnabled` field exists and nothing reads it. Until
that changes, nobody outside the founder should hold a platform admin or a dealer principal
account. This is the largest known gap in the platform.

---

## Roles

Seven roles in two families. Platform roles are never grantable from inside a dealership.

| Role | Family | Can |
|---|---|---|
| `platform_admin` | Platform | Everything, including deleting users and dealerships |
| `platform_editor` | Platform | Read and write content across all dealerships |
| `agency_account_manager` | Platform | Same read access, for Rynet Digital accounts |
| `analyst` | Platform | Read only |
| `dealer_owner` | Dealership | The whole dealership: stock, leads, team, profile |
| `dealer_manager` | Dealership | Stock, leads, and sales agents. Not the principal |
| `dealer_sales` | Dealership | Leads, stock, and their own record. Nothing else |

Inside a dealership it is a rank ladder: you may grant a role no higher than your own, you may not
edit anyone standing above you, and nobody changes their own role. That last one is not
paranoia, it is what makes the audit trail mean something.

---

## Secrets

Environment variables only, never committed. `.env` is gitignored and `.env.example` documents every
key with no values.

| Variable | What it is | Rotation |
|---|---|---|
| `PAYLOAD_SECRET` | Signs every session token | Rotating invalidates all sessions. Annually, or immediately on suspected compromise |
| `DATABASE_URI` | Database path or connection string | On host migration |
| `SMTP_PASS` | Mailbox password | Annually, or on staff departure |
| `R2_*` | Object storage credentials | Annually. Scoped to one bucket |
| `PAYFAST_*` | Merchant credentials | Per PayFast's own policy |

**Separate credentials per environment.** Development, CI and production never share a value.
CI uses obviously fake ones (`ci-only-not-a-real-secret-value-000000`) against a throwaway database,
which is why a leaked CI log is not an incident.

To rotate: change it in cPanel's Node.js application environment, restart the app, confirm the site
answers, then revoke the old value at its source. `PAYLOAD_SECRET` signs everyone out, so do it
when someone is watching.

---

## Response headers

Set in `next.config.ts` and applied by Next rather than by the host, so they survive a move.

- **Content-Security-Policy.** The public site gets a strict policy. The Payload admin needs
  `unsafe-eval` and is matched separately by a negative lookahead on `/admin`, because a catch-all
  had been silently overriding it.
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a
  restrictive `Permissions-Policy`.

There is no cookie banner because there are no non-essential cookies. Analytics is cookieless.

---

## What is proven, and how

Every item runs on every push and a failure blocks the deploy branch.

| Claim | Evidence |
|---|---|
| A dealership cannot read or write another's leads, stock, staff or profile | 34 adversarial tests over HTTP |
| A private individual cannot list a vehicle | Anonymous and authenticated buyer, asserting 403 specifically |
| A sales agent cannot escalate inside their own dealership | 6 tests |
| A dealership cannot verify, rate or accredit itself | 4 tests |
| No VIN reaches the public, or another dealership | 3 tests, against a row that actually has a VIN |
| Consent records cannot be edited or deleted by anyone | 2 tests, including as a platform admin |
| The access predicates fail closed for a forged user | 33 unit tests, including a buyer document carrying every privileged role |

**Not proven, and not claimed:** no penetration test, no manual screen reader pass, no load test,
no dependency scanning beyond exact version pinning, no Lighthouse budget in CI.

---

## If something goes wrong

1. **Contain.** Suspend the account if it is an account. Do not delete anything: it is evidence.
2. **Snapshot.** `scripts/backup.sh` before you change anything, and keep that snapshot separate
   from the rotation so it does not get pruned.
3. **Establish scope.** Which rows, whose data, over what period.
4. **Rotate** any credential that could have been exposed.
5. **Notify.** POPIA requires notifying the Information Regulator and every affected person where
   personal information has been accessed by someone who should not have it. This is not
   discretionary and there is no "it was probably fine" threshold.
6. **Write it down**, including what let it happen and what would have caught it earlier.

Recovery procedures are in [RUNBOOK.md](RUNBOOK.md).

---

## Known gaps

Listed so they are decisions rather than surprises.

- **Two-factor authentication is not implemented.** The biggest one.
- **The rate limiter is in process memory.** If Passenger runs several workers the effective limit
  multiplies. Unconfirmed, and one of the two open host questions.
- **No Turnstile.** Deliberately not stubbed in: a challenge that always passes is worse than none.
  It goes in when the site is behind Cloudflare.
- **No WAF and no CDN.** First week.
- **No dependency scanning.** Versions are pinned exactly and `npm ci` builds from the lockfile, but
  nothing watches for a published advisory.
- **No penetration test.** Appropriate before the first paying dealership, not before launch on
  demonstration stock.
- **Nothing is encrypted at rest** beyond what the host provides.
