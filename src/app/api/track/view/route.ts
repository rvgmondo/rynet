import { NextResponse } from "next/server";

import { recordView } from "@/lib/track/record";

/** One person opening one car, for the dealership's monthly report (see recordView). Always 204. */
export async function POST(request: Request) {
  try {
    await recordView(request);
  } catch (error) {
    console.error("Car view tracking failed:", error);
  }
  return new NextResponse(null, { status: 204 });
}
