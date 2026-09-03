import config from "@payload-config";
import { type NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import { rateLimit, visitorKey } from "@/lib/rate-limit";

/**
 * Records that someone revealed a dealership's phone number.
 *
 * A revealed number is a lead: it is the strongest intent signal on the site short of an
 * enquiry, and a dealership paying for placement is entitled to the count.
 *
 * Three things make this safe to expose publicly:
 *
 * - It writes a `phone_reveal` lead with no personal details, because there are none to
 *   collect. No name, no email, no consent record needed, because nothing identifying is
 *   stored.
 * - It is rate limited per hashed visitor, so it cannot be used to inflate a competitor's
 *   numbers or to hammer the database.
 * - It always returns 204, whatever happened. The caller fires and forgets, and a failed
 *   count must never surface to a buyer who just wanted a phone number.
 */
export async function POST(request: NextRequest) {
  try {
    const key = await visitorKey(request.headers, process.env.PAYLOAD_SECRET ?? "rynet");
    if (!rateLimit(`reveal:${key}`, 30, 10 * 60 * 1000).allowed) {
      return new NextResponse(null, { status: 204 });
    }

    const body = (await request.json()) as { vehicleRef?: unknown };
    const ref = typeof body.vehicleRef === "string" ? body.vehicleRef.slice(0, 20) : null;
    if (!ref) return new NextResponse(null, { status: 204 });

    const payload = await getPayload({ config });
    const found = await payload.find({
      collection: "vehicles",
      where: { publicRef: { equals: ref } },
      limit: 1,
      depth: 0,
    });
    const vehicle = found.docs[0];
    if (!vehicle) return new NextResponse(null, { status: 204 });

    await payload.create({
      collection: "leads",
      data: {
        type: "phone_reveal",
        vehicle: vehicle.id,
        dealer: typeof vehicle.dealer === "number" ? vehicle.dealer : vehicle.dealer?.id,
        branch: typeof vehicle.branch === "number" ? vehicle.branch : vehicle.branch?.id,
        // The lead schema needs a name. There is no person attached to a reveal, and
        // inventing one would put a fake contact in a dealership's inbox.
        name: "Phone number revealed",
        status: "new",
      },
    });
  } catch (error) {
    console.error("Phone reveal tracking failed:", error);
  }

  return new NextResponse(null, { status: 204 });
}
