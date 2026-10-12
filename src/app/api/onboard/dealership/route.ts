import { type OnboardInput, onboardDealership, onboardProblems } from "@/lib/onboarding/onboard";
import { staffOnly } from "@/lib/onboarding/staff-request";
import { portalOf } from "@/lib/stock-import/probe";

/** Creates the dealership and its main branch, verified, from the onboarding form. */
export const dynamic = "force-dynamic";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input: OnboardInput = {
    tradingName: text(body.tradingName),
    legalName: text(body.legalName),
    contactName: text(body.contactName),
    email: text(body.email),
    phone: text(body.phone),
    whatsapp: text(body.whatsapp),
    websiteUrl: text(body.websiteUrl),
    registrationNumber: text(body.registrationNumber),
    addressLine1: text(body.addressLine1),
    suburb: text(body.suburb),
    cityId: Number(body.cityId) || 0,
    provinceId: Number(body.provinceId) || 0,
    confirmedHow: text(body.confirmedHow),
  };

  const problems = onboardProblems(input);
  const portal = input.websiteUrl ? portalOf(input.websiteUrl) : null;
  if (portal) {
    problems.push(
      `${portal} is a listings portal, not their website. Leave the website empty if they have none.`,
    );
  }
  if (problems.length > 0) return Response.json({ problems }, { status: 400 });

  try {
    const result = await onboardDealership(auth.payload, input, auth.user);

    // Onboarded from a sign-up: close it, with a note saying which dealership it became, so it
    // leaves the list on the desk and the enquiry keeps its own history.
    const signupId = Number(body.signupLeadId);
    if (Number.isInteger(signupId) && signupId > 0) {
      const lead = (await auth.payload
        .findByID({ collection: "leads", id: signupId, depth: 0, overrideAccess: true })
        .catch(() => null)) as { type?: string; notes?: Record<string, unknown>[] | null } | null;
      if (lead?.type !== "dealer_signup") return Response.json(result, { status: 201 });
      await auth.payload
        .update({
          collection: "leads",
          id: signupId,
          data: {
            status: "sold",
            // Appended, so whatever staff wrote while they were talking to the dealership stays.
            notes: [
              ...(lead.notes ?? []),
              {
                body: `Onboarded as ${input.tradingName.trim()} (/dealers/${result.slug}).`,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          overrideAccess: true,
        })
        .catch((error: unknown) =>
          auth.payload.logger.error({ err: error, msg: "could not close the dealer sign-up" }),
        );
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ problems: [(error as Error).message] }, { status: 400 });
  }
}
