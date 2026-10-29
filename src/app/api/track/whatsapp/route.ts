import { NextResponse } from "next/server";

import { recordContactTap } from "@/lib/track/record";

/**
 * Records that someone tapped WhatsApp on a car. The conversation itself happens in WhatsApp and
 * Rynet never sees it; the tap is the part a dealership's monthly report can count. Same rules as
 * a revealed phone number: no personal details, rate limited, always 204.
 */
export async function POST(request: Request) {
  try {
    await recordContactTap(request, "whatsapp_click", "Tapped WhatsApp");
  } catch (error) {
    console.error("WhatsApp tap tracking failed:", error);
  }
  return new NextResponse(null, { status: 204 });
}
