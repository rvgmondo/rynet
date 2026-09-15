import { KeyRound } from "lucide-react";
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
    <>
      <Breadcrumbs trail={[{ href: "/account/two-factor", label: "Two-factor authentication" }]} />

      <section aria-labelledby="two-factor-heading" className="border-b border-line bg-card">
        <div className="container-page py-10 sm:py-14">
          <p className="rn-eyebrow">Account security</p>
          <h1 id="two-factor-heading" className="rn-h1 mt-3 max-w-[18ch]">
            Two-factor authentication
          </h1>
          <p className="rn-lead mt-4 max-w-2xl">
            A second step at sign-in, from an app on your phone. It means a stolen password on its
            own is not enough to get into an account that can see a dealership&apos;s leads, change
            its prices, or approve a dealership as verified.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-8 py-[var(--section-base)] lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-12">
        <div className="min-w-0 max-w-2xl">
          <TwoFactorPanel status={status} />
        </div>

        <section aria-labelledby="lost-heading" className="min-w-0 lg:self-start">
          <div className="rounded-lg bg-subtle p-6">
            <KeyRound aria-hidden="true" className="size-6 text-heading" />
            <h2 id="lost-heading" className="mt-4 text-lg font-semibold">
              If you lose the phone
            </h2>
            <p className="mt-2 text-sm text-body">
              Use one of your recovery codes in place of the six digit code. Each one works once. If
              they are gone as well, a platform admin has to clear the second factor on the account,
              and that is deliberately a conversation with a person rather than a self-service
              reset: an automated one would be a way around the whole thing.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
