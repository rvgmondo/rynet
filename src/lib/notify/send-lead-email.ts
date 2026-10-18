import type { Payload } from "payload";

import { relName, relSlug } from "@/lib/relations";
import { vehicleUrl } from "@/lib/urls";

import { type DealerForEmail, leadEmail, recipientFor } from "./lead-email";

/**
 * Emails a new enquiry to whoever should have it (see lead-email.ts for the rule).
 *
 * Called from the Leads collection once a lead has been saved, never before, so a mail server
 * fault cannot lose a lead. It never throws, and it does nothing at all until SMTP_HOST is set,
 * so a machine with no mail server (a laptop, the test suite) neither sends nor logs a fake send.
 */

const idOf = (value: unknown): number | null =>
  typeof value === "number"
    ? value
    : value && typeof value === "object" && typeof (value as { id?: unknown }).id === "number"
      ? (value as { id: number }).id
      : null;

export async function sendLeadEmail(
  payload: Payload,
  lead: Record<string, unknown>,
): Promise<void> {
  if (!process.env.SMTP_HOST) return;
  if (lead.isDemonstration) return;

  try {
    const siteUrl = (payload.config.serverURL || "https://rynet.co.za").replace(/\/$/, "");
    const dealerId = idOf(lead.dealer);
    const branchId = idOf(lead.branch);
    const vehicleId = idOf(lead.vehicle);

    const [dealerDoc, branchDoc, vehicleDoc] = await Promise.all([
      dealerId
        ? payload.findByID({ collection: "dealers", id: dealerId, depth: 0, overrideAccess: true })
        : null,
      branchId
        ? payload.findByID({ collection: "branches", id: branchId, depth: 0, overrideAccess: true })
        : null,
      vehicleId
        ? payload.findByID({
            collection: "vehicles",
            id: vehicleId,
            depth: 1,
            overrideAccess: true,
          })
        : null,
    ]);

    const dealer: DealerForEmail = dealerDoc
      ? {
          tradingName: dealerDoc.tradingName,
          isDemonstration: dealerDoc.isDemonstration,
          principalEmail: (dealerDoc.principal as { email?: string | null } | null)?.email ?? null,
          routing: ((dealerDoc.emailRouting ?? []) as Record<string, unknown>[]).map((rule) => ({
            leadType: (rule.leadType as string | null) ?? null,
            toAddress: (rule.toAddress as string | null) ?? null,
            branch: idOf(rule.branch),
          })),
        }
      : null;

    const forEmail = {
      id: lead.id as number,
      type: String(lead.type ?? ""),
      name: String(lead.name ?? ""),
      phone: (lead.phone as string | null) ?? null,
      email: (lead.email as string | null) ?? null,
      message: (lead.message as string | null) ?? null,
    };

    const recipient = recipientFor(
      forEmail,
      dealer,
      branchDoc ? { id: branchDoc.id as number, email: branchDoc.email ?? null } : null,
    );
    if (!recipient) return;

    const carUrl = vehicleDoc
      ? `${siteUrl}${vehicleUrl({
          makeSlug: relSlug(vehicleDoc.make),
          modelSlug: relSlug(vehicleDoc.model),
          modelYear: vehicleDoc.modelYear ?? 0,
          variantName: relName(vehicleDoc.variant),
          publicRef: vehicleDoc.publicRef ?? "",
        })}`
      : null;

    const hasLogin =
      dealerId !== null &&
      recipient.audience === "dealer" &&
      (
        await payload.count({
          collection: "users",
          where: { and: [{ dealer: { equals: dealerId } }, { status: { equals: "active" } }] },
          overrideAccess: true,
        })
      ).totalDocs > 0;

    const email = leadEmail(forEmail, recipient, {
      dealerName: dealer?.tradingName ?? null,
      carTitle: vehicleDoc?.title ?? null,
      carUrl,
      adminUrl: `${siteUrl}${payload.config.routes.admin}/collections/leads/${forEmail.id}`,
      // Only for a dealership somebody can sign in to. Otherwise the button would open a sign-in
      // page nobody at that dealership has a password for.
      portalUrl: hasLogin ? `${siteUrl}/portal/enquiries` : null,
    });

    await payload.sendEmail({
      to: recipient.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    });
  } catch (error) {
    payload.logger.error({ err: error, msg: `could not email lead ${String(lead.id)}` });
  }
}
