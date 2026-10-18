import { portalApiSession } from "@/lib/portal/api-session";
import { runSocialQueue } from "@/lib/social/publisher";
import { MAX_CAPTION, queueManualPost } from "@/lib/social/queue";

/**
 * "Post it": an ad from the portal's Ad studio, to the dealership's own connected Page and
 * Instagram, now.
 *
 * The picture arrives as the JPEG the browser drew, and is re-made on the server before anything
 * keeps it (lib/social/media.ts). The accounts named must be this dealership's and connected; any
 * other id is simply not found. The post goes in the queue and the queue is started at once, so
 * the answer comes back straight away and the portal shows it as posting.
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const auth = await portalApiSession(request, { manager: true });
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const caption = String(form?.get("caption") ?? "").trim();
  const vehicleId = Number(form?.get("vehicleId"));
  const wanted = String(form?.get("accounts") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!(image instanceof Blob) || image.size === 0) {
    return Response.json({ error: "The picture did not arrive. Try again." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return Response.json({ error: "That picture is too big to post." }, { status: 400 });
  }
  if (!caption) return Response.json({ error: "Add some words to post with it." }, { status: 400 });
  if (caption.length > MAX_CAPTION) {
    return Response.json(
      { error: `Instagram takes up to ${MAX_CAPTION} characters. Make it shorter.` },
      { status: 400 },
    );
  }
  if (wanted.length === 0) {
    return Response.json({ error: "Choose where to post it." }, { status: 400 });
  }

  const accounts = await auth.payload.find({
    collection: "social-accounts",
    where: {
      and: [
        { id: { in: wanted } },
        { dealer: { equals: auth.dealerId } },
        { state: { equals: "connected" } },
      ],
    },
    depth: 0,
    limit: 10,
    overrideAccess: true,
  });
  if (accounts.docs.length === 0) {
    return Response.json({ error: "Connect your Facebook Page first." }, { status: 400 });
  }

  // Only one of this dealership's own cars can be named on the post.
  let vehicle: number | null = null;
  if (Number.isInteger(vehicleId) && vehicleId > 0) {
    const own = await auth.payload.count({
      collection: "vehicles",
      where: { and: [{ id: { equals: vehicleId } }, { dealer: { equals: auth.dealerId } }] },
      overrideAccess: true,
    });
    vehicle = own.totalDocs > 0 ? vehicleId : null;
  }

  let ids: number[];
  try {
    ids = await queueManualPost(auth.payload, {
      dealerId: auth.dealerId,
      userId: Number(auth.user.id),
      accounts: accounts.docs as unknown as {
        id: number;
        network: "facebook" | "instagram";
      }[],
      image: Buffer.from(await image.arrayBuffer()),
      caption,
      vehicleId: vehicle,
    });
  } catch {
    return Response.json({ error: "That picture could not be read. Try again." }, { status: 400 });
  }

  void runSocialQueue(auth.payload);
  return Response.json({ queued: ids.length });
}
