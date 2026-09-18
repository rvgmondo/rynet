import { describe, expect, it } from "vitest";

import { carVisibility } from "./admin-car-state";

const NOW = new Date("2026-09-16T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("carVisibility", () => {
  it("calls a live car live", () => {
    expect(carVisibility("live", null, NOW)).toEqual({
      onSite: true,
      label: "Live on the site",
      tone: "success",
    });
  });

  it("shows a sold car for 90 days, then not", () => {
    expect(carVisibility("sold", daysAgo(10), NOW).onSite).toBe(true);
    expect(carVisibility("sold", daysAgo(89), NOW).onSite).toBe(true);
    expect(carVisibility("sold", daysAgo(91), NOW)).toEqual({
      onSite: false,
      label: "Sold, no longer shown",
      tone: "neutral",
    });
    expect(carVisibility("sold", null, NOW).onSite).toBe(false);
  });

  it("says why every other car is hidden", () => {
    expect(carVisibility("draft", null, NOW).label).toBe("Hidden from the site");
    expect(carVisibility("reserved", null, NOW)).toEqual({
      onSite: false,
      label: "Hidden from the site: Reserved",
      tone: "warning",
    });
    expect(carVisibility("pending_review", null, NOW).label).toBe(
      "Hidden from the site: Waiting for Rynet to check",
    );
    expect(carVisibility("archived", null, NOW).onSite).toBe(false);
    expect(carVisibility(undefined, null, NOW).label).toBe("Hidden from the site");
  });
});
