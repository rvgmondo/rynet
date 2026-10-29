import { timingSafeEqual } from "node:crypto";

import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { formatReport } from "@/lib/report/dealer-month";
import { monthStats } from "@/lib/report/dealer-month-data";

/** The scheduled monthly run sends this header instead of signing in. Unset means sign-in only. */
function hasReportKey(request: Request): boolean {
  const expected = process.env.REPORT_KEY?.trim();
  const given = request.headers.get("x-report-key")?.trim();
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * One dealership's monthly report, as numbers and as the draft email. Rynet staff only, or the
 * monthly run with REPORT_KEY. It sends nothing: the email goes out through the usual queue, after
 * a person has read it.
 *
 *   GET /api/admin/dealer-report?dealer=13&month=2026-10[&improved=line|line][&work=line|line]
 */
export async function GET(request: Request) {
  const payload = await getPayload({ config });
  if (!hasReportKey(request)) {
    const { user } = await payload.auth({ headers: request.headers }).catch(() => ({ user: null }));
    if (!isPlatformStaff(user)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dealer = Number(url.searchParams.get("dealer"));
  const month = url.searchParams.get("month") ?? "";
  if (!Number.isInteger(dealer) || dealer < 1 || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Give dealer=<id> and month=yyyy-mm" }, { status: 400 });
  }
  const lines = (name: string) =>
    (url.searchParams.get(name) ?? "")
      .split("|")
      .map((line) => line.trim())
      .filter(Boolean);

  try {
    const stats = await monthStats(payload, dealer, month);
    const email = formatReport(stats, lines("improved"), lines("work"));
    return NextResponse.json({ stats, ...email }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No such dealership" }, { status: 404 });
  }
}
