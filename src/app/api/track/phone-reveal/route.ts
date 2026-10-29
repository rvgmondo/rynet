import { NextResponse } from "next/server";

import { recordContactTap } from "@/lib/track/record";

/**
 * Records that someone revealed a dealership's phone number.
 *
 * A revealed number is a lead: it is the strongest intent signal on the site short of an
 * enquiry, and a dealership is entitled to the count. It stores no personal details, is rate
 * limited per hashed visitor, and always answers 204 (see recordContactTap).
 */
export async function POST(request: Request) {
  try {
    await recordContactTap(request, "phone_reveal", "Phone number revealed");
  } catch (error) {
    console.error("Phone reveal tracking failed:", error);
  }
  return new NextResponse(null, { status: 204 });
}
