"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { choosePage } from "@/lib/social/accounts";

/**
 * Admin > Social: Rynet's own Facebook Page and Instagram. Staff only, checked here because the
 * rows carry a token and are written with access switched off, and only ever Rynet's own rows
 * (those with no dealership).
 */
async function staff() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!isPlatformStaff(user)) redirect("/admin/login?redirect=%2Fadmin%2Fsocial");
  return { payload, userId: Number(user?.id) };
}

export async function chooseRynetPage(formData: FormData): Promise<void> {
  const { payload, userId } = await staff();
  const ok = await choosePage(payload, null, userId, String(formData.get("pageId") ?? ""));
  redirect(ok ? "/admin/social?connected=1" : "/admin/social?problem=expired");
}

export async function setRynetAutoPost(formData: FormData): Promise<void> {
  const { payload } = await staff();
  const id = Number(formData.get("id"));
  const on = formData.get("on") === "1";
  const own = await payload.count({
    collection: "social-accounts",
    where: { and: [{ id: { equals: id } }, { dealer: { exists: false } }] },
    overrideAccess: true,
  });
  if (own.totalDocs === 0) return;
  await payload.update({
    collection: "social-accounts",
    id,
    data: on ? { autoPost: true, connectedAt: new Date().toISOString() } : { autoPost: false },
    overrideAccess: true,
  });
  revalidatePath("/admin/social");
}

export async function disconnectRynet(): Promise<void> {
  const { payload } = await staff();
  await payload.db.deleteMany({
    collection: "social-accounts",
    where: { dealer: { exists: false } },
  });
  await payload.db.updateMany({
    collection: "social-posts",
    where: { and: [{ dealer: { exists: false } }, { status: { equals: "queued" } }] },
    data: { status: "failed", error: "Rynet's Page was disconnected before this went out." },
  });
  redirect("/admin/social?disconnected=1");
}
