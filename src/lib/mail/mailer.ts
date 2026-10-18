import type { Payload } from "payload";

import { renderEmail } from "@/lib/mail/layout";
import { type MergeValues, merge } from "@/lib/mail/merge";
import { oneClickUrl, unsubscribeUrl } from "@/lib/mail/unsubscribe";
import { firstNameOf } from "@/lib/onboarding/whatsapp";

/**
 * The Mailer: one email to many dealerships, each personalised, sent at a pace the mail server
 * will accept.
 *
 * WHO CAN RECEIVE ONE
 *
 * A real (not example) dealership with an email address for its principal, that has not opted
 * out. Everyone else picked is recorded as "left out", with the reason, so the person sending can
 * see that the list they ticked is not the list that went.
 *
 * THE PACE
 *
 * cPanel mail servers cap how much one account sends an hour, and going over gets every later
 * message refused, enquiry emails included. So the sender takes MAILER_PER_MINUTE deliveries a
 * minute (20 unless set), which is 1 200 an hour at most and comfortably under a typical cap.
 *
 * NOTHING SENDS WITHOUT A MAIL SERVER
 *
 * Until SMTP_HOST is set on the host, deliveries wait as "Waiting" rather than being marked sent,
 * and the Mailer says why. They go as soon as it is set.
 */

export type MailerDealer = {
  id: number;
  tradingName: string;
  slug: string;
  email: string | null;
  contactName: string | null;
  liveCars: number;
  newEnquiries: number;
  hasLogin: boolean;
  readsWebsite: boolean;
  socialConnected: boolean;
  optedOut: boolean;
  verified: boolean;
};

export type Draft = {
  subject: string;
  body: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
};

export const mailServerReady = (): boolean => Boolean(process.env.SMTP_HOST);
const perMinute = () => Math.max(1, Number(process.env.MAILER_PER_MINUTE || 20));

export function siteUrlOf(payload: Payload): string {
  return (payload.config.serverURL || "https://rynet.co.za").replace(/\/$/, "");
}

/** Every dealership the Mailer can offer, with what the filters and the merge fields need. */
export async function mailerDealers(payload: Payload): Promise<MailerDealer[]> {
  const dealers = await payload.find({
    collection: "dealers",
    where: { isDemonstration: { not_equals: true } },
    limit: 0,
    pagination: false,
    depth: 0,
    sort: "tradingName",
    overrideAccess: true,
  });
  const ids = (dealers.docs as unknown as { id: number }[]).map((doc) => doc.id);
  if (ids.length === 0) return [];

  const tally = async (
    collection: "vehicles" | "leads" | "users" | "social-accounts",
    where: Record<string, unknown>,
  ): Promise<Map<number, number>> => {
    const rows = await payload.find({
      collection,
      where: { and: [{ dealer: { in: ids } }, where] } as never,
      limit: 0,
      pagination: false,
      depth: 0,
      select: { dealer: true } as never,
      overrideAccess: true,
    });
    const counts = new Map<number, number>();
    for (const row of rows.docs as unknown as { dealer?: number | { id: number } | null }[]) {
      const id = typeof row.dealer === "object" ? row.dealer?.id : row.dealer;
      if (typeof id === "number") counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  };

  const [live, fresh, logins, social] = await Promise.all([
    tally("vehicles", { status: { equals: "live" } }),
    tally("leads", {
      and: [
        { status: { equals: "new" } },
        { type: { not_in: ["whatsapp_click", "phone_reveal"] } },
      ],
    }),
    tally("users", { status: { equals: "active" } }),
    tally("social-accounts", { state: { equals: "connected" } }),
  ]);

  return (dealers.docs as unknown as Record<string, unknown>[]).map((doc) => {
    const id = doc.id as number;
    const principal = (doc.principal ?? {}) as { name?: string | null; email?: string | null };
    const feed = (doc.stockFeed ?? {}) as { readWebsite?: boolean | null };
    return {
      id,
      tradingName: String(doc.tradingName ?? ""),
      slug: String(doc.slug ?? ""),
      email: principal.email?.trim() || null,
      contactName: principal.name ?? null,
      liveCars: live.get(id) ?? 0,
      newEnquiries: fresh.get(id) ?? 0,
      hasLogin: (logins.get(id) ?? 0) > 0,
      readsWebsite: feed.readWebsite === true,
      socialConnected: (social.get(id) ?? 0) > 0,
      optedOut: doc.emailOptOut === true,
      verified: doc.verificationStatus === "verified",
    };
  });
}

export function mergeValuesFor(dealer: MailerDealer, siteUrl: string): MergeValues {
  return {
    firstName: firstNameOf(dealer.contactName),
    dealership: dealer.tradingName,
    showroomUrl: `${siteUrl}/dealers/${dealer.slug}`,
    portalUrl: `${siteUrl}/portal`,
    liveCars: String(dealer.liveCars),
    newEnquiries: String(dealer.newEnquiries),
  };
}

/** The finished email one dealership gets: the words filled in, in Rynet's design. */
export function renderFor(draft: Draft, dealer: MailerDealer, siteUrl: string) {
  const values = mergeValuesFor(dealer, siteUrl);
  const subject = merge(draft.subject, values).trim();
  const body = merge(draft.body, values);
  const url = draft.buttonUrl ? merge(draft.buttonUrl, values).trim() : "";
  const label = draft.buttonLabel?.trim() ?? "";
  const unsubscribe = unsubscribeUrl(siteUrl, dealer.id);
  const { html, text } = renderEmail({
    preheader: body.replace(/\s+/g, " ").replace(/\*\*/g, "").slice(0, 110),
    heading: subject,
    body,
    button: label && /^https?:\/\//.test(url) ? { label, url } : null,
    footnote: `You are getting this because ${dealer.tradingName} lists its cars on Rynet.`,
    unsubscribeUrl: unsubscribe,
  });
  return { subject, html, text, unsubscribe, oneClick: oneClickUrl(siteUrl, dealer.id) };
}

/** Why a dealership would be left out of a send, or null when it can have one. */
export function leftOutBecause(dealer: MailerDealer): string | null {
  if (dealer.optedOut) return "They asked not to get these emails.";
  if (!dealer.email) return "No email address for their dealer principal.";
  return null;
}

/** Records the mailing and a delivery for each dealership picked, and starts sending. */
export async function startMailing(
  payload: Payload,
  input: Draft & { dealerIds: number[]; audience: string; userId: number },
): Promise<{ mailingId: number; queued: number; leftOut: number }> {
  const all = await mailerDealers(payload);
  const picked = all.filter((dealer) => input.dealerIds.includes(dealer.id));

  const mailing = await payload.create({
    collection: "mailings",
    data: {
      subject: input.subject,
      body: input.body,
      buttonLabel: input.buttonLabel || null,
      buttonUrl: input.buttonUrl || null,
      audience: input.audience,
      status: "sending",
      createdBy: input.userId,
    },
    overrideAccess: true,
  });

  let queued = 0;
  let leftOut = 0;
  for (const dealer of picked) {
    const reason = leftOutBecause(dealer);
    await payload.create({
      collection: "mail-deliveries",
      data: {
        mailing: mailing.id,
        dealer: dealer.id,
        to: dealer.email ?? "nobody@rynet.co.za",
        status: reason ? "skipped" : "queued",
        error: reason,
      },
      overrideAccess: true,
    });
    if (reason) leftOut += 1;
    else queued += 1;
  }
  if (queued === 0) {
    await payload.update({
      collection: "mailings",
      id: mailing.id,
      data: { status: "done" },
      overrideAccess: true,
    });
  }

  void runMailer(payload);
  return { mailingId: mailing.id as number, queued, leftOut };
}

/** One personalised copy to a member of staff, so they see exactly what a dealership will. */
export async function sendTest(
  payload: Payload,
  draft: Draft,
  dealer: MailerDealer,
  to: string,
): Promise<"sent" | "no-mail-server"> {
  if (!mailServerReady()) return "no-mail-server";
  const email = renderFor(draft, dealer, siteUrlOf(payload));
  await payload.sendEmail({
    to,
    subject: `[Test] ${email.subject}`,
    html: email.html,
    text: email.text,
  });
  return "sent";
}

let running = false;

/** Sends the next batch of waiting deliveries. */
export async function runMailer(payload: Payload): Promise<number> {
  if (running || !mailServerReady()) return 0;
  running = true;
  let sent = 0;
  try {
    const due = await payload.find({
      collection: "mail-deliveries",
      where: { status: { equals: "queued" } },
      sort: "createdAt",
      limit: perMinute(),
      depth: 0,
      overrideAccess: true,
    });
    if (due.docs.length === 0) return 0;

    const dealers = new Map((await mailerDealers(payload)).map((dealer) => [dealer.id, dealer]));
    const mailings = new Map<number, Draft & { status?: string }>();
    const siteUrl = siteUrlOf(payload);
    const touched = new Set<number>();

    for (const row of due.docs as unknown as {
      id: number;
      mailing: number | { id: number };
      dealer?: number | { id: number } | null;
      to: string;
    }[]) {
      const mailingId = typeof row.mailing === "object" ? row.mailing.id : row.mailing;
      touched.add(mailingId);
      if (!mailings.has(mailingId)) {
        mailings.set(
          mailingId,
          (await payload.findByID({
            collection: "mailings",
            id: mailingId,
            depth: 0,
            overrideAccess: true,
          })) as unknown as Draft & { status?: string },
        );
      }
      const draft = mailings.get(mailingId);
      const dealerId = typeof row.dealer === "object" ? row.dealer?.id : row.dealer;
      const dealer = typeof dealerId === "number" ? dealers.get(dealerId) : undefined;

      const mark = (data: Record<string, unknown>) =>
        payload.db.updateOne({ collection: "mail-deliveries", id: row.id, data });

      if (!draft || draft.status === "cancelled") {
        await mark({ status: "skipped", error: "The mailing was stopped before this went." });
        continue;
      }
      // Checked again at the moment of sending: they may have opted out since it was queued.
      const reason = dealer ? leftOutBecause(dealer) : "That dealership is no longer on Rynet.";
      if (reason || !dealer) {
        await mark({ status: "skipped", error: reason });
        continue;
      }

      const email = renderFor(draft, dealer, siteUrl);
      try {
        await payload.sendEmail({
          to: row.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: {
            "List-Unsubscribe": `<${email.oneClick}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        await mark({ status: "sent", sentAt: new Date().toISOString(), error: null });
        sent += 1;
      } catch (error) {
        await mark({
          status: "failed",
          error:
            error instanceof Error ? error.message.slice(0, 300) : "The mail server refused it.",
        });
      }
    }

    for (const mailingId of touched) {
      const left = await payload.count({
        collection: "mail-deliveries",
        where: { and: [{ mailing: { equals: mailingId } }, { status: { equals: "queued" } }] },
        overrideAccess: true,
      });
      if (left.totalDocs === 0) {
        await payload.db.updateOne({
          collection: "mailings",
          id: mailingId,
          data: { status: "done" },
        });
      }
    }
  } catch (error) {
    payload.logger.error({ err: error, msg: "mailer run failed" });
  } finally {
    running = false;
  }
  return sent;
}

let timer: NodeJS.Timeout | null = null;

/** Every minute in the live app, never during a build. RYNET_MAILER=off stops it. */
export function startMailer(payload: Payload): void {
  if (timer) return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.RYNET_MAILER === "off") return;
  timer = setInterval(() => void runMailer(payload), 60_000);
  timer.unref?.();
}
