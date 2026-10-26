/**
 * A push to Ruben's phone through ntfy, for the moments worth acting on straight away: a dealer
 * opening their mockup, and a new lead from the website.
 *
 * The topic is the only credential (anyone who knows it can read the pushes), so it lives in the
 * server's environment as NTFY_TOPIC and never in git. With no topic set (a laptop, CI, the test
 * suite) this does nothing at all.
 *
 * Fire and forget: never awaited by a page, never throws, and gives up after three seconds, so a
 * slow or failing ntfy can never hold up a dealer opening a mockup or a buyer pressing Send.
 */

export type Push = {
  title: string;
  message: string;
  /** Opened when the notification is tapped. */
  click?: string;
  tags?: string;
};

/**
 * The options go in the query string rather than headers: headers must be plain bytes, and a
 * dealership called "Café Motors" should arrive as written. ntfy reads the body as UTF-8.
 */
export function pushUrl(topic: string, push: Push): string {
  const query = new URLSearchParams({ title: push.title, priority: "high" });
  if (push.click) query.set("click", push.click);
  if (push.tags) query.set("tags", push.tags);
  return `https://ntfy.sh/${encodeURIComponent(topic)}?${query}`;
}

export function sendPush(push: Push): void {
  const topic = process.env.NTFY_TOPIC?.trim();
  if (!topic) return;
  void fetch(pushUrl(topic, push), {
    method: "POST",
    body: push.message,
    signal: AbortSignal.timeout(3000),
  }).catch(() => undefined);
}

const HOUR = 60 * 60 * 1000;

/**
 * Whether a preview open deserves a push: the first open always, after that at most one an hour,
 * so a dealer refreshing the page does not ring the phone each time.
 */
export function shouldPushOpen(
  lastViewedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastViewedAt) return true;
  const last = Date.parse(lastViewedAt);
  return !Number.isFinite(last) || now.getTime() - last >= HOUR;
}

export function openPush(input: { dealership: string; count: number; adminUrl: string }): Push {
  const repeat = input.count > 1 ? ` (opened ${input.count} times)` : "";
  return {
    title: `Rynet mockup opened: ${input.dealership}`,
    message: `${input.dealership} just opened their mockup${repeat}.`,
    click: input.adminUrl,
    tags: "eyes",
  };
}

const LEAD_WHAT: Record<string, string> = {
  enquiry: "a question about a car",
  test_drive: "a test drive request",
  finance: "a finance enquiry",
  callback: "a call back request",
  dealer_contact: "a message for a dealership",
  trade_in: "someone wants to sell their car",
  agency_enquiry: "a Rynet Digital enquiry",
  dealer_signup: "a dealership wants to list",
  mockup_request: "a free mockup request",
};

/** A push for a new website lead, or null for the silent kinds (a tap on WhatsApp, a phone reveal). */
export function leadPush(input: {
  type: string;
  name?: string | null;
  about?: string | null;
  adminUrl: string;
}): Push | null {
  const what = LEAD_WHAT[input.type];
  if (!what) return null;
  const who = input.name?.trim() ? ` from ${input.name.trim()}` : "";
  const about = input.about?.trim() ? `: ${input.about.trim()}` : "";
  return {
    title: `Rynet lead: ${what}`,
    message: `New on the website, ${what}${who}${about}.`,
    click: input.adminUrl,
    tags: "bell",
  };
}
