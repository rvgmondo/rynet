import type { Payload } from "payload";
import { type Draft, type MailerDealer, mailerDealers } from "@/lib/mail/mailer";
import { unknownFields } from "@/lib/mail/merge";

/**
 * What the Mailer's routes read from a request: the words, checked. A subject and words are
 * required, every {{field}} must be one Rynet can fill, and a button needs both its words and an
 * address. Problems come back as sentences for the screen.
 */
export function readDraft(body: Record<string, unknown>): { draft: Draft; problems: string[] } {
  const draft: Draft = {
    subject: String(body.subject ?? "").trim(),
    body: String(body.body ?? "").trim(),
    buttonLabel: String(body.buttonLabel ?? "").trim() || null,
    buttonUrl: String(body.buttonUrl ?? "").trim() || null,
  };
  const problems: string[] = [];
  if (!draft.subject) problems.push("Write a subject.");
  if (!draft.body) problems.push("Write the email.");
  if (draft.subject.length > 150) problems.push("Keep the subject under 150 characters.");
  const unknown = unknownFields(draft.subject, draft.body, draft.buttonUrl ?? "");
  if (unknown.length > 0) {
    problems.push(
      `Rynet cannot fill ${unknown.map((name) => `{{${name}}}`).join(", ")}. Use one of the fields listed.`,
    );
  }
  if (Boolean(draft.buttonLabel) !== Boolean(draft.buttonUrl)) {
    problems.push("A button needs both its words and where it goes.");
  }
  if (draft.buttonUrl && !/^(https?:\/\/|\{\{\s*[a-zA-Z]+Url\s*\}\})/.test(draft.buttonUrl)) {
    problems.push(
      "The button must go to an address starting with https://, or a field like {{portalUrl}}.",
    );
  }
  return { draft, problems };
}

/** The dealership to preview or test with, or a stand-in when none is on Rynet yet. */
export async function sampleDealer(payload: Payload, dealerId: unknown): Promise<MailerDealer> {
  const all = await mailerDealers(payload);
  const chosen = all.find((dealer) => dealer.id === Number(dealerId)) ?? all[0];
  return (
    chosen ?? {
      id: 0,
      tradingName: "Example Motors",
      slug: "example-motors",
      email: null,
      contactName: "Sam Example",
      liveCars: 24,
      newEnquiries: 3,
      hasLogin: false,
      readsWebsite: false,
      socialConnected: false,
      optedOut: false,
      verified: true,
    }
  );
}
