import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { COMPANY } from "@/content/company";
import { checkUnsubscribe, optOut } from "@/lib/mail/unsubscribe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stop Rynet's emails",
  robots: { index: false, follow: false },
};

/**
 * Where "Stop these emails" in a mailing lands. It asks for one press rather than acting on the
 * visit, because company mail filters open every link in a message to check it, and a visit that
 * unsubscribed would opt dealerships out that never asked.
 */
async function confirm(formData: FormData) {
  "use server";
  const dealerId = Number(formData.get("d"));
  const code = String(formData.get("t") ?? "");
  if (!checkUnsubscribe(dealerId, code)) redirect("/unsubscribe?done=0");
  await optOut(await getPayload({ config }), dealerId);
  redirect("/unsubscribe?done=1");
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; t?: string; done?: string }>;
}) {
  const { d, t, done } = await searchParams;
  const dealerId = Number(d);
  const valid = checkUnsubscribe(dealerId, t ?? "");
  const dealer = valid
    ? await (await getPayload({ config }))
        .findByID({ collection: "dealers", id: dealerId, depth: 0, overrideAccess: true })
        .catch(() => null)
    : null;

  return (
    <section className="container-page py-16 sm:py-24">
      <div className="rn-card mx-auto max-w-xl px-6 py-10 sm:px-10">
        {done === "1" ? (
          <>
            <h1 className="rn-h2">Done. No more of these emails.</h1>
            <p className="mt-4 text-body">
              Rynet will not send you news or reminders again. Enquiries from buyers still reach
              you, because those are buyers asking about your cars. Changed your mind? Email{" "}
              <a className="rn-link" href={`mailto:${COMPANY.infoEmail}`}>
                {COMPANY.infoEmail}
              </a>
              .
            </p>
          </>
        ) : valid && dealer ? (
          <>
            <h1 className="rn-h2">Stop Rynet&apos;s emails to {dealer.tradingName}?</h1>
            <p className="mt-4 text-body">
              You will not get news or reminders from Rynet again. Enquiries from buyers about your
              cars still reach you.
            </p>
            <form action={confirm} className="mt-8">
              <input type="hidden" name="d" value={dealerId} />
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="rn-btn rn-btn--primary">
                Stop these emails
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="rn-h2">This link does not work</h1>
            <p className="mt-4 text-body">
              It may have been copied only in part. Email{" "}
              <a className="rn-link" href={`mailto:${COMPANY.infoEmail}`}>
                {COMPANY.infoEmail}
              </a>{" "}
              and we will take you off the list.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
