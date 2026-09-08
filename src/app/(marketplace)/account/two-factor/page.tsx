import type { Metadata } from "next";

import { readTwoFactorStatus } from "@/app/actions/two-factor";
import { TwoFactorPanel } from "@/components/account/two-factor-panel";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

/**
 * Reads the signed-in user from the session cookie, so it can never be prerendered and must
 * never be cached.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Two-factor authentication",
  // A staff utility page. It has no business in a search result, and /account is already
  // disallowed in robots.txt, but the meta tag is the half that works on a page a crawler
  // reached from somewhere else.
  robots: { index: false, follow: false },
};

/**
 * Two-factor enrolment for staff and dealership accounts.
 *
 * It lives on the marketplace origin rather than inside the Payload admin because Payload's
 * account screen is its own React app and extending it means shipping components into the
 * admin bundle. This is a page, on the same session cookie, that does one thing.
 *
 * It never takes a user id. Every action resolves the caller from the cookie and acts on that
 * account, so there is no authorisation check to get wrong.
 */
export default async function TwoFactorPage() {
  const status = await readTwoFactorStatus();

  return (
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={[{ href: "/account/two-factor", label: "Two-factor authentication" }]} />

      <div className="measure mt-6">
        <h1 className="text-3xl">Two-factor authentication</h1>
        <p className="mt-4 text-ink-secondary">
          A second step at sign-in, from an app on your phone. It means a stolen password on its own
          is not enough to get into an account that can see a dealership's leads, change its prices,
          or approve a dealership as verified.
        </p>
      </div>

      <div className="mt-10 max-w-2xl">
        <TwoFactorPanel status={status} />
      </div>

      <section aria-labelledby="lost-heading" className="measure mt-14">
        <h2 id="lost-heading" className="text-xl">
          If you lose the phone
        </h2>
        <p className="mt-3 text-sm text-ink-secondary">
          Use one of the recovery codes in place of the six digit code. Each one works once. If they
          are gone as well, a platform admin has to clear the second factor on the account, and that
          is deliberately a conversation with a person rather than a self-service reset: an
          automated one would be a way around the whole thing.
        </p>
      </section>
    </div>
  );
}
