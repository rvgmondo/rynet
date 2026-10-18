"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { canManageDealer } from "@/access/roles";
import { nextCarState, type PortalCarAction } from "@/lib/portal/cars";
import { passwordProblem } from "@/lib/portal/password";
import { requirePortalSession } from "@/lib/portal/session";

/**
 * Everything a dealership does in the portal.
 *
 * Every write goes through Payload as the signed-in user with `overrideAccess: false`, so the
 * collections' own rules decide it: a car or an enquiry that is not this dealership's is not
 * found, and a field this role may not change is not changed. The ids that arrive here are only
 * ever a question ("this one?"); the answer comes from those rules.
 */

export type FormState = { ok?: boolean; problem?: string; message?: string };

const idFrom = (value: FormDataEntryValue | null): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/* ------------------------------------------------------------------ choosing a password */

/**
 * Redeems an invite link. Payload's own resetPassword checks the token and its date, sets the
 * password, and runs the same sign-in hooks as a normal sign-in (a suspended account is refused,
 * and so is one with two-factor that has not given a code, which sends that person to sign in
 * properly instead). The session it returns is set as the usual cookie, so choosing a password
 * leaves you signed in.
 */
export async function choosePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const again = String(formData.get("again") ?? "");

  const problem = passwordProblem(password, again);
  if (problem) return { problem };
  if (!/^[a-f0-9]{40}$/.test(token)) {
    return { problem: "This link is not complete. Open it again from the message we sent." };
  }

  const payload = await getPayload({ config });
  let result: { token?: string; user?: { id: number | string } };
  try {
    result = (await payload.resetPassword({
      collection: "users",
      data: { token, password },
      overrideAccess: true,
    })) as typeof result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/two-factor/i.test(message)) redirect("/portal/sign-in?reason=password-set");
    return {
      problem: /suspended/i.test(message)
        ? message
        : "This link has ended or has been used. Ask Rynet for a fresh one.",
    };
  }

  if (result.user) {
    // Choosing a password is what makes an invited account a working one.
    await payload.db
      .updateOne({ collection: "users", id: result.user.id, data: { status: "active" } })
      .catch(() => undefined);
  }

  if (!result.token) redirect("/portal/sign-in?reason=password-set");

  const auth = payload.collections.users.config.auth;
  (await cookies()).set({
    name: `${payload.config.cookiePrefix}-token`,
    value: result.token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: auth.cookies?.secure === true,
    expires: new Date(Date.now() + auth.tokenExpiration * 1000),
  });
  redirect("/portal");
}

/* ------------------------------------------------------------------ cars */

/** Sold, reserved or back on sale. Which moves are offered is decided in lib/portal/cars.ts. */
export async function changeCarState(formData: FormData): Promise<void> {
  const { payload, user } = await requirePortalSession();
  const id = idFrom(formData.get("id"));
  const action = String(formData.get("action") ?? "") as PortalCarAction;
  if (!id) return;

  const car = (await payload
    .findByID({ collection: "vehicles", id, depth: 0, user, overrideAccess: false })
    .catch(() => null)) as { status?: string } | null;
  if (!car?.status) return;

  const next = nextCarState(car.status, action);
  if (!next) return;

  await payload.update({
    collection: "vehicles",
    id,
    data: { status: next, ...(next === "live" ? { soldAt: null } : {}) },
    user,
    overrideAccess: false,
  });
  revalidatePath("/portal", "layout");
}

export async function changeCarPrice(_state: FormState, formData: FormData): Promise<FormState> {
  const { payload, user } = await requirePortalSession();
  const id = idFrom(formData.get("id"));
  const price = Number(String(formData.get("price") ?? "").replace(/[\sR,]/g, ""));
  if (!id) return { problem: "Which car?" };
  if (!Number.isInteger(price) || price < 1000 || price > 50_000_000) {
    return { problem: "Whole rands, for example 249900." };
  }
  try {
    await payload.update({
      collection: "vehicles",
      id,
      data: { price },
      user,
      overrideAccess: false,
    });
  } catch {
    return { problem: "That did not save. Try again." };
  }
  revalidatePath("/portal", "layout");
  return { ok: true, message: "Saved" };
}

/* ------------------------------------------------------------------ enquiries */

const LEAD_STATES = ["new", "contacted", "qualified", "appointment_set", "sold", "lost"] as const;
type LeadState = (typeof LEAD_STATES)[number];
const isLeadState = (value: string): value is LeadState =>
  (LEAD_STATES as readonly string[]).includes(value);

export async function changeEnquiryState(formData: FormData): Promise<void> {
  const { payload, user } = await requirePortalSession();
  const id = idFrom(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!id || !isLeadState(status)) return;
  await payload
    .update({ collection: "leads", id, data: { status }, user, overrideAccess: false })
    .catch(() => undefined);
  revalidatePath("/portal", "layout");
}

/* ------------------------------------------------------------------ your details */

export async function saveDetails(_state: FormState, formData: FormData): Promise<FormState> {
  const { payload, user, dealerId } = await requirePortalSession();
  if (!canManageDealer(user)) {
    return { problem: "Only the dealer principal or a manager can change these." };
  }

  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const email = text("principalEmail");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { problem: "That email address does not look right." };
  }

  try {
    await payload.update({
      collection: "dealers",
      id: dealerId,
      data: {
        whatsappNumber: text("whatsappNumber"),
        principal: {
          name: text("principalName"),
          email,
          phone: text("principalPhone"),
        },
      },
      user,
      overrideAccess: false,
    });
  } catch {
    return { problem: "That did not save. Try again." };
  }
  revalidatePath("/portal", "layout");
  return { ok: true, message: "Saved. Your showroom shows the new details now." };
}
