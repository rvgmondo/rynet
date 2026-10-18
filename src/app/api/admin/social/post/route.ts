import { staffOnly } from "@/lib/onboarding/staff-request";
import { runSocialQueue } from "@/lib/social/publisher";
import { MAX_CAPTION, queueManualPost } from "@/lib/social/queue";

/**
 * Post it, from the admin's Ad studio, to Rynet's own Page and Instagram. The same checks as a
 * dealership's post: the picture is re-made before it is kept, and only Rynet's own connected
 * accounts can be named.
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const caption = String(form?.get("caption") ?? "").trim();
  const vehicleId = Number(form?.get("vehicleId"));
  const wanted = String(form?.get("accounts") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!(image instanceof Blob) || image.size === 0 || image.size > MAX_BYTES) {
    return Response.json({ error: "The picture did not arrive. Try again." }, { status: 400 });
  }
  if (!caption || caption.length > MAX_CAPTION) {
    return Response.json(
      { error: `Words between 1 and ${MAX_CAPTION} characters.` },
      { status: 400 },
    );
  }

  const accounts = await auth.payload.find({
    collection: "social-accounts",
    where: {
      and: [
        { id: { in: wanted } },
        { dealer: { exists: false } },
        { state: { equals: "connected" } },
      ],
    },
    depth: 0,
    limit: 10,
    overrideAccess: true,
  });
  if (accounts.docs.length === 0) {
    return Response.json(
      { error: "Connect Rynet's Facebook Page in Social first." },
      { status: 400 },
    );
  }

  try {
    await queueManualPost(auth.payload, {
      dealerId: null,
      userId: Number((auth.user as { id?: unknown }).id),
      accounts: accounts.docs as unknown as { id: number; network: "facebook" | "instagram" }[],
      image: Buffer.from(await image.arrayBuffer()),
      caption,
      vehicleId: Number.isInteger(vehicleId) && vehicleId > 0 ? vehicleId : null,
    });
  } catch {
    return Response.json({ error: "That picture could not be read. Try again." }, { status: 400 });
  }
  void runSocialQueue(auth.payload);
  return Response.json({ queued: accounts.docs.length });
}
