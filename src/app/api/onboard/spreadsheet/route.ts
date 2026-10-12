import { dealerIdFrom, staffOnly } from "@/lib/onboarding/staff-request";
import { loadSpreadsheet } from "@/lib/onboarding/stock";

/** Reads an uploaded CSV and loads its cars in the background. */
export const dynamic = "force-dynamic";

/** A stock sheet of a few hundred cars is well under a megabyte. */
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  const dealerId = dealerIdFrom(form?.get("dealerId"));
  const file = form?.get("file");
  if (!dealerId || !(file instanceof File)) {
    return Response.json(
      { started: false, message: "Choose a dealership and a CSV file." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { started: false, message: "That file is too large for a stock sheet." },
      { status: 400 },
    );
  }
  if (/\.xlsx?$/i.test(file.name)) {
    return Response.json(
      {
        started: false,
        message:
          "That is an Excel file. In Excel choose File, Save as, CSV (comma delimited), and upload that.",
      },
      { status: 400 },
    );
  }

  const csv = await file.text();
  const wholeStock = form?.get("wholeStock") === "true";
  return Response.json(await loadSpreadsheet(auth.payload, dealerId, csv, wholeStock));
}
