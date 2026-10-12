import { templateCsv } from "@/lib/stock-import/spreadsheet";

/**
 * The stock sheet template a dealership fills in. Public on purpose: it is sent to dealerships
 * by WhatsApp, and it holds nothing but headings and one invented example row.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(`﻿${templateCsv()}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="rynet-stock-template.csv"',
    },
  });
}
